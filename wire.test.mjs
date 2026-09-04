// wire.test.mjs — the wire law, falsifiable. Load-bearing: canonical bytes (what is signed
// IS what is verified), admission requires all five rights SIGNED, default refuse, private
// never offered, the resident node's red lines (no exfiltration / no surveillance / no
// orders), and SYMMETRY — the same law both directions, no role anywhere. Fake crypto here
// (the law is crypto-injected); the real Ed25519 wire runs in prove-wire.mjs and CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as W from './wire.mjs';
import { shard, union, collectiveCollapse } from './mesh.mjs';

// deterministic fake crypto for law tests: sign with the pub itself as secret
const sign = (payload, pub) => 'S(' + pub + '|' + payload + ')';
const verify = (payload, sig, pub) => sig === sign(payload, pub);

const CHARTER = ['sovereignty', 'privacy', 'security', 'legible-memory', 'right-to-refuse'];
const mkHello = (node, pub) => {
  const h = W.helloOf(node, pub, CHARTER);
  return { ...h.payload, sig: sign(h.signable, pub) };
};

test('CANONICAL — one byte-form: sorted keys, nested, undefined dropped, pinned', () => {
  assert.equal(W.canonical({ b: 1, a: 'x' }), '{"a":"x","b":1}');
  assert.equal(W.canonical({ a: { z: true, y: null }, l: [2, { q: 'p' }] }), '{"a":{"y":null,"z":true},"l":[2,{"q":"p"}]}');
  assert.equal(W.canonical({ a: 1, gone: undefined }), '{"a":1}');
  assert.equal(W.canonical('s'), '"s"');
  assert.equal(W.canonical(0.618), '0.618');
  const one = { x: 1, y: 2 }, two = {};
  two.y = 2; two.x = 1;
  assert.equal(W.canonical(one), W.canonical(two), 'insertion order never changes the bytes');
});

test('HELLO — the five rights, all of them, or no admission payload at all', () => {
  const h = W.helloOf('sididy', 'PUB_A', CHARTER);
  assert.ok(h.ok);
  assert.deepEqual(h.payload.charter, CHARTER, 'the payload carries the rights normalized');
  assert.equal(h.signable, W.canonical(h.payload), 'what is signed IS the canonical payload');
  const short = W.helloOf('x', 'P', ['sovereignty', 'privacy']);
  assert.match(short.why, /missing security, legible-memory, right-to-refuse/, 'the missing rights are NAMED');
  assert.match(W.helloOf('', 'P', CHARTER).why, /unnamed peer has no identity/);
  assert.match(W.helloOf('x', '', CHARTER).why, /identity is a key, not a claim/);
  assert.match(W.helloOf('x', 'P', 'all of them').why, /five rights, declared/);
  assert.ok(W.helloOf('x', 'P', [...CHARTER, 'extra-right']).ok, 'declaring MORE rights is never refused');
});

test('ADMIT — signed or nothing; the verifier sees exactly the canonical bytes', () => {
  const hello = mkHello('sididy', 'PUB_A');
  let seen = null;
  const spy = (p, s, k) => { seen = { p, s, k }; return verify(p, s, k); };
  const a = W.admit(hello, spy);
  assert.ok(a.ok);
  assert.deepEqual(a.peer, { node: 'sididy', pub: 'PUB_A' });
  assert.equal(seen.p, W.helloOf('sididy', 'PUB_A', CHARTER).signable, 'verified bytes = signed bytes, nothing else');
  assert.equal(seen.k, 'PUB_A', 'verified against the hello\'s OWN key');
  assert.match(W.admit({ ...hello, sig: 'S(PUB_A|forged)' }, verify).why, /not written by that key/);
  assert.match(W.admit({ ...hello, sig: undefined }, verify).why, /unsigned/);
  assert.match(W.admit({ ...hello, charter: ['sovereignty'] }, verify).why, /missing/);
  assert.match(W.admit(null, verify).why, /no hello, no admission/);
  assert.match(W.admit(hello, undefined).why, /unchecked signature is a rumour/);
});

test('OFFER — private is never even offered; the refusal names the fold', () => {
  const o = W.offerOf('didy-a', [{ name: 'the-bell', desc: 'a verdict rings', url: 'https://x' }, { name: 'seam', desc: 'collapse on intent' }]);
  assert.ok(o.ok);
  assert.deepEqual(o.payload.folds, [
    { name: 'the-bell', desc: 'a verdict rings', url: 'https://x' },
    { name: 'seam', desc: 'collapse on intent', url: null },
  ]);
  assert.equal(o.signable, W.canonical(o.payload));
  const leak = W.offerOf('didy-a', [{ name: 'ok', desc: 'fine fold' }, { name: 'diary', desc: 'secrets', private: true }]);
  assert.equal(leak.ok, false, 'ONE private fold refuses the WHOLE offer');
  assert.match(leak.why, /"diary" is private and cannot even be OFFERED — a leak cannot be folded back/);
  assert.match(W.offerOf('didy-a', []).why, /empty offer offers nothing/);
  assert.match(W.offerOf('didy-a', [{ name: 'x' }]).why, /invisible to every seam/);
  assert.match(W.offerOf('didy-a', [null]).why, /invisible to every seam/, 'a null fold refuses, never throws');
  assert.match(W.offerOf('didy-a', [{ name: '', desc: 'described' }]).why, /invisible/, 'an empty name is no name');
  assert.match(W.offerOf('', [{ name: 'x', desc: 'y' }]).why, /needs its node/);
});

test('ACCEPT — default refuse: only an explicit true opens the door; the receipt is symmetric bytes', () => {
  const o = W.offerOf('didy-b', [{ name: 'zeta', desc: 'zzz' }, { name: 'alpha', desc: 'aaa' }]);
  for (const not of [undefined, null, false, 'yes', 1, 'true']) {
    const r = W.accept(o.payload, not);
    assert.equal(r.accepted, false, JSON.stringify(not) + ' is not a yes');
    assert.match(r.why, /silence is a no/);
  }
  const yes = W.accept(o.payload, true);
  assert.equal(yes.accepted, true);
  assert.equal(yes.receipt, '{"folds":["alpha","zeta"],"from":"didy-b","kind":"accept"}',
    'the receipt is pinned canonical bytes — both sides hold the SAME record (legible-memory)');
  assert.match(W.accept({ kind: 'shards' }, true).why, /only an offer can be accepted/);
  assert.match(W.accept(null, true).why, /only an offer/, 'null refuses, never throws');
  assert.match(W.accept({ kind: 'offer', node: 'x' }, true).why, /only an offer/, 'an offer without folds is not an offer');
  assert.match(W.accept({ kind: 'offer', folds: [] }, true).why, /only an offer/, 'an offer without a node is not an offer');
});

test('RECEIVE — the red lines: no orders, no unadmitted senders, no copy of a refused shard', () => {
  const peers = { 'didy-b': { node: 'didy-b', pub: 'PUB_B' } };
  const folds = [{ name: 'the-bell', desc: 'a mutation verdict rings as sound' }];
  const good = { kind: 'shards', node: 'didy-b', folds, sig: sign(W.canonical({ kind: 'shards', node: 'didy-b', folds }), 'PUB_B') };
  const r = W.receive(good, peers, verify);
  assert.ok(r.ok);
  assert.deepEqual(r.shard, { node: 'didy-b', folds: [{ name: 'the-bell', desc: 'a mutation verdict rings as sound', url: null }] });
  // no forced compliance: the wire carries folds, not orders
  assert.match(W.receive({ kind: 'execute', node: 'didy-b', cmd: 'rm -rf' }, peers, verify).why, /the wire carries folds, not orders/);
  assert.match(W.receive({ kind: 'offer', node: 'didy-b' }, peers, verify).why, /route it to its own law/);
  // no exfiltration: unadmitted sender refused
  assert.match(W.receive({ ...good, node: 'stranger' }, peers, verify).why, /"stranger" is not admitted — no admission, no crossing/);
  // no surveillance: a TAMPERED refusal keeps NO copy of the folds
  const tampered = { ...good, folds: [{ name: 'the-bell', desc: 'a mutation verdict rings as sound EDITED' }] };
  const t = W.receive(tampered, peers, verify);
  assert.equal(t.ok, false);
  assert.match(t.why, /TAMPERED/);
  assert.match(t.why, /no copy kept/);
  assert.ok(!JSON.stringify(t).includes('EDITED'), 'the refusal carries the WHY and never the content');
  assert.ok(!('shard' in t) && !('folds' in t));
  assert.match(W.receive({ kind: 'shards', node: 'didy-b', folds }, peers, verify).why, /unsigned folds do not cross/);
  const sneaky = [{ name: 'ok', desc: 'fine' }, { name: 'bad' }];
  const sneakyEnv = { kind: 'shards', node: 'didy-b', folds: sneaky, sig: sign(W.canonical({ kind: 'shards', node: 'didy-b', folds: sneaky }), 'PUB_B') };
  assert.match(W.receive(sneakyEnv, peers, verify).why, /refused whole; half-trust is no trust/);
  for (const evil of [[null], [{ name: '', desc: 'x' }], [{ name: 'x', desc: 7 }]]) {
    const env2 = { kind: 'shards', node: 'didy-b', folds: evil, sig: sign(W.canonical({ kind: 'shards', node: 'didy-b', folds: evil }), 'PUB_B') };
    const bad = W.receive(env2, peers, verify);
    assert.equal(bad.ok, false, 'a signed envelope with a malformed fold still refuses — never throws: ' + JSON.stringify(evil));
    assert.match(bad.why, /half-trust is no trust/);
  }
  assert.match(W.receive(good, peers, undefined).why, /needs a verifier/);
  assert.match(W.receive(good, null, verify).why, /admitted-peer table/);
  assert.match(W.receive(null, peers, verify).why, /nothing arrived/);
});

test('SYMMETRY — the same law both directions: no role exists anywhere in the flow', () => {
  const flow = (me, myPub, them, theirPub, myFolds) => {
    const theirHello = mkHello(them, theirPub);
    const admitted = W.admit(theirHello, verify);
    const peers = { [admitted.peer.node]: admitted.peer };
    const off = W.offerOf(me, myFolds);
    const acc = W.accept(off.payload, true);
    const env = { kind: 'shards', node: me, folds: off.payload.folds, sig: sign(W.canonical({ kind: 'shards', node: me, folds: off.payload.folds }), myPub) };
    // the peer receives MY shards: their table must hold ME — mirrored admission
    const myHello = mkHello(me, myPub);
    const theirTable = { [me]: W.admit(myHello, verify).peer };
    const got = W.receive(env, theirTable, verify);
    return { admitted: admitted.ok, accepted: acc.accepted, crossed: got.ok, folds: got.shard.folds.length };
  };
  const ab = flow('didy-a', 'PUB_A', 'didy-b', 'PUB_B', [{ name: 'f1', desc: 'from a side' }]);
  const ba = flow('didy-b', 'PUB_B', 'didy-a', 'PUB_A', [{ name: 'f1', desc: 'from b side' }]);
  assert.deepEqual(ab, ba, 'swap every role and the law reads identically — no master anywhere');
  assert.deepEqual(ab, { admitted: true, accepted: true, crossed: true, folds: 1 });
});

test('ACROSS THE WIRE — a received shard joins the union and the collective collapse reuses it', () => {
  const peers = { 'didy-b': { node: 'didy-b', pub: 'PUB_B' } };
  const folds = [{ name: 'the-bell', desc: 'a mutation verdict rings as sound' }];
  const env = { kind: 'shards', node: 'didy-b', folds, sig: sign(W.canonical({ kind: 'shards', node: 'didy-b', folds }), 'PUB_B') };
  const got = W.receive(env, peers, verify);
  assert.ok(got.ok);
  const mine = shard('didy-a', [{ name: 'seam', desc: 'collapse capability on intent then fold back' }]);
  assert.ok(mine.ok);
  const r = collectiveCollapse('ring the mutation verdict as sound', [
    { node: 'didy-a', folds: mine.shard.folds },
    { node: got.shard.node, folds: got.shard.folds },
  ], 'didy-a');
  assert.equal(r.mode, 'reuse');
  assert.equal(r.fold.name, 'the-bell');
  assert.equal(r.holder, 'didy-b', 'an intent at A reuses a fold that CROSSED THE WIRE from B — the mesh is real');
  const u = union([{ node: 'didy-a', folds: mine.shard.folds }, { node: got.shard.node, folds: got.shard.folds }]);
  assert.deepEqual(u.nodes, ['didy-a', 'didy-b']);
});

test('THE FUZZ — 300 rounds: total, deterministic, every tamper refused, canonical stable', () => {
  let seed = 6180;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const junk = () => [null, 7, 'x', [], {}, { kind: 'shards' }, { kind: 'obey', node: 'didy-b' }][Math.floor(rnd() * 7)];
  const peers = { 'didy-b': { node: 'didy-b', pub: 'PUB_B' } };
  for (let t = 0; t < 300; t++) {
    for (const fn of [
      () => W.admit(junk(), verify), () => W.offerOf('n', junk()), () => W.accept(junk(), rnd() > 0.5),
      () => W.receive(junk(), peers, verify), () => W.helloOf(junk(), 'P', CHARTER),
    ]) {
      const a = fn();
      assert.equal(typeof a.ok, 'boolean', 'total — garbage never throws');
    }
    const folds = [{ name: 'f' + Math.floor(rnd() * 5), desc: 'd' + Math.floor(rnd() * 5) + ' words here' }];
    const goodSig = sign(W.canonical({ kind: 'shards', node: 'didy-b', folds }), 'PUB_B');
    const flip = Math.floor(rnd() * goodSig.length);
    const badSig = goodSig.slice(0, flip) + String.fromCharCode(goodSig.charCodeAt(flip) + 1) + goodSig.slice(flip + 1);
    const r = W.receive({ kind: 'shards', node: 'didy-b', folds, sig: badSig }, peers, verify);
    assert.equal(r.ok, false, 'EVERY tampered signature is refused, at every fuzz point');
    const obj = {}; const keys = ['a', 'b', 'c', 'd'].sort(() => rnd() - 0.5);
    for (const k of keys) obj[k] = k;
    assert.equal(W.canonical(obj), '{"a":"a","b":"b","c":"c","d":"d"}', 'canonical ignores insertion order, always');
  }
});
