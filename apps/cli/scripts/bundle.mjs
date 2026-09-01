import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

// The sandbox worker must stay a separate file: it is loaded by new Worker()
// and cannot be inlined into the entry bundle.
await build({
  entryPoints: ['requesto-engine/sandbox-worker'],
  outfile: 'dist/sandbox-worker.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
});

// Single-file CLI bundle with all workspace dependencies (engine, backend,
// fastify) inlined. Node builtins stay external. The banner gives bundled
// CommonJS modules a real `require` so dynamic requires of node builtins
// (e.g. avvio requiring node:events) keep working in ESM output.
await build({
  entryPoints: ['src/bin.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);`,
  },
});

console.log('Bundled dist/index.mjs and dist/sandbox-worker.js');
