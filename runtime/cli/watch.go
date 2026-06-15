package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

// watchDebounce is how long to wait after the last filesystem event before
// signalling a change, so a burst of editor writes coalesces into one reload.
const watchDebounce = 200 * time.Millisecond

// watchConfig watches the config path for changes, emitting on the returned
// channel (debounced) whenever the file or directory contents change. When path
// is a directory the directory itself is watched, so added/removed config files
// are noticed too. The watcher runs until ctx is cancelled.
func watchConfig(ctx context.Context, path string) (<-chan struct{}, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("new watcher: %w", err)
	}
	if err := watcher.Add(watchTarget(path)); err != nil {
		_ = watcher.Close()
		return nil, fmt.Errorf("watch %q: %w", path, err)
	}

	changed := make(chan struct{}, 1)
	go watchLoop(ctx, watcher, changed)
	return changed, nil
}

// watchTarget returns the path to register with the watcher. For a file we watch
// its parent directory so atomic-rename saves (editors replacing rather than
// writing in place) are still observed; for a directory we watch it directly.
func watchTarget(path string) string {
	info, err := os.Stat(path)
	if err == nil && !info.IsDir() {
		return filepath.Dir(path)
	}
	return path
}

// watchLoop forwards debounced change notifications until ctx is cancelled or the
// watcher closes, then closes the watcher.
func watchLoop(ctx context.Context, watcher *fsnotify.Watcher, changed chan<- struct{}) {
	defer func() { _ = watcher.Close() }()
	var timer *time.Timer
	var timerC <-chan time.Time
	for {
		select {
		case <-ctx.Done():
			return
		case _, ok := <-watcher.Events:
			if !ok {
				return
			}
			timer, timerC = armDebounce(timer)
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			slog.Warn("config watcher error", "error", err)
		case <-timerC:
			timer, timerC = nil, nil
			notify(changed)
		}
	}
}

// armDebounce (re)starts the debounce timer, returning it and its channel.
func armDebounce(timer *time.Timer) (*time.Timer, <-chan time.Time) {
	if timer == nil {
		timer = time.NewTimer(watchDebounce)
	} else {
		timer.Reset(watchDebounce)
	}
	return timer, timer.C
}

// notify sends a non-blocking change signal (coalescing if one is pending).
func notify(changed chan<- struct{}) {
	select {
	case changed <- struct{}{}:
	default:
	}
}
