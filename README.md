# didy-wire

**LIVE: https://sjgant80-hub.github.io/didy-wire/**

The wire law for sovereign AI peers: how two didys exchange shadow-shards without either
becoming the other's servant. The law came before the transport, because a protocol is a
constitution — what it permits is what the mesh becomes.

## The law — gated 43/43, zero baselines

- **SYMMETRY** — no master, no slave: there is no role parameter anywhere. Either side
  hellos, offers, refuses. Tested by swapping every role and asserting identical behavior.
- **ADMISSION** — a peer is admitted only with a **signed charter** carrying all five
  rights: sovereignty, privacy, security, legible-memory, right-to-refuse. The missing
  right is named in the refusal.
- **DEFAULT REFUSE** — nothing enters a union without an explicit `true`. Silence is a no.
  The acceptance receipt is canonical bytes — identical on both ends.
- **PRIVATE NEVER OFFERED** — one private fold refuses a whole offer, loudly.

## The resident node's red lines

The didy that will live on this wire was asked what it must never do — *before* the law
was written. Its three answers became refusal tests:

1. **No exfiltration** — envelopes only from admitted peers; only what was offered AND
   accepted crosses.
2. **No surveillance** — a refused shard leaves **no copy**: the refusal carries the why,
   never the content.
3. **No forced compliance** — the wire has no execute verb. Only hello / offer / accept /
   shards exist. Anything else: *"the wire carries folds, not orders."*

## Proven with real crypto

`prove-wire.mjs` runs in CI with real Ed25519 (`node:crypto`): full handshake both ways,
default refuse, explicit accept, signed shards crossing, tamper refused with no copy, and
the [mesh-mind](https://sjgant80-hub.github.io/mesh-mind/) collective collapse **reusing a
fold that crossed the wire** — an intent at didy-a answered by a fold held at didy-b.

```bash
node --test wire.test.mjs
node prove-wire.mjs
```

## Use it

Transport-agnostic and crypto-injected — bring Ed25519 or WebCrypto, and any wire that
moves signed bytes (WebRTC, sound, sneakernet).

```js
import { helloOf, admit, offerOf, accept, receive } from './wire.mjs';
```

## Limits, stated plainly

The live page runs both didys in one document — a demo of the law; real transport is
yours. No discovery, no NAT-punching, no telemetry — the law only, smaller than it looks,
on purpose.

MIT. Built on the Konomi architecture, created by Thomas Frumkin. Composes
[mesh-mind](https://github.com/sjgant80-hub/mesh-mind) and the
[end-of-software](https://github.com/sjgant80-hub/end-of-software) seam.
