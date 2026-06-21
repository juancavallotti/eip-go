package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/juancavallotti/eip-go/core"
	"github.com/juancavallotti/eip-go/types"
)

// routeGuardrailSentinel is the route name the model selects to fall back to the
// guardrail (Default) path when it is not confident in any named route.
const routeGuardrailSentinel = "__guardrail__"

// defaultRouterRounds caps how many inspection turns the router runs before it
// gives up and takes the guardrail. Each turn is one model call.
const defaultRouterRounds = 5

// aiRouter is a composite that asks an LLM to pick one of its named routes. The
// model is given read-only tools to inspect the message body and variables, plus
// a select_route tool that emits the decision. The guardrail (Default) flow is
// taken when the model is not confident or never decides.
type aiRouter struct {
	client    core.LLMClient
	system    string
	tools     []core.LLMTool
	routes    map[string]*Flow
	guardrail *Flow
	maxRounds int
}

//nolint:ireturn // builders intentionally return the MessageProcessor interface
func (b *builder) aiRouter(cfg types.BlockConfig) (core.MessageProcessor, error) {
	if len(cfg.Routes) == 0 {
		return nil, errors.New("ai-router block requires at least one route")
	}
	if strings.TrimSpace(cfg.Prompt) == "" {
		return nil, errors.New("ai-router block requires a prompt")
	}
	if err := allowSlots(cfg, blockKindAIRouter, "routes", "default", "connector", "prompt", "guardrail"); err != nil {
		return nil, err
	}

	client, err := resolveLLM(blockKindAIRouter, cfg.Connector, b.deps)
	if err != nil {
		return nil, err
	}

	routes := make(map[string]*Flow, len(cfg.Routes))
	names := make([]string, 0, len(cfg.Routes))
	for i := range cfg.Routes {
		route := cfg.Routes[i]
		if route.Name == "" {
			return nil, fmt.Errorf("ai-router route %d requires a name", i)
		}
		if route.Description == "" {
			return nil, fmt.Errorf("ai-router route %q requires a description", route.Name)
		}
		if _, dup := routes[route.Name]; dup {
			return nil, fmt.Errorf("ai-router route %q is defined more than once", route.Name)
		}
		flow, flowErr := b.subFlow(route.Flow)
		if flowErr != nil {
			return nil, fmt.Errorf("ai-router route %q: %w", route.Name, flowErr)
		}
		routes[route.Name] = flow
		names = append(names, route.Name)
	}

	block := &aiRouter{
		client:    client,
		system:    buildRouterSystem(cfg.Prompt, cfg.Routes, cfg.Guardrail),
		tools:     routerTools(names),
		routes:    routes,
		maxRounds: defaultRouterRounds,
	}
	if cfg.Default != nil {
		guardrail, defErr := b.subFlow(*cfg.Default)
		if defErr != nil {
			return nil, fmt.Errorf("ai-router default: %w", defErr)
		}
		block.guardrail = guardrail
	}
	return block, nil
}

// Process runs the inspection/decision loop, then dispatches to the chosen route
// or the guardrail.
func (r *aiRouter) Process(ctx context.Context, msg *types.Message) (*types.Message, error) {
	messages := []core.LLMMessage{{
		Role: core.LLMRoleUser,
		Text: "Decide which route to take for the current message. " +
			"Inspect the body and variables as needed, then call select_route.",
	}}

	for round := 0; round < r.maxRounds; round++ {
		resp, err := r.client.Complete(ctx, core.LLMRequest{
			System:     r.system,
			Messages:   messages,
			Tools:      r.tools,
			ToolChoice: core.LLMToolChoice{Mode: core.LLMToolChoiceAny},
		})
		if err != nil {
			return nil, fmt.Errorf("ai-router: %w", err)
		}
		messages = append(messages, resp.Raw)
		if len(resp.ToolCalls) == 0 {
			break // model produced no decision; fall back to the guardrail
		}

		results := make([]core.LLMToolResult, 0, len(resp.ToolCalls))
		for _, call := range resp.ToolCalls {
			if call.Name == "select_route" {
				return r.dispatch(ctx, routeFromCall(call), msg)
			}
			results = append(results, r.inspect(call, msg))
		}
		messages = append(messages, core.LLMMessage{Role: core.LLMRoleTool, ToolResults: results})
	}

	return r.dispatch(ctx, routeGuardrailSentinel, msg)
}

// dispatch runs the named route's flow, or the guardrail flow when the route is
// the guardrail sentinel or is unknown, or passes the message through when there
// is no guardrail (mirroring switch's nil-default behavior).
func (r *aiRouter) dispatch(ctx context.Context, route string, msg *types.Message) (*types.Message, error) {
	if flow, ok := r.routes[route]; ok {
		return flow.Process(ctx, msg)
	}
	if r.guardrail != nil {
		return r.guardrail.Process(ctx, msg)
	}
	return msg, nil
}

// inspect serves a read-only inspection tool call against the message.
func (r *aiRouter) inspect(call core.LLMToolCall, msg *types.Message) core.LLMToolResult {
	switch call.Name {
	case "get_body":
		body, err := msg.BodyJSON()
		if err != nil {
			return errorResult(call.ID, fmt.Sprintf("encode body: %v", err))
		}
		return core.LLMToolResult{ToolCallID: call.ID, Content: string(body)}
	case "list_variables":
		return core.LLMToolResult{ToolCallID: call.ID, Content: jsonStringArray(variableNames(msg))}
	case "get_variable":
		var args struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(call.Input, &args); err != nil {
			return errorResult(call.ID, "invalid arguments")
		}
		value, ok := msg.Variables[args.Name]
		if !ok {
			return errorResult(call.ID, fmt.Sprintf("variable %q is not set", args.Name))
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return errorResult(call.ID, fmt.Sprintf("encode variable: %v", err))
		}
		return core.LLMToolResult{ToolCallID: call.ID, Content: string(encoded)}
	default:
		return errorResult(call.ID, fmt.Sprintf("unknown tool %q", call.Name))
	}
}

// routeFromCall extracts the chosen route name from a select_route tool call,
// defaulting to the guardrail sentinel when the arguments cannot be read.
func routeFromCall(call core.LLMToolCall) string {
	var args struct {
		Route string `json:"route"`
	}
	if err := json.Unmarshal(call.Input, &args); err != nil || args.Route == "" {
		return routeGuardrailSentinel
	}
	return args.Route
}

// buildRouterSystem assembles the routing system prompt: the user's instruction,
// the route catalog, and the guardrail guidance.
func buildRouterSystem(prompt string, routes []types.RouteConfig, guardrail string) string {
	var b strings.Builder
	b.WriteString("You are a router. Choose exactly one route for the incoming message by ")
	b.WriteString("calling the select_route tool. Use the inspection tools (get_body, ")
	b.WriteString("get_variable, list_variables) to gather what you need before deciding.\n\n")
	b.WriteString(strings.TrimSpace(prompt))
	b.WriteString("\n\nAvailable routes:\n")
	for _, route := range routes {
		fmt.Fprintf(&b, "- %s: %s\n", route.Name, route.Description)
	}
	b.WriteString("\nIf you are not confident in any route, select ")
	b.WriteString(routeGuardrailSentinel)
	b.WriteString(" (the guardrail).")
	if strings.TrimSpace(guardrail) != "" {
		b.WriteString("\nGuardrail guidance: ")
		b.WriteString(strings.TrimSpace(guardrail))
	}
	return b.String()
}

// routerTools builds the inspection tools plus the select_route decision tool.
func routerTools(routeNames []string) []core.LLMTool {
	enum := make([]string, 0, len(routeNames)+1)
	enum = append(enum, routeNames...)
	enum = append(enum, routeGuardrailSentinel)

	return []core.LLMTool{
		{
			Name:        "get_body",
			Description: "Return the current message body as JSON.",
			InputSchema: json.RawMessage(`{"type":"object","properties":{}}`),
		},
		{
			Name:        "list_variables",
			Description: "Return the names of the variables set on the message.",
			InputSchema: json.RawMessage(`{"type":"object","properties":{}}`),
		},
		{
			Name:        "get_variable",
			Description: "Return the value of a named message variable as JSON.",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}`),
		},
		{
			Name:        "select_route",
			Description: "Choose the route to run for this message.",
			InputSchema: selectRouteSchema(enum),
		},
	}
}

// selectRouteSchema builds the JSON Schema for the select_route tool, restricting
// the route to the known names plus the guardrail sentinel.
func selectRouteSchema(enum []string) json.RawMessage {
	enumJSON, _ := json.Marshal(enum)
	return json.RawMessage(fmt.Sprintf(
		`{"type":"object","properties":{`+
			`"route":{"type":"string","enum":%s,"description":"The route to run."},`+
			`"reason":{"type":"string","description":"A brief justification for the choice."}},`+
			`"required":["route"]}`,
		enumJSON))
}

// errorResult builds a tool result marked as an error so the model can react.
func errorResult(toolCallID, message string) core.LLMToolResult {
	return core.LLMToolResult{ToolCallID: toolCallID, Content: message, IsError: true}
}

// variableNames returns the message's variable names, sorted for determinism.
func variableNames(msg *types.Message) []string {
	names := make([]string, 0, len(msg.Variables))
	for name := range msg.Variables {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// jsonStringArray marshals a string slice to a JSON array string.
func jsonStringArray(values []string) string {
	raw, _ := json.Marshal(values)
	return string(raw)
}

// resolveLLM binds an AI composite to its LLM provider connector by name,
// asserting the shared core.LLMClient interface so any provider satisfies it. The
// kind labels the error.
//
//nolint:ireturn // the shared interface is the binding mechanism, by design
func resolveLLM(kind, name string, deps core.BlockDeps) (core.LLMClient, error) {
	if name == "" {
		return nil, fmt.Errorf("%s block requires a connector", kind)
	}
	if deps.Connector == nil {
		return nil, fmt.Errorf("%s block: connector %q requested but no connectors are available", kind, name)
	}
	connector, ok := deps.Connector(name)
	if !ok {
		return nil, fmt.Errorf("%s block: connector %q is not configured", kind, name)
	}
	client, ok := connector.(core.LLMClient)
	if !ok {
		return nil, fmt.Errorf("%s block: connector %q is not an LLM provider", kind, name)
	}
	return client, nil
}
