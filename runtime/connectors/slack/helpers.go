// This file holds helpers shared by the slack blocks: binding a block to its
// slack connector, and the CEL activation plumbing that mirrors the other
// CEL-driven blocks (rest, queue-dispatch).
package slack

import (
	"fmt"
	"strings"
	"time"

	"github.com/juancavallotti/octo/core"
	"github.com/juancavallotti/octo/core/expr"
	"github.com/juancavallotti/octo/types"
)

// exprVars are the names a slack block's CEL expressions can reference, matching
// the other CEL-driven blocks.
var exprVars = []string{"body", "vars", "eventID", "correlationID", "env", "now"}

// resolveConnector binds a block to its slack connector by name.
func resolveConnector(name string, deps core.BlockDeps) (*Connector, error) {
	if name == "" {
		return nil, fmt.Errorf("connector is required")
	}
	if deps.Connector == nil {
		return nil, fmt.Errorf("connector %q requested but no connectors are available", name)
	}
	connector, ok := deps.Connector(name)
	if !ok {
		return nil, fmt.Errorf("slack connector %q is not configured", name)
	}
	conn, ok := connector.(*Connector)
	if !ok {
		return nil, fmt.Errorf("connector %q is not a slack connector", name)
	}
	return conn, nil
}

// compileOptional compiles a CEL expression, returning a nil program for an
// empty source so callers can treat "unset" as "skip".
func compileOptional(src string) (*expr.Program, error) {
	if strings.TrimSpace(src) == "" {
		return nil, nil
	}
	return expr.Compile(src, exprVars...)
}

// messageActivation maps a message (and the block's resolved env) onto the
// variables a CEL expression can reference.
func messageActivation(msg *types.Message, env map[string]any) map[string]any {
	return map[string]any{
		"body":          msg.Body,
		"vars":          map[string]any(msg.Variables),
		"eventID":       msg.EventID,
		"correlationID": msg.CorrelationID,
		"env":           env,
		"now":           time.Now(),
	}
}

// envActivation materializes a resolved env map into the form CEL expects once
// at build time, so it is shared across every message a block processes.
func envActivation(env map[string]string) map[string]any {
	out := make(map[string]any, len(env))
	for k, v := range env {
		out[k] = v
	}
	return out
}
