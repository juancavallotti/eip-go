import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { cachedVersion } from "./version";

/**
 * Server-side manager that owns the running `octo` processes for the editor's dev
 * RUN feature. It renders nothing itself: the editor POSTs YAML, this spawns
 * `octo run -config <file> -watch`, captures stdout/stderr as log lines, and lets
 * SSE clients replay the buffer and subscribe to new lines. Editing the document
 * re-writes the same config file so the runner hot-reloads.
 *
 * Runs are keyed by a per-user namespace slug (see namespace.ts) so concurrent
 * editor users don't disturb one another: each namespace owns an independent
 * process, config file, and log buffer. State lives on `globalThis` so it survives
 * Next's dev HMR module reloads (a new module instance would otherwise lose track
 * of the child processes).
 */

/** Largest config inputs are tiny; this cap just bounds the in-memory log buffer. */
const MAX_LOG_LINES = 5000;
/** Grace period before a stop escalates from SIGTERM to SIGKILL. */
const STOP_GRACE_MS = 3000;

export interface LogLine {
  /** Monotonic id, used as the SSE event id so clients can order/resume. */
  seq: number;
  text: string;
}

export interface RunStatus {
  /** Whether a runner binary is configured (OCTO_BIN_PATH set by `task dev`). */
  available: boolean;
  running: boolean;
  /** The runner's `--version` line, probed once; null until known/if unavailable. */
  version: string | null;
}

type Listener = (line: LogLine) => void;

interface Session {
  /** The namespace slug this session belongs to (also its key in the map). */
  namespace: string;
  proc: ChildProcess | null;
  /** Resolves when the current process has fully exited (used by stop/restart). */
  exit: Promise<void> | null;
  configPath: string | null;
  logs: LogLine[];
  seq: number;
  listeners: Set<Listener>;
}

const store = globalThis as unknown as {
  __octoRunSessions?: Map<string, Session>;
  __octoRunKillHook?: boolean;
};

function sessions(): Map<string, Session> {
  if (!store.__octoRunSessions) store.__octoRunSessions = new Map();
  return store.__octoRunSessions;
}

/** Get-or-create the session for a namespace. */
function session(ns: string): Session {
  const map = sessions();
  let s = map.get(ns);
  if (!s) {
    s = {
      namespace: ns,
      proc: null,
      exit: null,
      configPath: null,
      logs: [],
      seq: 0,
      listeners: new Set(),
    };
    map.set(ns, s);
  }
  return s;
}

function runDir(): string {
  return process.env.OCTO_RUN_DIR || tmpdir();
}

/** Per-namespace directory holding that user's rendered config file. */
function namespaceDir(ns: string): string {
  return join(runDir(), ns);
}

function statusOf(s: Session): RunStatus {
  return {
    available: !!process.env.OCTO_BIN_PATH,
    running: s.proc !== null,
    version: cachedVersion(),
  };
}

export function status(ns: string): RunStatus {
  return statusOf(session(ns));
}

/** The config file the namespace's running generation is watching (for tests/inspection). */
export function currentConfigPath(ns: string): string | null {
  return session(ns).configPath;
}

function pushLine(s: Session, text: string): void {
  const line: LogLine = { seq: s.seq++, text };
  s.logs.push(line);
  if (s.logs.length > MAX_LOG_LINES) {
    s.logs.splice(0, s.logs.length - MAX_LOG_LINES);
  }
  for (const listener of s.listeners) {
    try {
      listener(line);
    } catch {
      // A listener whose stream has closed is harmless; it unsubscribes on cancel.
    }
  }
}

/** Split a stream into lines and push each to the session, holding any partial trailing line. */
function pipeLines(s: Session, stream: Readable | null): void {
  if (!stream) return;
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      pushLine(s, buffer.slice(0, nl).replace(/\r$/, ""));
      buffer = buffer.slice(nl + 1);
    }
  });
  stream.on("end", () => {
    if (buffer !== "") pushLine(s, buffer.replace(/\r$/, ""));
    buffer = "";
  });
}

/** Atomic write (write sibling temp + rename) so `octo`'s dir watcher sees one event. */
async function writeConfig(path: string, yaml: string): Promise<void> {
  const tmp = `${path}.tmp-${randomUUID()}`;
  await writeFile(tmp, yaml, "utf8");
  await rename(tmp, path);
}

/** Start (or restart) the namespace's runner with the given rendered config YAML. */
export async function start(ns: string, yaml: string): Promise<RunStatus> {
  const bin = process.env.OCTO_BIN_PATH;
  if (!bin) {
    throw new Error("OCTO_BIN_PATH is not set; launch the editor with `task dev`.");
  }

  await stop(ns); // tear down any previous generation first

  const s = session(ns);
  s.logs = []; // fresh buffer per run; seq stays monotonic so clients still dedupe

  const dir = namespaceDir(ns);
  await mkdir(dir, { recursive: true });
  const configPath = join(dir, `octo-editor-${randomUUID()}.yaml`);
  await writeConfig(configPath, yaml);
  s.configPath = configPath;

  pushLine(s, `▶ starting octo — ${configPath}`);
  const proc = spawn(bin, ["run", "-config", configPath, "-watch"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  s.proc = proc;
  pipeLines(s, proc.stdout);
  pipeLines(s, proc.stderr);

  s.exit = new Promise<void>((resolve) => {
    const finish = () => {
      if (s.proc === proc) s.proc = null;
      resolve();
    };
    proc.on("error", (err) => {
      pushLine(s, `✖ failed to start runner: ${err.message}`);
      finish();
    });
    // Resolve on "exit" (process gone) rather than "close" (stdio EOF) so stop()
    // stays responsive even if a child inherits and holds the output pipes.
    proc.on("exit", (code, signal) => {
      pushLine(
        s,
        `■ runner exited (${signal ? `signal ${signal}` : `code ${code ?? 0}`})`,
      );
      finish();
    });
  });

  ensureKillOnExit();
  return statusOf(s);
}

/** Re-render the config the namespace's runner is watching, triggering a hot reload. No-op if stopped. */
export async function sync(ns: string, yaml: string): Promise<RunStatus> {
  const s = session(ns);
  if (!s.proc || !s.configPath) return statusOf(s);
  await writeConfig(s.configPath, yaml);
  return statusOf(s);
}

/** Stop the namespace's runner (SIGTERM, then SIGKILL after a grace period) and remove its config. */
export async function stop(ns: string): Promise<RunStatus> {
  const s = session(ns);
  const proc = s.proc;
  if (proc) {
    proc.kill("SIGTERM");
    const force = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // already gone
      }
    }, STOP_GRACE_MS);
    try {
      await s.exit;
    } finally {
      clearTimeout(force);
    }
  }
  s.proc = null;
  s.exit = null;
  if (s.configPath) {
    await rm(s.configPath, { force: true }).catch(() => {});
    s.configPath = null;
  }
  return statusOf(s);
}

/** Replay the namespace's current log buffer (oldest first). */
export function snapshot(ns: string): LogLine[] {
  return [...session(ns).logs];
}

/** Subscribe to the namespace's new log lines; returns an unsubscribe function. */
export function subscribe(ns: string, fn: Listener): () => void {
  const s = session(ns);
  s.listeners.add(fn);
  return () => s.listeners.delete(fn);
}

/** Best-effort: don't leave any runner orphaned when the editor process exits. */
function ensureKillOnExit(): void {
  if (store.__octoRunKillHook) return;
  store.__octoRunKillHook = true;
  process.once("exit", () => {
    for (const s of sessions().values()) {
      if (s.proc) {
        try {
          s.proc.kill("SIGKILL");
        } catch {
          // nothing we can do on the way out
        }
      }
    }
  });
}
