#!/usr/bin/env bash
# Build both contracts with cargo-near and deploy them to testnet with near-cli-rs (the NEAR docs flow).
# Redeploying keeps contract state. Needs keys/vault-admin.json and keys/registry-admin.json from setup.
#   bash scripts/deploy-contracts.sh            build + deploy both
#   bash scripts/deploy-contracts.sh --build    build only
# Install the tools first (official installers):
#   cargo-near:   https://github.com/near/cargo-near/releases  (cargo-near-installer.sh / .ps1)
#   near-cli-rs:  https://github.com/near/near-cli-rs/releases (near-cli-rs-installer.sh / .ps1)
set -euo pipefail
cd "$(dirname "$0")/.."

# --no-abi: cargo-near's ABI step links a native library, which fails on Windows. The wasm is the same.
for c in vault registry; do (cd "contracts/$c" && cargo near build non-reproducible-wasm --no-abi); done
[ "${1:-}" = "--build" ] && exit 0

tmp=$(mktemp -d)
trap 'rm -rf "${tmp:?}"' EXIT
for pair in vault-admin:agentspend_vault registry-admin:agentspend_registry; do
  key=${pair%%:*}; wasm=${pair##*:}
  # near-cli-rs wants "private_key"; our key files say "secret_key". The copy lives only in a temp dir.
  node -e "const k=require('./keys/$key.json');require('fs').writeFileSync(process.argv[1],JSON.stringify({account_id:k.account_id,public_key:k.public_key,private_key:k.secret_key}))" "$tmp/$key.json"
  account=$(node -p "require('./keys/$key.json').account_id")
  near contract deploy "$account" use-file "target/near/$wasm/$wasm.wasm" without-init-call \
    network-config testnet sign-with-access-key-file "$tmp/$key.json" send
done
