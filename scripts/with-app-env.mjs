#!/usr/bin/env node
/**
 * Run a command with .grok/app-env.json merged into its environment.
 * Windows-safe: resolves local npm binaries (e.g. vite.cmd) explicitly.
 */
import { spawn } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ENV_REL_PATH = ".grok/app-env.json";
const VITE_PREFIX = "VITE_";

export function parseAppEnv(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return {}; }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const env = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith(VITE_PREFIX) && typeof value === "string") env[key] = value;
  }
  return env;
}

export function readAppEnv(root) {
  try { return parseAppEnv(readFileSync(join(root, APP_ENV_REL_PATH), "utf8")); }
  catch { return {}; }
}

export function mergeAppEnv(appEnv, processEnv) { return { ...appEnv, ...processEnv }; }

export function exitStatusFromChild(code, signal) {
  if (signal) {
    const signo = osConstants.signals[signal];
    return 128 + (typeof signo === "number" ? signo : 1);
  }
  return code ?? 1;
}

export function projectRoot() { return dirname(dirname(fileURLToPath(import.meta.url))); }

export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try { return realpathSync(entry) === fileURLToPath(moduleUrl); }
  catch { return false; }
}

function resolveCommand(command, root) {
  if (process.platform !== "win32") return { command, shell: false };
  // npm exposes package executables in node_modules/.bin. Use the .cmd shim
  // explicitly and run it through cmd.exe; this avoids ENOENT/EINVAL on Windows.
  if (!command.includes("/") && !command.includes("\\") && !extname(command)) {
    const localCmd = join(root, "node_modules", ".bin", `${command}.cmd`);
    return { command: localCmd, shell: true };
  }
  return { command, shell: true };
}

function main(argv) {
  const [command, ...args] = argv;
  if (!command) {
    console.error("usage: node scripts/with-app-env.mjs <command> [args…]");
    process.exit(2);
  }

  const root = projectRoot();
  const env = mergeAppEnv(readAppEnv(root), process.env);
  const resolved = resolveCommand(command, root);

  const child = spawn(resolved.command, args, {
    stdio: "inherit",
    env,
    cwd: root,
    shell: resolved.shell,
    windowsHide: false,
  });

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      try { child.kill(signal); } catch {}
    });
  }

  child.on("error", (err) => {
    console.error(`[with-app-env] failed to run ${command}:`, err?.message || err);
    process.exit(127);
  });

  child.on("exit", (code, signal) => process.exit(exitStatusFromChild(code, signal)));
}

if (isMainModule(import.meta.url)) main(process.argv.slice(2));
