package user

import "errors"

var (
	// ErrNotFound is returned when a user does not exist.
	ErrNotFound = errors.New("user not found")
	// ErrInvalid is returned when a bootstrap payload is missing the subject or
	// email needed to identify the principal.
	ErrInvalid = errors.New("user invalid")
)
