package deployment

import "encoding/json"

// DeploymentsSubject is the NATS subject an integration's deployment snapshots are
// published on; the platform BFF subscribes per integration and relays them as SSE.
// Must stay in sync with the BFF's subject builder (apps/platform).
func DeploymentsSubject(integrationID string) string {
	return "octo.deployments." + integrationID
}

// MarshalSnapshot encodes deployments as the JSON array the deployments stream
// carries — the same wire shape the REST list returns, so the browser parses a
// streamed frame and a polled response identically.
func MarshalSnapshot(items []Deployment) ([]byte, error) {
	out := make([]deploymentResponse, 0, len(items))
	for _, d := range items {
		out = append(out, toResponse(d))
	}
	return json.Marshal(out)
}
