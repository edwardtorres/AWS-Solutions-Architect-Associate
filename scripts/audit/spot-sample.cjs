// Seeded spot-check sample for Step 8: 86 key-dependent (G1/G2) and 86 other confirmed verdicts, about 5% of all confirmed.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const SEED = 20261022;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(SEED);
const ledgerDir = path.join(root, 'docs/reviews/step-8/ledger');
const batchDir = path.join(root, '.cache/audit/batches');
const claimById = new Map();
for (const f of fs.readdirSync(batchDir)) {
  const b = JSON.parse(fs.readFileSync(path.join(batchDir, f), 'utf8'));
  for (const c of (b.claims || b)) if (!claimById.has(c.id)) claimById.set(c.id, c);
}
const frame = { key: [], other: [] };
const frameCount = {};
for (const f of fs.readdirSync(ledgerDir).filter((x) => x.endsWith('.jsonl'))) {
  const g = f.replace('.jsonl', '');
  let total = 0;
  for (const l of fs.readFileSync(path.join(ledgerDir, f), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l);
    if (r.verdict !== 'confirmed') continue;
    total++;
    if (!claimById.has(r.id)) continue;
    (/^G[12]/.test(g) ? frame.key : frame.other).push({ group: g, id: r.id });
  }
  frameCount[g] = total;
}
const pick = (pool, n) => { const p = pool.slice(); const out = []; while (out.length < n && p.length) out.push(p.splice(Math.floor(rand() * p.length), 1)[0]); return out; };
const chosen = [...pick(frame.key, 86).map((x) => ({ ...x, kind: 'key' })), ...pick(frame.other, 86).map((x) => ({ ...x, kind: 'other' }))];
const batches = [];
for (let i = 0; i < chosen.length; i += 25) batches.push(chosen.slice(i, i + 25));
batches.forEach((b, i) => {
  const name = `spot-${String(i + 1).padStart(2, '0')}`;
  fs.writeFileSync(path.join(root, '.cache/audit/spot', name + '.json'), JSON.stringify({ id: name, claims: b.map((x) => ({ ...claimById.get(x.id), sampledFrom: x.group })) }, null, 1));
});
fs.writeFileSync(path.join(root, '.cache/audit/spot/sample.json'), JSON.stringify({ seed: SEED, frameConfirmedPerGroup: frameCount, frameWithClaimText: { key: frame.key.length, other: frame.other.length }, chosen }, null, 1));
console.log('frame confirmed per group', JSON.stringify(frameCount));
console.log('with claim text: key', frame.key.length, 'other', frame.other.length);
console.log('sample', chosen.length, 'key', chosen.filter((x) => x.kind === 'key').length, 'batches', batches.length);
