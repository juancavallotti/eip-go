package engine

import (
	"context"
	"testing"

	"github.com/juancavallotti/octo/core"
	"github.com/juancavallotti/octo/types"
)

// enrichRegistry extends the shared test registry with a "bodyvar" leaf that
// rewrites the body, drops a pre-existing variable, and sets a new one, so tests
// can observe exactly how the enrich block folds the body flow's result back.
func enrichRegistry() *core.BlockRegistry {
	reg := testRegistry()
	reg.MustRegister("bodyvar", func(types.Settings, core.BlockDeps) (core.MessageProcessor, error) {
		return processorFunc(func(_ context.Context, msg *types.Message) (*types.Message, error) {
			msg.Body = "enriched"
			delete(msg.Variables, "keep")
			msg.Variables.Set("added", true)
			return msg, nil
		}), nil
	})
	return reg
}

// buildEnrich builds an enrich block from its config, failing the test on error.
func buildEnrich(t *testing.T, reg *core.BlockRegistry, cfg types.BlockConfig) *enrichScope {
	t.Helper()
	cfg.Type = blockKindEnrich
	proc, err := (&builder{reg: reg}).enrich(cfg)
	if err != nil {
		t.Fatalf("build enrich: %v", err)
	}
	e, ok := proc.(*enrichScope)
	if !ok {
		t.Fatalf("build enrich returned %T, want *enrichScope", proc)
	}
	return e
}

// enrichInput returns a message with a known body and a "keep" variable so
// propagation policies can be told apart.
func enrichInput(t *testing.T) *types.Message {
	t.Helper()
	msg := mustMessage(t)
	msg.Body = "orig"
	msg.Variables.Set("keep", true)
	return msg
}

func TestEnrichDefaultsReplaceBodyMergeVars(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		Body: &types.FlowConfig{Process: []types.BlockConfig{{Type: "bodyvar"}}},
	})

	msg := enrichInput(t)
	out, err := e.Process(context.Background(), msg)
	if err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if out != msg {
		t.Errorf("enrich returned %p, want the input message %p", out, msg)
	}
	if msg.Body != "enriched" {
		t.Errorf("body = %v, want enriched (replace is the default)", msg.Body)
	}
	if added, _ := msg.Variables.Bool("added"); !added {
		t.Error("merge should have folded the added variable back")
	}
	if keep, _ := msg.Variables.Bool("keep"); !keep {
		t.Error("merge should leave pre-existing variables intact")
	}
}

func TestEnrichKeepBody(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		PropagateBody: propagateBodyKeep,
		Body:          &types.FlowConfig{Process: []types.BlockConfig{{Type: "bodyvar"}}},
	})

	msg := enrichInput(t)
	if _, err := e.Process(context.Background(), msg); err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if msg.Body != "orig" {
		t.Errorf("body = %v, want orig (keep leaves the body untouched)", msg.Body)
	}
	if added, _ := msg.Variables.Bool("added"); !added {
		t.Error("vars should still merge when body is kept")
	}
}

func TestEnrichKeepVars(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		PropagateVars: propagateVarsKeep,
		Body:          &types.FlowConfig{Process: []types.BlockConfig{{Type: "bodyvar"}}},
	})

	msg := enrichInput(t)
	if _, err := e.Process(context.Background(), msg); err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if msg.Body != "enriched" {
		t.Errorf("body = %v, want enriched", msg.Body)
	}
	if _, ok := msg.Variables.Bool("added"); ok {
		t.Error("keep should discard the enriched variables")
	}
	if keep, _ := msg.Variables.Bool("keep"); !keep {
		t.Error("keep should leave the incoming variables intact")
	}
}

func TestEnrichReplaceVars(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		PropagateVars: propagateVarsReplace,
		Body:          &types.FlowConfig{Process: []types.BlockConfig{{Type: "bodyvar"}}},
	})

	msg := enrichInput(t)
	if _, err := e.Process(context.Background(), msg); err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if added, _ := msg.Variables.Bool("added"); !added {
		t.Error("replace should adopt the enriched variables")
	}
	if _, ok := msg.Variables.Bool("keep"); ok {
		t.Error("replace should swap the whole set; the body dropped keep")
	}
}

func TestEnrichIsolationKeepKeep(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		PropagateBody: propagateBodyKeep,
		PropagateVars: propagateVarsKeep,
		Body:          &types.FlowConfig{Process: []types.BlockConfig{{Type: "bodyvar"}}},
	})

	msg := enrichInput(t)
	if _, err := e.Process(context.Background(), msg); err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if msg.Body != "orig" {
		t.Errorf("body = %v, want orig (keep/keep runs the body only for side-effects)", msg.Body)
	}
	if _, ok := msg.Variables.Bool("added"); ok {
		t.Error("keep/keep should leave the input message fully untouched")
	}
}

func TestEnrichChildErrorPropagates(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		Body: &types.FlowConfig{Process: []types.BlockConfig{{Type: "fail"}}},
	})

	out, err := e.Process(context.Background(), enrichInput(t))
	if err == nil {
		t.Fatal("enrich with a failing body returned nil error")
	}
	if out != nil {
		t.Errorf("enrich returned %v on error, want nil", out)
	}
}

func TestEnrichChildDropDropsMessage(t *testing.T) {
	reg := enrichRegistry()
	e := buildEnrich(t, reg, types.BlockConfig{
		Body: &types.FlowConfig{Process: []types.BlockConfig{{Type: "drop"}}},
	})

	out, err := e.Process(context.Background(), enrichInput(t))
	if err != nil {
		t.Fatalf("enrich Process: %v", err)
	}
	if out != nil {
		t.Errorf("enrich returned %v, want nil when the body drops the message", out)
	}
}

func TestEnrichRejectsUnknownPolicies(t *testing.T) {
	reg := enrichRegistry()
	body := &types.FlowConfig{Process: []types.BlockConfig{{Type: "pass"}}}

	if _, err := (&builder{reg: reg}).enrich(types.BlockConfig{
		Type: blockKindEnrich, PropagateBody: "nope", Body: body,
	}); err == nil {
		t.Error("expected an error for an unknown propagateBody value")
	}
	if _, err := (&builder{reg: reg}).enrich(types.BlockConfig{
		Type: blockKindEnrich, PropagateVars: "nope", Body: body,
	}); err == nil {
		t.Error("expected an error for an unknown propagateVars value")
	}
}

func TestEnrichRequiresBody(t *testing.T) {
	if _, err := (&builder{reg: enrichRegistry()}).enrich(types.BlockConfig{Type: blockKindEnrich}); err == nil {
		t.Error("expected an error when the enrich block has no body flow")
	}
}
