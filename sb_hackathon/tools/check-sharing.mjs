import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Offline, read-only audit. Never print matched values or source excerpts.
const git = (...args) => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const root = git('rev-parse', '--show-toplevel').toString().trim();
process.chdir(root);
const list = (...args) => git(...args).toString().split('\0').filter(Boolean);
const findings = new Set();
const report = (scope, file, kind) => findings.add(JSON.stringify({ scope, file, kind }));
const privateValues = new Set();
const localName = path.basename(process.env.USERPROFILE || process.env.HOME || '');
// Compare every locally configured secret against both current files and history.
for (const file of fs.readdirSync(root).filter(name => /^\.env(?:\.|$)/.test(name) && name !== '.env.example')) {
  if (!fs.statSync(file).isFile()) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !/(KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL)/.test(match[1])) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value.length >= 12) privateValues.add(value);
  }
}
const patterns = [
  ['OpenAI-style secret', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ['Supabase secret', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
  ['database password URL', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s@]+@/i],
  ['personal home path', /(?:[A-Z]:[\\/]Users[\\/](?!Public[\\/]|<|\{)[^\s\\/]+|(?<![\w/])\/(?:Users|home)\/(?!<|\{)[^\s/]+)/i],
];
function scan(scope, file, bytes) {
  for (const value of privateValues) {
    if (bytes.includes(Buffer.from(value))) report(scope, file, 'matches local secret (redacted)');
  }
  const content = bytes.toString('utf8');
  if (localName.length >= 5 && content.toLowerCase().includes(localName.toLowerCase())) report(scope, file, 'matches local account name (redacted)');
  for (const [kind, pattern] of patterns) if (pattern.test(content)) report(scope, file, kind);
  for (const token of content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try {
      if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') {
        report(scope, file, 'Supabase service-role JWT');
      }
    } catch { /* Not a JWT. */ }
  }
}
const candidates = [...new Set(list('ls-files', '-z', '--cached', '--others', '--exclude-standard'))];
for (const file of candidates) {
  if (fs.existsSync(file) && fs.lstatSync(file).isFile()) scan('working tree', file, fs.readFileSync(file));
}
for (const file of list('ls-files', '-ci', '--exclude-standard', '-z')) report('index', file, 'ignored but still tracked');
const commits = git('rev-list', '--all').toString().trim().split('\n').filter(Boolean);
const seen = new Set();
for (const commit of commits) {
  // Commit messages are published too; author identity is separately reported below.
  scan('history', `${commit.slice(0, 8)}:commit-metadata`, git('show', '-s', '--format=%an%n%cn%n%B', commit));
  for (const entry of list('ls-tree', '-r', '-z', commit)) {
    const match = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s);
    if (!match) continue;
    const [, oid, file] = match;
    if (/(^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith('.env.example')) report('history', file, 'environment file committed');
    if (seen.has(oid)) continue;
    seen.add(oid);
    scan('history', `${commit.slice(0, 8)}:${file}`, git('cat-file', 'blob', oid));
  }
}
// The index can differ from both the working tree and existing commits.
for (const entry of list('ls-files', '--stage', '-z')) {
  const match = entry.match(/^\d+ ([0-9a-f]+) \d\t(.+)$/s);
  if (match) scan('index', match[2], git('cat-file', 'blob', match[1]));
}
let nonPrivateEmail = false;
for (const line of git('log', '--all', '--format=%ae%n%ce').toString().split('\n')) {
  if (line.trim() && !/@users\.noreply\.github\.com$/.test(line.trim())) nonPrivateEmail = true;
}
console.log(`Scanned ${candidates.length} shareable files, index, ${commits.length} local commit(s), ${seen.size} historical blob(s).`);
console.log(`Compared ${privateValues.size} locally configured secret(s); values are never printed.`);
console.log(`Commit email privacy: ${nonPrivateEmail ? 'REVIEW: history contains a non-GitHub-noreply email (redacted)' : 'OK'}`);
for (const item of findings) console.log(item);
console.log(findings.size ? `FAIL: ${findings.size} finding(s); review before sharing.` : 'PASS: no matches in the checks above.');
console.log('Scope: local Git refs only; not a guarantee against all personal data or prior remote exposure. Images and author names need manual review. No network or paid API calls.');
if (findings.size || nonPrivateEmail) process.exitCode = 1;
