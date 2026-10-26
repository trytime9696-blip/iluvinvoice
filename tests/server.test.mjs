import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = 40000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
let child, dataDir;

test.before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'iluv-test-'));
  child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, SESSION_SECRET: 'test-secret-'.padEnd(48, 'x') }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`${base}/api/me`); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('server did not start');
});
test.after(async () => { child.kill(); await rm(dataDir, { recursive: true, force: true }); });

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];
async function account(tag) {
  const r = await post('/api/signup', { name: `User ${tag}`, email: `${tag}-${Date.now()}@test.local`, password: 'correct-horse-9' });
  assert.equal(r.status, 201);
  return cookieOf(r);
}
const water = { customers: [{ id: 'C1', name: 'Sharma Traders', rate: 25 }], deliveries: { '2026-10-01': { C1: { supplied: true, qty: 2 } } } };

test('User A data is never visible to User B', async () => {
  const a = await account('a'), b = await account('b');
  const put = await fetch(`${base}/api/water-data`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: a }, body: JSON.stringify(water) });
  assert.equal(put.status, 200);
  const mine = await (await fetch(`${base}/api/water-data`, { headers: { Cookie: a } })).json();
  assert.equal(mine.data.customers[0].name, 'Sharma Traders');
  const theirs = await (await fetch(`${base}/api/water-data`, { headers: { Cookie: b } })).json();
  assert.equal(theirs.data, null);
});
test('requests without or with a forged session are rejected', async () => {
  assert.equal((await fetch(`${base}/api/water-data`)).status, 401);
  const forged = Buffer.from(JSON.stringify({ id: 'USR-1', exp: Date.now() + 1e9 })).toString('base64url') + '.abc';
  assert.equal((await fetch(`${base}/api/water-data`, { headers: { Cookie: `iluv_session=${forged}` } })).status, 401);
  const r = await fetch(`${base}/app`, { redirect: 'manual' });
  assert.equal(r.status, 302);
});
test('session cookie is HttpOnly, Secure and SameSite', async () => {
  const r = await post('/api/signup', { name: 'Cookie Check', email: `c-${Date.now()}@test.local`, password: 'correct-horse-9' });
  const c = r.headers.get('set-cookie');
  assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/);
});
test('cross-site and non-JSON state changes are blocked (CSRF)', async () => {
  const a = await account('csrf');
  const evil = await fetch(`${base}/api/water-data`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: a, Origin: 'https://evil.example' }, body: JSON.stringify(water) });
  assert.equal(evil.status, 403);
  const form = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=x&password=y' });
  assert.equal(form.status, 403);
});
test('login is rate limited per email', async () => {
  const email = `rl-${Date.now()}@test.local`;
  let last;
  for (let i = 0; i < 12; i++) last = await post('/api/login', { email, password: 'wrong-password' });
  assert.equal(last.status, 429);
});
test('passwords are stored hashed, never in plain text', async () => {
  const { readFile } = await import('node:fs/promises');
  const users = await readFile(path.join(dataDir, 'users.json'), 'utf8');
  assert.ok(!users.includes('correct-horse-9'));
});
test('malformed water data is rejected', async () => {
  const a = await account('bad');
  const r = await fetch(`${base}/api/water-data`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: a }, body: JSON.stringify({ customers: 'nope' }) });
  assert.equal(r.status, 400);
});
test('path traversal and private files are not served', async () => {
  for (const p of ['/server.mjs', '/data/users.json', '/.env', '/%2e%2e/etc/passwd', '/assets/../server.mjs', '/package.json']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
});
test('security headers are present on pages', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.headers.get('strict-transport-security'));
});
test('SEO files are served', async () => {
  assert.match(await (await fetch(`${base}/sitemap.xml`)).text(), /ro-water-plant-billing/);
  assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Sitemap:/);
});
