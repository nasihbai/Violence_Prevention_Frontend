/**
 * Spawns the Flask backend using the venv Python.
 * Called by `pnpm dev:all` via concurrently.
 * Uses .cjs so Node treats it as CommonJS regardless of package.json "type":"module".
 */
const { spawn } = require('child_process');
const path = require('path');

const beRoot  = path.resolve(__dirname, '..', '..', 'FYP_Violence_Prevention_backend');
const python  = path.join(beRoot, 'venv', 'Scripts', 'python.exe');
const script  = path.join(beRoot, 'run_detection.py');

const proc = spawn(python, [script, '--web'], {
  cwd: beRoot,
  stdio: 'inherit',
  shell: false,
});

proc.on('error', err => {
  console.error('[BE] Failed to start:', err.message);
  console.error('[BE] Expected venv at:', python);
  process.exit(1);
});

proc.on('exit', code => process.exit(code ?? 0));
