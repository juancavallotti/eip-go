// This file provides the "slack-lookup-user" block: it resolves a Slack user by
// email (users.lookupByEmail) and folds the returned user object into a
// variable, so a flow can enrich a message with the user's id and profile.
package slack

import (
	"context"
	"fmt"

	"github.com/juancavallotti/octo/core"
	"github.com/juancavallotti/octo/core/expr"
	"github.com/juancavallotti/octo/types"
)

func init() {
	core.MustRegisterBlock("slack-lookup-user", newLookupUser)
}

// defaultUserVar names the variable the looked-up user object is stored in.
const defaultUserVar = "slackUser"

// lookupSettings is the slack-lookup-user block's typed configuration.
type lookupSettings struct {
	// Connector names the slack connector to look up through (required).
	Connector string `json:"connector"`
	// Email is a CEL expression producing the email address to resolve (required).
	Email string `json:"email"`
	// ResultVar names the variable the user object is stored in (default
	// "slackUser").
	ResultVar string `json:"resultVar"`
	// FailOnError, when true (the default), turns a Slack API error (e.g.
	// users_not_found) into a flow error.
	FailOnError *bool `json:"failOnError"`
}

// lookupProcessor resolves a user by email and stores the result.
type lookupProcessor struct {
	conn        *Connector
	email       *expr.Program
	resultVar   string
	failOnError bool
	env         map[string]any
}

//nolint:ireturn // a BlockFactory returns the MessageProcessor interface
func newLookupUser(raw types.Settings, deps core.BlockDeps) (core.MessageProcessor, error) {
	var cfg lookupSettings
	if err := raw.Decode(&cfg); err != nil {
		return nil, err
	}
	conn, err := resolveConnector(cfg.Connector, deps)
	if err != nil {
		return nil, fmt.Errorf("slack-lookup-user: %w", err)
	}
	email, err := compileRequired("slack-lookup-user", "email", cfg.Email)
	if err != nil {
		return nil, err
	}
	return &lookupProcessor{
		conn:        conn,
		email:       email,
		resultVar:   orDefault(cfg.ResultVar, defaultUserVar),
		failOnError: failOnErrorDefault(cfg.FailOnError),
		env:         envActivation(deps.Env),
	}, nil
}

// Process resolves the email and folds the returned user object into the result
// variable.
func (p *lookupProcessor) Process(ctx context.Context, msg *types.Message) (*types.Message, error) {
	email, err := p.email.EvalString(messageActivation(msg, p.env))
	if err != nil {
		return nil, fmt.Errorf("slack-lookup-user email: %w", err)
	}
	resp, err := p.conn.Call(ctx, "users.lookupByEmail", map[string]any{"email": email})
	if err != nil {
		return onCallError(msg, err, p.failOnError)
	}
	msg.Variables.Set(p.resultVar, resp["user"])
	return msg, nil
}
