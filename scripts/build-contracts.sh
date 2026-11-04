#!/usr/bin/env bash
# Builds both contracts to wasm. Output: contracts/res/*.wasm
#
# Preferred: `cargo near build non-reproducible-wasm` inside each contract dir (if cargo-near is installed).
# Fallback (used here, works on Windows where cargo-near may not compile): plain cargo with the same
# flags cargo-near uses: `-C link-arg=-s --cfg near`. near-sdk 5.30 targets protocol version 88, which
# accepts the bulk-memory opcodes modern rustc emits (testnet is on PV 88 as of 2026-11-04).
set -euo pipefail
cd "$(dirname "$0")/.."
rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

TARGET_DIR="${CARGO_TARGET_DIR:-target}"
RUSTFLAGS="-C link-arg=-s --cfg near" cargo build --release --target wasm32-unknown-unknown \
  -p agentspend-vault -p agentspend-registry

mkdir -p contracts/res
cp "$TARGET_DIR/wasm32-unknown-unknown/release/agentspend_vault.wasm" contracts/res/vault.wasm
cp "$TARGET_DIR/wasm32-unknown-unknown/release/agentspend_registry.wasm" contracts/res/registry.wasm
ls -l contracts/res/*.wasm
