// Package bus publishes orchestrator events to NATS for cross-node fan-out: the
// platform BFF subscribes and relays them to browsers as SSE. It is intentionally
// tiny — a Publisher interface with a NATS-backed implementation and a noop used
// when NATS_URL is unset — so the orchestrator still runs standalone (local
// `go run`, or a single-node deploy without a broker) with the feature inert.
package bus

import (
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go"
)

// Publisher fans a message out to subscribers on a subject. Publishing is
// fire-and-forget: an error is logged, not returned, so a broker hiccup never
// blocks the caller (the deployment informer callback) or fails a write.
type Publisher interface {
	Publish(subject string, data []byte)
	Close()
}

type natsPublisher struct{ conn *nats.Conn }

func (p natsPublisher) Publish(subject string, data []byte) {
	if err := p.conn.Publish(subject, data); err != nil {
		slog.Error("bus publish", "subject", subject, "error", err)
	}
}

func (p natsPublisher) Close() { p.conn.Close() }

type noopPublisher struct{}

func (noopPublisher) Publish(string, []byte) {}
func (noopPublisher) Close()                 {}

// NewPublisher connects to NATS at natsURL and returns a Publisher. An empty
// natsURL yields a noop Publisher (standalone mode, no broker) rather than an
// error, so callers can wire it unconditionally.
func NewPublisher(natsURL string) (Publisher, error) {
	if natsURL == "" {
		return noopPublisher{}, nil
	}
	conn, err := nats.Connect(natsURL, nats.Name("octo-orchestrator"))
	if err != nil {
		return nil, fmt.Errorf("bus: connect nats %q: %w", natsURL, err)
	}
	return natsPublisher{conn: conn}, nil
}
