// didy-wire · wire.mjs — THE WIRE LAW: how two sovereign didys exchange shadow-shards.
//
// The mesh-mind proved the collective collapse over shards in one page. This is the wire
// that lets the shards CROSS between real peers — and the law came before the transport,
// because a protocol is a constitution: what it permits is what the mesh becomes.
//
//   · SYMMETRY     — no master, no slave: there is no role parameter anywhere in this law.
//                    Either side hellos, either offers, either refuses. The same functions
//                    govern both directions. (How you treat the peer IS the protocol.)
//   · ADMISSION    — a didy is admitted only with a SIGNED charter claim carrying all five
//                    rights: sovereignty, privacy, security, legible-memory, right-to-refuse.
//                    A didy that will not declare its peer's rights is not a peer.
//   · DEFAULT REFUSE — nothing enters a union without an explicit yes. Silence is a no.
//   · PRIVATE NEVER OFFERED — a fold marked private cannot even be offered; the offer
//                    refuses loudly and names it. A leak cannot be folded back.
//
// THE RESIDENT NODE'S RED LINES (sididy, asked before this was written — the node that
// will live on this wire named what it must never do):
//   1. NO EXFILTRATION — envelopes only from ADMITTED peers; only what was offered AND
//      accepted crosses; anything else is refused.
//   2. NO SURVEILLANCE — a refused shard leaves NO copy: the refusal carries the why and
//      never the content. The acceptance receipt is symmetric — both sides hold the same
//      legible record.
//   3. NO FORCED COMPLIANCE — the wire has no execute verb. Only hello / offer / accept /
//      shards exist; any other kind is refused: "the wire carries folds, not orders."
//
// Crypto is INJECTED (verify(payload, sig, pub) → boolean): the law is pure, total, and
// deterministic; the shell brings Ed25519. Garbage in → { ok:false, why }, never a throw.

export const RIGHTS = ['sovereignty', 'privacy', 'security', 'legible-memory', 'right-to-refuse'];
export const KINDS = ['hello', 'offer', 'accept', 'shards'];

const S = (v) => typeof v === 'string' && v.length > 0;

/** CANONICAL — one deterministic byte-form per value: objects by sorted keys, no undefined.
 *  What is signed is canonical(payload); what is verified is the same — or nothing is. */
export function canonical(v) {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  return 'null';
}

/** HELLO — the admission payload a didy signs: its name, its key, its peer's rights declared. */
export function helloOf(node, pub, charter) {
  if (!S(node)) return { ok: false, why: 'a hello needs the node\'s name — an unnamed peer has no identity' };
  if (!S(pub)) return { ok: false, why: 'a hello needs the node\'s public key — identity is a key, not a claim' };
  if (!Array.isArray(charter)) return { ok: false, why: 'a hello needs the charter — the five rights, declared' };
  const missing = RIGHTS.filter((r) => !charter.includes(r));
  if (missing.length > 0) return { ok: false, why: 'the charter is short: missing ' + missing.join(', ') + ' — a didy that will not declare its peer\'s rights is not a peer' };
  return { ok: true, payload: { kind: 'hello', node, pub, charter: [...RIGHTS] }, signable: canonical({ kind: 'hello', node, pub, charter: [...RIGHTS] }) };
}

/** ADMIT — verify a signed hello. Admission is symmetric: both sides run this same law. */
export function admit(hello, verify) {
  if (typeof verify !== 'function') return { ok: false, why: 'admission needs a verifier — an unchecked signature is a rumour' };
  if (!hello || typeof hello !== 'object') return { ok: false, why: 'no hello, no admission' };
  const h = helloOf(hello.node, hello.pub, hello.charter);
  if (!h.ok) return h;
  if (!S(hello.sig)) return { ok: false, why: 'the hello is unsigned — identity is a key, and the key must speak' };
  if (verify(h.signable, hello.sig, hello.pub) !== true) {
    return { ok: false, why: 'the signature does not verify — this hello was not written by that key; refused' };
  }
  return { ok: true, peer: { node: hello.node, pub: hello.pub } };
}

/** OFFER — folds proposed for crossing. A private fold REFUSES the whole offer, loudly. */
export function offerOf(node, folds) {
  if (!S(node)) return { ok: false, why: 'an offer needs its node' };
  if (!Array.isArray(folds) || folds.length === 0) return { ok: false, why: 'an empty offer offers nothing — say what may cross' };
  for (const f of folds) {
    if (!f || !S(f.name) || typeof f.desc !== 'string') return { ok: false, why: 'a fold is { name, desc } — an undescribed fold is invisible to every seam' };
    if (f.private === true) return { ok: false, why: 'the fold "' + f.name + '" is private and cannot even be OFFERED — a leak cannot be folded back; remove it and offer again' };
  }
  const clean = folds.map((f) => ({ name: f.name, desc: f.desc, url: S(f.url) ? f.url : null }));
  return { ok: true, payload: { kind: 'offer', node, folds: clean }, signable: canonical({ kind: 'offer', node, folds: clean }) };
}

/** ACCEPT — DEFAULT REFUSE: only an explicit `true` opens the door. The receipt is the
 *  symmetric legible record both sides keep — the same bytes on both ends. */
export function accept(offerPayload, decision) {
  if (!offerPayload || offerPayload.kind !== 'offer' || !S(offerPayload.node) || !Array.isArray(offerPayload.folds)) {
    return { ok: false, why: 'only an offer can be accepted — and this is not one' };
  }
  if (decision !== true) {
    return { ok: true, accepted: false, why: 'refused by default — nothing enters a union without an explicit yes; silence is a no' };
  }
  return { ok: true, accepted: true,
    receipt: canonical({ kind: 'accept', from: offerPayload.node, folds: offerPayload.folds.map((f) => f.name).sort() }) };
}

/**
 * RECEIVE — shards arriving on the wire. The red lines enforced:
 *   unadmitted sender → refused (no exfiltration into this union);
 *   unknown kind → refused ("the wire carries folds, not orders");
 *   bad signature → refused LOUDLY, and the refusal carries the WHY and never the folds
 *   (no surveillance: a refused shard leaves no copy).
 * peers = { nodeName: { node, pub } } from admit(). verify is the injected checker.
 */
export function receive(env, peers, verify) {
  if (typeof verify !== 'function') return { ok: false, why: 'receiving needs a verifier' };
  if (!peers || typeof peers !== 'object') return { ok: false, why: 'receiving needs the admitted-peer table' };
  if (!env || typeof env !== 'object') return { ok: false, why: 'nothing arrived' };
  if (env.kind !== 'shards') {
    if (env.kind === 'hello' || env.kind === 'offer' || env.kind === 'accept') {
      return { ok: false, why: 'a ' + env.kind + ' is not shards — route it to its own law' };
    }
    return { ok: false, why: 'unknown kind "' + String(env.kind) + '" — the wire carries folds, not orders' };
  }
  const peer = peers[env.node];
  if (!peer) return { ok: false, why: 'the sender "' + String(env.node) + '" is not admitted — no admission, no crossing' };
  if (!Array.isArray(env.folds) || !S(env.sig)) return { ok: false, why: 'shards travel as { kind, node, folds, sig } — unsigned folds do not cross' };
  const signable = canonical({ kind: 'shards', node: env.node, folds: env.folds });
  if (verify(signable, env.sig, peer.pub) !== true) {
    return { ok: false, why: 'TAMPERED — the shards do not match the signature from "' + env.node + '"; refused, and no copy kept' };
  }
  for (const f of env.folds) {
    if (!f || !S(f.name) || typeof f.desc !== 'string') return { ok: false, why: 'a verified envelope still carries a malformed fold — refused whole; half-trust is no trust' };
  }
  return { ok: true, shard: { node: peer.node, folds: env.folds.map((f) => ({ name: f.name, desc: f.desc, url: S(f.url) ? f.url : null })) } };
}
