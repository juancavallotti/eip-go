package user

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// userColumns is the canonical column list (and order) scanUser expects, kept in
// one place so reads and RETURNING clauses stay in sync.
const userColumns = "id, subject, email, name, created_at, last_login_at"

// Repo persists users to Postgres.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo returns a Repo backed by the given pool.
func NewRepo(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

// Upsert provisions the user identified by subject, or refreshes the email/name
// and last_login_at of an existing one, returning the resulting row. The generated
// id is stable across logins.
func (r *Repo) Upsert(ctx context.Context, subject, email, name string) (User, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO users (subject, email, name)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (subject) DO UPDATE SET
		   email = EXCLUDED.email,
		   name = EXCLUDED.name,
		   last_login_at = now()
		 RETURNING `+userColumns,
		subject, email, name,
	)
	u, err := scanUser(row)
	if err != nil {
		return User{}, fmt.Errorf("user repo: upsert: %w", err)
	}
	return u, nil
}

// Get returns the user by id, or ErrNotFound if it does not exist.
func (r *Repo) Get(ctx context.Context, id string) (User, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, fmt.Errorf("user repo: get: %w", err)
	}
	return u, nil
}

// scanUser reads one row in userColumns order.
func scanUser(row pgx.Row) (User, error) {
	var u User
	if err := row.Scan(&u.ID, &u.Subject, &u.Email, &u.Name, &u.CreatedAt, &u.LastLoginAt); err != nil {
		return User{}, err
	}
	return u, nil
}
