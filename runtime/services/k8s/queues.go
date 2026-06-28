package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	"github.com/juancavallotti/octo/core"
	"github.com/juancavallotti/octo/types"
	"github.com/nats-io/nats.go"
)

// NATS header keys carrying message metadata alongside the JSON-encoded body. Vars
// are prefixed and JSON-encoded per value so their original type (string, number,
// bool, object) survives the round-trip; the ids travel under reserved keys. NATS
// headers preserve key case, so var names are not mangled.
const (
	headerVarPrefix     = "Octo-Var-"
	headerEventID       = "Octo-Event-Id"
	headerCorrelationID = "Octo-Correlation-Id"
)

// natsQueues is the NATS-backed Queues implementation for the k8s module. Subjects
// are prefixed with the deployment id so deployments sharing one broker never
// collide, and the scoped subject doubles as the queue-group name so every replica
// of a deployment competes for the same messages (point-to-point). Request-reply
// uses NATS's native request/reply; the reply is sent only when the inbound message
// carries a reply subject.
type natsQueues struct {
	conn         *nats.Conn
	deploymentID string
}

func newNATSQueues(conn *nats.Conn, deploymentID string) *natsQueues {
	return &natsQueues{conn: conn, deploymentID: deploymentID}
}

// subject scopes a user subject to this deployment, e.g. octo.<id>.q.<subject>.
func (q *natsQueues) subject(subject string) string {
	return fmt.Sprintf("octo.%s.q.%s", q.deploymentID, subject)
}

// Publish sends msg to one competing consumer with no reply.
func (q *natsQueues) Publish(_ context.Context, subject string, msg types.Message) error {
	m, err := encodeMsg(q.subject(subject), msg)
	if err != nil {
		return err
	}
	if err := q.conn.PublishMsg(m); err != nil {
		return fmt.Errorf("queues: publish %q: %w", subject, err)
	}
	return nil
}

// Request sends msg and waits for one reply, bounded by ctx and the configured
// timeout (NATS sets the reply subject, so the responder knows to reply).
func (q *natsQueues) Request(
	ctx context.Context, subject string, msg types.Message, opts ...core.RequestOption,
) (types.Message, error) {
	cfg := core.NewRequestConfig(opts...)
	ctx, cancel := context.WithTimeout(ctx, cfg.Timeout)
	defer cancel()

	m, err := encodeMsg(q.subject(subject), msg)
	if err != nil {
		return types.Message{}, err
	}
	reply, err := q.conn.RequestMsgWithContext(ctx, m)
	if err != nil {
		return types.Message{}, fmt.Errorf("queues: request %q: %w", subject, err)
	}
	return decodeMsg(reply)
}

// Subscribe joins the deployment's queue group for subject and runs handler on
// cfg.Listeners concurrent workers fed by the subscription callback. A reply is
// sent only when the delivered message carries a reply subject.
//
//nolint:ireturn // satisfies core.Queues
func (q *natsQueues) Subscribe(
	ctx context.Context, subject string, handler core.QueueHandler, opts ...core.SubscribeOption,
) (core.Subscription, error) {
	cfg := core.NewSubscribeConfig(opts...)
	scoped := q.subject(subject)
	subCtx, cancel := context.WithCancel(ctx)

	// The callback only enqueues, so a slow handler never stalls NATS delivery; the
	// worker pool bounds concurrency. A cancelled subscription unblocks both ends.
	work := make(chan *nats.Msg, cfg.Listeners)
	var wg sync.WaitGroup
	wg.Add(cfg.Listeners)
	for i := 0; i < cfg.Listeners; i++ {
		go func() {
			defer wg.Done()
			for {
				select {
				case <-subCtx.Done():
					return
				case m := <-work:
					q.dispatch(subCtx, m, handler)
				}
			}
		}()
	}

	sub, err := q.conn.QueueSubscribe(scoped, scoped, func(m *nats.Msg) {
		select {
		case work <- m:
		case <-subCtx.Done():
		}
	})
	if err != nil {
		cancel()
		wg.Wait()
		return nil, fmt.Errorf("queues: subscribe %q: %w", subject, err)
	}
	return &natsSubscription{sub: sub, cancel: cancel, wg: &wg}, nil
}

// dispatch decodes a delivered message, runs the handler, and replies when the
// sender requested one. A decode or handler error on a fire-and-forget message is
// logged and dropped (at-most-once); on a request the requester simply times out.
func (q *natsQueues) dispatch(ctx context.Context, m *nats.Msg, handler core.QueueHandler) {
	in, err := decodeMsg(m)
	if err != nil {
		slog.Error("queues: decode delivered message", "subject", m.Subject, "err", err)
		return
	}
	reply, err := handler(ctx, in)
	if err != nil {
		slog.Error("queues: handler", "subject", m.Subject, "err", err)
		return
	}
	if m.Reply == "" {
		return
	}
	out, err := encodeMsg(m.Reply, reply)
	if err != nil {
		slog.Error("queues: encode reply", "subject", m.Subject, "err", err)
		return
	}
	if err := m.RespondMsg(out); err != nil {
		slog.Error("queues: respond", "subject", m.Subject, "err", err)
	}
}

// natsSubscription stops delivery and drains its workers on Close, so afterwards no
// handler is still running.
type natsSubscription struct {
	sub    *nats.Subscription
	cancel context.CancelFunc
	wg     *sync.WaitGroup
	once   sync.Once
}

func (s *natsSubscription) Close() error {
	var unsubErr error
	s.once.Do(func() {
		unsubErr = s.sub.Unsubscribe()
		s.cancel()
		s.wg.Wait()
	})
	if unsubErr != nil {
		return fmt.Errorf("queues: unsubscribe: %w", unsubErr)
	}
	return nil
}

// encodeMsg builds a NATS message for subject: the body as a JSON payload, vars as
// JSON-valued Octo-Var-* headers, and the ids under their reserved headers.
func encodeMsg(subject string, msg types.Message) (*nats.Msg, error) {
	data, err := json.Marshal(msg.Body)
	if err != nil {
		return nil, fmt.Errorf("queues: encode body: %w", err)
	}
	header := nats.Header{}
	if msg.EventID != "" {
		header.Set(headerEventID, msg.EventID)
	}
	if msg.CorrelationID != "" {
		header.Set(headerCorrelationID, msg.CorrelationID)
	}
	for name, value := range msg.Variables {
		encoded, err := json.Marshal(value)
		if err != nil {
			return nil, fmt.Errorf("queues: encode var %q: %w", name, err)
		}
		header.Set(headerVarPrefix+name, string(encoded))
	}
	return &nats.Msg{Subject: subject, Data: data, Header: header}, nil
}

// decodeMsg rebuilds a types.Message from a NATS message: the JSON payload into
// Body, the Octo-Var-* headers into Variables, and the reserved ids. Non-Octo
// headers (e.g. NATS internals) are ignored.
func decodeMsg(m *nats.Msg) (types.Message, error) {
	out := types.Message{
		EventID:       m.Header.Get(headerEventID),
		CorrelationID: m.Header.Get(headerCorrelationID),
	}
	if len(m.Data) > 0 {
		var body any
		if err := json.Unmarshal(m.Data, &body); err != nil {
			return types.Message{}, fmt.Errorf("queues: decode body: %w", err)
		}
		out.Body = body
	}
	for key, values := range m.Header {
		if !strings.HasPrefix(key, headerVarPrefix) || len(values) == 0 {
			continue
		}
		name := strings.TrimPrefix(key, headerVarPrefix)
		var value any
		if err := json.Unmarshal([]byte(values[0]), &value); err != nil {
			return types.Message{}, fmt.Errorf("queues: decode var %q: %w", name, err)
		}
		out.Variables.Set(name, value)
	}
	return out, nil
}
