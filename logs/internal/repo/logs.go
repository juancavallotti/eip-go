// Package repo persists log events to Postgres. It implements ingest.Store with a
// hand-written INSERT against the logs table, mirroring the orchestrator's
// pgxpool-based repositories.
package repo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/juancavallotti/octo/logs/internal/ingest"
)

// Repo writes log events to the logs table.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo returns a repo backed by pool.
func NewRepo(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

// Insert stores one log event. attrs is passed as text so Postgres casts it into
// the jsonb column; received_at defaults to now() in the schema.
func (r *Repo) Insert(ctx context.Context, e ingest.Event) error {
	attrs := string(e.Attrs)
	if attrs == "" {
		attrs = "{}"
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO logs (deployment_id, app_name, app_version, ts, level, message, attrs)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		e.DeploymentID, e.AppName, e.AppVersion, e.Time, e.Level, e.Message, attrs,
	)
	if err != nil {
		return fmt.Errorf("repo: insert log: %w", err)
	}
	return nil
}
