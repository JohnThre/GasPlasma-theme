#!/usr/bin/env bash
set -euo pipefail

exec gpg --batch --pinentry-mode loopback --passphrase "${GPG_PASSPHRASE:?GPG_PASSPHRASE is required}" "$@"
