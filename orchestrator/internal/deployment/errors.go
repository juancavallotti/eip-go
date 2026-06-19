package deployment

import "errors"

var (
	// ErrNotFound is returned when a deployment does not exist.
	ErrNotFound = errors.New("deployment not found")
	// ErrIntegrationNotFound is returned when the integration to deploy does not exist.
	ErrIntegrationNotFound = errors.New("integration not found")
	// ErrUnavailable is returned when Kubernetes access is not configured, so
	// deployments cannot be managed.
	ErrUnavailable = errors.New("deployments unavailable")
	// ErrExternalUnavailable is returned when an external endpoint is requested
	// but no base domain is configured on the orchestrator.
	ErrExternalUnavailable = errors.New("external endpoints unavailable: no base domain configured")
	// ErrInvalidSubdomain is returned when a requested external subdomain has no
	// usable DNS-1123 form.
	ErrInvalidSubdomain = errors.New("invalid external subdomain")
	// ErrSlugTaken is returned when the integration's slug (which names the stable
	// internal Service) is already in use by a different integration.
	ErrSlugTaken = errors.New("integration slug already in use")
	// ErrSubdomainTaken is returned when the requested external subdomain is
	// already in use by a different integration.
	ErrSubdomainTaken = errors.New("external subdomain already in use")
)
