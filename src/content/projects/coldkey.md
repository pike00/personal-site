---
title: Coldkey
description: Post-quantum age key generation and paper backup tool with QR codes. Print it, laminate it, store it in a fireproof safe.
repo: https://github.com/pike00/coldkey
tags: ["Security", "Go", "CLI", "Cryptography"]
date: "2026-07-22"
status: active
stack: ["Go", "Docker", "GitHub Actions"]
post: "coldkey-paper-backup-age-keys"
---

Paper backup for age encryption keys. Generates post-quantum (ML-KEM-768 + X25519) age key pairs and produces a single-page printable HTML document with QR codes. Print it, laminate it, store it in a fireproof safe. Your secrets survive even if every digital copy is gone.

## What it does

- `coldkey generate` — create a new key pair with printable paper backup
- `coldkey backup` — generate a paper backup from an existing key file
- Interactive mode with menu prompts for the cautious
- Docker hardened mode: distroless container, no network, read-only rootfs

## Why

If you use age or SOPS to encrypt secrets, losing your private key means losing access to everything it protects. A paper backup breaks the trust chain — the key lives in a different physical and digital domain from the secrets it guards.
