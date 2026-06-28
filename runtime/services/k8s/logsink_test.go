package k8s

import (
	"encoding/json"
	"log/slog"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
)

// TestLogSinkPublishesRecords verifies the sink ships each record to LogSubject as
// a JSON line carrying the deployment id, level, message and attrs.
func TestLogSinkPublishesRecords(t *testing.T) {
	url := runServer(t)
	pub := connect(t, url)
	sub := connect(t, url)

	msgs := make(chan *nats.Msg, 1)
	if _, err := sub.ChanSubscribe(LogSubject, msgs); err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	if err := sub.Flush(); err != nil {
		t.Fatalf("flush: %v", err)
	}

	logger := slog.New(newLogSink(pub, "dep-123", "checkout", "v2"))
	logger.Error("boom", "code", 42)

	select {
	case m := <-msgs:
		var rec map[string]any
		if err := json.Unmarshal(m.Data, &rec); err != nil {
			t.Fatalf("unmarshal %q: %v", m.Data, err)
		}
		if rec["deploymentId"] != "dep-123" {
			t.Errorf("deploymentId = %v, want dep-123", rec["deploymentId"])
		}
		if rec["appName"] != "checkout" {
			t.Errorf("appName = %v, want checkout", rec["appName"])
		}
		if rec["appVersion"] != "v2" {
			t.Errorf("appVersion = %v, want v2", rec["appVersion"])
		}
		if rec["msg"] != "boom" {
			t.Errorf("msg = %v, want boom", rec["msg"])
		}
		if rec["level"] != "ERROR" {
			t.Errorf("level = %v, want ERROR", rec["level"])
		}
		if rec["code"] != float64(42) {
			t.Errorf("code = %v, want 42", rec["code"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for shipped log record")
	}
}

// TestLogSinkShipsDebug confirms the sink captures debug records (full fidelity),
// independent of any console handler's threshold.
func TestLogSinkShipsDebug(t *testing.T) {
	url := runServer(t)
	pub := connect(t, url)
	sub := connect(t, url)

	msgs := make(chan *nats.Msg, 1)
	if _, err := sub.ChanSubscribe(LogSubject, msgs); err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	if err := sub.Flush(); err != nil {
		t.Fatalf("flush: %v", err)
	}

	logger := slog.New(newLogSink(pub, "dep-x", "", ""))
	logger.Debug("trace-me")

	select {
	case m := <-msgs:
		if string(m.Data) == "" {
			t.Fatal("expected a debug record payload")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("debug record was not shipped")
	}
}
