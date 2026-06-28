package kv

import (
	"context"
	"encoding/base64"
	"net/http"
	"strconv"
	"unicode/utf8"

	httpx "github.com/juancavallotti/octo/orchestrator/internal/http"
)

// userNamespace is the single, user-facing KV namespace the object browser serves.
// Fixing it here (rather than reading it from the path, as the raw KV handler does)
// keeps the system and secret namespaces off the platform's object API.
const userNamespace = "user"

// ObjectHandler serves the user-facing object browser the platform UI calls: a JSON
// facade over the KV store, fixed to the "user" namespace so system and secret data
// never reach it. It adds the listing the raw KV routes lack; reads/writes/deletes
// otherwise mirror the raw handler's optimistic-concurrency semantics, with the
// version carried in the JSON body / query string rather than a header.
type ObjectHandler struct {
	store Store
}

// NewObjectHandler returns an ObjectHandler serving store.
func NewObjectHandler(store Store) *ObjectHandler {
	return &ObjectHandler{store: store}
}

// Register attaches the object routes to mux. The key segment is a trailing wildcard
// so keys may contain slashes.
func (h *ObjectHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /deployments/{id}/objects", h.list)
	mux.HandleFunc("GET /deployments/{id}/objects/{key...}", h.get)
	mux.HandleFunc("PUT /deployments/{id}/objects/{key...}", h.put)
	mux.HandleFunc("DELETE /deployments/{id}/objects/{key...}", h.delete)
}

// objectValue is the JSON shape a single object is returned/written as. Encoding is
// "utf8" for human-readable values or "base64" for binary ones, so a value round-
// trips losslessly through JSON either way.
type objectValue struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Encoding string `json:"encoding"`
	Version  int64  `json:"version"`
}

func (h *ObjectHandler) list(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	entries, err := h.store.List(ctx, r.PathValue("id"), userNamespace)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	if entries == nil {
		entries = []Entry{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": entries})
}

func (h *ObjectHandler) get(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	key := r.PathValue("key")
	value, version, ok, err := h.store.Get(ctx, r.PathValue("id"), userNamespace, key)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	out := objectValue{Key: key, Version: version}
	// Return readable values verbatim; fall back to base64 for binary so JSON stays
	// valid and the value survives the round trip.
	if utf8.Valid(value) {
		out.Encoding = "utf8"
		out.Value = string(value)
	} else {
		out.Encoding = "base64"
		out.Value = base64.StdEncoding.EncodeToString(value)
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}

func (h *ObjectHandler) put(w http.ResponseWriter, r *http.Request) {
	var req objectValue
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	value, err := decodeValue(req.Value, req.Encoding)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid value encoding")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	version, err := h.store.Set(ctx, r.PathValue("id"), userNamespace, r.PathValue("key"), value, req.Version)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]int64{"version": version})
}

func (h *ObjectHandler) delete(w http.ResponseWriter, r *http.Request) {
	expected, err := versionQuery(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid version")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	if err := h.store.Delete(ctx, r.PathValue("id"), userNamespace, r.PathValue("key"), expected); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// decodeValue turns the JSON value into bytes per its encoding ("base64" for binary,
// anything else treated as a literal UTF-8 string).
func decodeValue(value, encoding string) ([]byte, error) {
	if encoding == "base64" {
		return base64.StdEncoding.DecodeString(value)
	}
	return []byte(value), nil
}

// versionQuery reads the ?version= query param, defaulting an absent value to 0
// (unconditional).
func versionQuery(r *http.Request) (int64, error) {
	raw := r.URL.Query().Get("version")
	if raw == "" {
		return 0, nil
	}
	return strconv.ParseInt(raw, 10, 64)
}
