package user

import (
	"context"
	"fmt"
	"strings"
)

// repository is the persistence surface the service needs. Declared in the
// consumer (and unexported) so service tests can substitute a fake; *Repo
// satisfies it structurally.
type repository interface {
	Upsert(ctx context.Context, subject, email, name string) (User, error)
	Get(ctx context.Context, id string) (User, error)
}

// Service holds user provisioning logic.
type Service struct {
	repo repository
}

// NewService returns a Service backed by repo.
func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

// Bootstrap provisions or refreshes the user identified by subject. It is the
// first-sign-in hook the platform calls from its auth callback: subject and email
// are required (a principal we cannot identify is rejected), name is best-effort.
func (s *Service) Bootstrap(ctx context.Context, subject, email, name string) (User, error) {
	subject = strings.TrimSpace(subject)
	email = strings.TrimSpace(email)
	if subject == "" {
		return User{}, fmt.Errorf("%w: subject is required", ErrInvalid)
	}
	if email == "" {
		return User{}, fmt.Errorf("%w: email is required", ErrInvalid)
	}
	return s.repo.Upsert(ctx, subject, email, strings.TrimSpace(name))
}

// Get returns the user by id.
func (s *Service) Get(ctx context.Context, id string) (User, error) {
	return s.repo.Get(ctx, id)
}
