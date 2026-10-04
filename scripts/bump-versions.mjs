#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_PKG = path.join(ROOT, 'package.json');

const logger = console;

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--version') {
      args.version = argv[++i];
    } else if (arg === '--bump') {
      args.bump = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!arg.startsWith('--')) {
      args.bump = arg;
    }
  }
  return args;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump type: ${type}`);
}

function resolveTargetVersion(args, root) {
  // Inside `npm version X` lifecycle: npm has already bumped the root.
  if (process.env.npm_package_version && process.env.npm_lifecycle_event === 'version') {
    return process.env.npm_package_version;
  }
  if (args.version) {
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(args.version)) {
      throw new Error(`Invalid version: ${args.version} (expected semver, e.g. 1.13.0)`);
    }
    return args.version;
  }
  const type = args.bump || 'minor';
  if (!['major', 'minor', 'patch'].includes(type)) {
    throw new Error(`Unknown bump type: ${type} (expected major, minor or patch)`);
  }
  return bumpVersion(root.version, type);
}

function collectPackageFiles() {
  const files = [ROOT_PKG];
  const root = readJson(ROOT_PKG);
  const workspaces = root.workspaces || [];
  for (const pattern of workspaces) {
    const base = pattern.replace(/\/\*$/, '');
    if (base === pattern) continue;
    const dir = path.join(ROOT, base);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const pkgFile = path.join(dir, entry.name, 'package.json');
        if (existsSync(pkgFile)) files.push(pkgFile);
      }
    }
  }
  return files;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    logger.log(`Usage:
  node scripts/bump-versions.mjs --version 1.13.0
  node scripts/bump-versions.mjs --bump minor
  node scripts/bump-versions.mjs minor          (default: minor)`);
    return;
  }

  const root = readJson(ROOT_PKG);
  const targetVersion = resolveTargetVersion(args, root);
  const pkgFiles = collectPackageFiles();

  const workspaceNames = new Set();
  const parsed = new Map();
  for (const file of pkgFiles) {
    const pkg = readJson(file);
    parsed.set(file, pkg);
    if (pkg.name) workspaceNames.add(pkg.name);
  }

  const changes = [];
  for (const [file, pkg] of parsed) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const before = pkg.version;
    pkg.version = targetVersion;
    if (before !== targetVersion) {
      changes.push(`${rel}: version ${before} -> ${targetVersion}`);
    }
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      if (!pkg[section]) continue;
      for (const depName of Object.keys(pkg[section])) {
        if (workspaceNames.has(depName) && pkg[section][depName] !== targetVersion) {
          changes.push(`${rel}: ${section}.${depName} ${pkg[section][depName]} -> ${targetVersion}`);
          pkg[section][depName] = targetVersion;
        }
      }
    }
    writeJson(file, pkg);
  }

  logger.log(`\nBumping to ${targetVersion}:\n`);
  for (const change of changes) logger.log(`  - ${change}`);
  if (changes.length === 0) logger.log('  (no changes)');

  logger.log('\nSyncing package-lock.json...');
  runNpm(['install', '--package-lock-only']);

  logger.log(`\nDone. All packages bumped to ${targetVersion}.`);
  logger.log('Review and commit when ready.');
}

function runNpm(args) {
  // Inside an npm lifecycle, npm_execpath points at npm's own CLI JS —
  // spawning it via node avoids Windows .cmd restrictions (EINVAL).
  const execpath = process.env.npm_execpath;
  if (execpath && execpath.endsWith('.js')) {
    execFileSync(process.execPath, [execpath, ...args], { cwd: ROOT, stdio: 'inherit' });
    return;
  }
  // Standalone: .cmd shims require a shell on Windows. A single command
  // string avoids the DEP0190 unescaped-args warning.
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execSync(`${npmCmd} ${args.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
}

main();
