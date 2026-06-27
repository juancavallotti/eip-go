// Package user is the orchestrator feature module for authenticated principals.
// Identity originates at the OIDC provider; the platform bootstraps a row on first
// sign-in (keyed by the stable `subject`) and keeps email/name in sync on later
// logins. The generated `id` is the durable handle other modules (apikey) scope
// by, so it survives IdP email changes. The module follows the same
// repository/service/handler shape as the integration and snapshot modules.
package user

import "time"

// User is an authenticated principal. IDs are UUIDs in canonical text form;
// Subject is the OIDC `sub` (or a sentinel for the local-dev session).
type User struct {
	ID          string
	Subject     string
	Email       string
	Name        string
	CreatedAt   time.Time
	LastLoginAt time.Time
}
