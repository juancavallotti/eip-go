package core

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

// TestTeeHandlerFansOut verifies a record reaches every child handler.
func TestTeeHandlerFansOut(t *testing.T) {
	var a, b bytes.Buffer
	logger := slog.New(TeeHandler(
		slog.NewTextHandler(&a, nil),
		slog.NewTextHandler(&b, nil),
	))

	logger.Info("hello", "k", "v")

	for name, buf := range map[string]*bytes.Buffer{"a": &a, "b": &b} {
		out := buf.String()
		if !strings.Contains(out, "hello") || !strings.Contains(out, "k=v") {
			t.Errorf("child %s missing record: %q", name, out)
		}
	}
}

// TestTeeHandlerDropsNil lets callers pass an optional (nil) sink without guarding.
func TestTeeHandlerDropsNil(t *testing.T) {
	var a bytes.Buffer
	logger := slog.New(TeeHandler(slog.NewTextHandler(&a, nil), nil))

	logger.Info("present")

	if !strings.Contains(a.String(), "present") {
		t.Fatalf("non-nil child should still receive records: %q", a.String())
	}
}

// TestTeeHandlerPerChildLevel checks each child applies its own threshold.
func TestTeeHandlerPerChildLevel(t *testing.T) {
	var info, errOnly bytes.Buffer
	logger := slog.New(TeeHandler(
		slog.NewTextHandler(&info, &slog.HandlerOptions{Level: slog.LevelInfo}),
		slog.NewTextHandler(&errOnly, &slog.HandlerOptions{Level: slog.LevelError}),
	))

	logger.Info("just-info")

	if !strings.Contains(info.String(), "just-info") {
		t.Errorf("info child should receive an info record: %q", info.String())
	}
	if errOnly.Len() != 0 {
		t.Errorf("error-only child should drop an info record: %q", errOnly.String())
	}
}

// TestTeeHandlerEnabled reports true when any child would handle the level.
func TestTeeHandlerEnabled(t *testing.T) {
	h := TeeHandler(
		slog.NewTextHandler(&bytes.Buffer{}, &slog.HandlerOptions{Level: slog.LevelError}),
		slog.NewTextHandler(&bytes.Buffer{}, &slog.HandlerOptions{Level: slog.LevelDebug}),
	)
	ctx := context.Background()
	if !h.Enabled(ctx, slog.LevelInfo) {
		t.Error("expected Enabled(info)=true because the debug child handles it")
	}

	none := TeeHandler(slog.NewTextHandler(&bytes.Buffer{}, &slog.HandlerOptions{Level: slog.LevelError}))
	if none.Enabled(ctx, slog.LevelInfo) {
		t.Error("expected Enabled(info)=false when no child handles it")
	}
}

// TestTeeHandlerWithAttrsAndGroup checks attrs/groups propagate to every child.
func TestTeeHandlerWithAttrsAndGroup(t *testing.T) {
	var a, b bytes.Buffer
	base := TeeHandler(slog.NewTextHandler(&a, nil), slog.NewTextHandler(&b, nil))
	logger := slog.New(base).With("req", "r1").WithGroup("g")

	logger.Info("msg", "n", 1)

	for name, buf := range map[string]*bytes.Buffer{"a": &a, "b": &b} {
		out := buf.String()
		if !strings.Contains(out, "req=r1") || !strings.Contains(out, "g.n=1") {
			t.Errorf("child %s missing attr/group output: %q", name, out)
		}
	}
}
