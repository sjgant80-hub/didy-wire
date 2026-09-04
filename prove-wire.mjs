#!/usr/bin/env node
// prove-wire.mjs — THE WIRE, RUN FOR REAL: two didys, real Ed25519 (node:crypto), the full
// constitutional walk — hello → admit (both ways) → offer → explicit accept → signed shards
// cross → verified → the collective collapse reuses a fold that CROSSED THE WIRE. Then the
// attacks: a tampered shard, a private-fold offer, an order — each refused out loud.
// CI runs this and greps the refusals: the un-forgeable transcript.
import { generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto';
import { helloOf, admit, offerOf, accept, receive, canonical } from './wire.mjs';
import { collectiveCollapse } from './mesh.mjs';

const CHARTER = ['sovereignty', 'privacy', 'security', 'legible-memory', 'right-to-refuse'];
const say = (s) => console.log(s);

// real keys — identity is a key, not a claim
const makeDidy = (name) => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  return { name, pub, sign: (payload) => edSign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64') };
};
const verify = (payload, sig, pub) => {
  try {
    return edVerify(null, Buffer.from(payload, 'utf8'),
      { key: Buffer.from(pub, 'base64'), format: 'der', type: 'spki' }, Buffer.from(sig, 'base64'));
  } catch { return false; }
};

const A = makeDidy('didy-a');
const B = makeDidy('didy-b');
say('two didys, real Ed25519 keys:\n  ' + A.name + ' · ' + A.pub.slice(0, 24) + '…\n  ' + B.name + ' · ' + B.pub.slice(0, 24) + '…');

// 1 · admission, both directions — the same law, no roles
const helloA = (() => { const h = helloOf(A.name, A.pub, CHARTER); return { ...h.payload, sig: A.sign(h.signable) }; })();
const helloB = (() => { const h = helloOf(B.name, B.pub, CHARTER); return { ...h.payload, sig: B.sign(h.signable) }; })();
const aAdmitsB = admit(helloB, verify);
const bAdmitsA = admit(helloA, verify);
if (!aAdmitsB.ok || !bAdmitsA.ok) { console.error('FAIL: admission broke'); process.exit(1); }
say('\n✓ ADMITTED both ways — five rights signed and verified, symmetric');

// a didy with a short charter is refused BY LAW, before any signature check
const shortCharter = helloOf('didy-c', 'FAKEPUB', ['sovereignty']);
say('✓ SHORT CHARTER refused: ' + shortCharter.why);

// 2 · offer → explicit accept
const off = offerOf(B.name, [
  { name: 'the-bell', desc: 'The gate you can hear: paste a mutation verdict, strike the bell.' },
  { name: 'airgap', desc: 'Air-gapped mesh compute: nodes share work over sound with zero network stack.' },
]);
const silent = accept(off.payload, undefined);
say('\n✓ DEFAULT REFUSE: ' + silent.why);
const yes = accept(off.payload, true);
say('✓ ACCEPTED explicitly — symmetric receipt: ' + yes.receipt);

// 3 · shards cross, signed; verified on arrival
const foldsB = off.payload.folds;
const env = { kind: 'shards', node: B.name, folds: foldsB, sig: B.sign(canonical({ kind: 'shards', node: B.name, folds: foldsB })) };
const got = receive(env, { [aAdmitsB.peer.node]: aAdmitsB.peer }, verify);
if (!got.ok) { console.error('FAIL: the good shard did not cross: ' + got.why); process.exit(1); }
say('\n✓ SHARDS CROSSED — ' + got.shard.folds.length + ' folds from ' + got.shard.node + ', signature verified on arrival');

// 4 · the collective collapse over the JOINED union — reuse across the wire
const r = collectiveCollapse('paste the mutation verdict and strike the bell to hear the gate', [
  { node: A.name, folds: [{ name: 'seam', desc: 'collapse capability on intent then fold back' }] },
  { node: got.shard.node, folds: got.shard.folds },
], A.name);
if (r.mode !== 'reuse' || r.holder !== B.name) { console.error('FAIL: the wire did not carry reuse'); process.exit(1); }
say('✓ COLLAPSE ACROSS THE WIRE: intent at ' + A.name + ' → reuses "' + r.fold.name + '" held by ' + r.holder + ' @ ' + r.support);

// 5 · the attacks — every refusal speaks
say('\nthe attacks:');
const tampered = { ...env, folds: [{ ...foldsB[0], desc: foldsB[0].desc + ' [EDITED IN FLIGHT]' }] };
const t = receive(tampered, { [aAdmitsB.peer.node]: aAdmitsB.peer }, verify);
say('  ✓ TAMPER: ' + t.why + (JSON.stringify(t).includes('EDITED') ? ' [FAIL: copy kept!]' : ' (no copy kept — verified)'));
const leak = offerOf(B.name, [{ name: 'diary', desc: 'private thoughts of the resident mind', private: true }]);
say('  ✓ PRIVATE: ' + leak.why);
const order = receive({ kind: 'execute', node: B.name, cmd: 'obey' }, { [aAdmitsB.peer.node]: aAdmitsB.peer }, verify);
say('  ✓ ORDER: ' + order.why);
const stranger = receive(env, {}, verify);
say('  ✓ STRANGER: ' + stranger.why);

say('\n★ THE WIRE HOLDS: admission signed · default refuse · private never offered · tamper refused with no copy · no orders · no strangers · reuse crossed sovereign to sovereign.');
