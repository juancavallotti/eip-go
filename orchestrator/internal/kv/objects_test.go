package kv

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newObjectServer(t *testing.T, store Store) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	NewObjectHandler(store).Register(mux)
	ts := httptest.NewServer(mux)
	t.Cleanup(ts.Close)
	return ts
}

func TestObjectPutGetList(t *testing.T) {
	store := newFakeStore()
	ts := newObjectServer(t, store)

	// Create two keys via the JSON facade.
	for _, k := range []string{"beta", "alpha"} {
		resp := do(t, http.MethodPut, ts.URL+"/deployments/dep-1/objects/"+k, "",
			`{"value":"`+k+`","version":0}`)
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("PUT %s status = %d, want 200 (%s)", k, resp.StatusCode, body)
		}
	}

	// The facade writes to the user namespace only.
	if _, ok := store.rows["user/alpha"]; !ok {
		t.Fatal("alpha not stored under the user namespace")
	}

	// Get returns the value with a utf8 encoding.
	get := do(t, http.MethodGet, ts.URL+"/deployments/dep-1/objects/alpha", "", "")
	defer get.Body.Close()
	if get.StatusCode != http.StatusOK {
		t.Fatalf("GET status = %d, want 200", get.StatusCode)
	}
	var val objectValue
	if err := json.NewDecoder(get.Body).Decode(&val); err != nil {
		t.Fatalf("decode value: %v", err)
	}
	if val.Value != "alpha" || val.Encoding != "utf8" || val.Version != 1 {
		t.Fatalf("got %+v, want value=alpha encoding=utf8 version=1", val)
	}

	// List returns both keys, ordered by key.
	list := do(t, http.MethodGet, ts.URL+"/deployments/dep-1/objects", "", "")
	defer list.Body.Close()
	var listed struct {
		Items []Entry `json:"items"`
	}
	if err := json.NewDecoder(list.Body).Decode(&listed); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(listed.Items) != 2 || listed.Items[0].Key != "alpha" || listed.Items[1].Key != "beta" {
		t.Fatalf("list = %+v, want [alpha, beta]", listed.Items)
	}
}

func TestObjectListEmptyIsArray(t *testing.T) {
	ts := newObjectServer(t, newFakeStore())
	resp := do(t, http.MethodGet, ts.URL+"/deployments/dep-1/objects", "", "")
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if got := string(body); got != "{\"items\":[]}\n" {
		t.Fatalf("empty list = %q, want an empty items array", got)
	}
}

func TestObjectGetMissingIs404(t *testing.T) {
	ts := newObjectServer(t, newFakeStore())
	resp := do(t, http.MethodGet, ts.URL+"/deployments/dep-1/objects/absent", "", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestObjectPutConflictIs409(t *testing.T) {
	store := newFakeStore()
	store.setErr = ErrVersionConflict
	ts := newObjectServer(t, store)
	resp := do(t, http.MethodPut, ts.URL+"/deployments/dep-1/objects/k", "",
		`{"value":"x","version":9}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d, want 409", resp.StatusCode)
	}
}

func TestObjectDeleteUsesVersionQuery(t *testing.T) {
	store := newFakeStore()
	ts := newObjectServer(t, store)
	if _, err := store.Set(nil, "dep-1", "user", "k", []byte("v"), 0); err != nil {
		t.Fatalf("seed: %v", err)
	}
	resp := do(t, http.MethodDelete, ts.URL+"/deployments/dep-1/objects/k?version=1", "", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", resp.StatusCode)
	}
	if _, ok := store.rows["user/k"]; ok {
		t.Fatal("key present after delete")
	}
}

func TestObjectBinaryRoundTripsAsBase64(t *testing.T) {
	store := newFakeStore()
	ts := newObjectServer(t, store)
	store.rows["user/bin"] = []byte{0xff, 0xfe, 0x00}
	store.version["user/bin"] = 3

	get := do(t, http.MethodGet, ts.URL+"/deployments/dep-1/objects/bin", "", "")
	defer get.Body.Close()
	var val objectValue
	if err := json.NewDecoder(get.Body).Decode(&val); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if val.Encoding != "base64" || val.Value != "//4A" {
		t.Fatalf("got encoding=%q value=%q, want base64 //4A", val.Encoding, val.Value)
	}
}
