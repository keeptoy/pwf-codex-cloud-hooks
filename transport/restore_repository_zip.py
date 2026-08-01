#!/usr/bin/env python3
"""Restore the Base64 transport text to the verified repository ZIP."""

from __future__ import annotations

import argparse
import base64
import hashlib
from pathlib import Path
import zipfile


SNAPSHOT_COMMIT = "e9f7ec4"
EXPECTED_SHA256 = "307ad804153a64a57cbeae7690d41e483f94ad9cde64c0d101f43caaf1ca04e2"
DEFAULT_SOURCE = Path(__file__).with_name(
    "pwf-codex-cloud-hooks-v0.2.1-e9f7ec4.txt"
)
DEFAULT_OUTPUT = Path(__file__).with_name(
    "pwf-codex-cloud-hooks-v0.2.1-e9f7ec4.zip"
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Decode the Base64 repository export and verify the restored ZIP "
            f"for commit {SNAPSHOT_COMMIT}."
        )
    )
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    try:
        archive = base64.b64decode(args.source.read_bytes(), validate=False)
    except (OSError, ValueError) as exc:
        raise SystemExit(f"invalid Base64 transport: {exc}") from exc

    digest = hashlib.sha256(archive).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(
            f"SHA-256 mismatch: expected {EXPECTED_SHA256}, restored {digest}"
        )

    args.output.write_bytes(archive)
    try:
        with zipfile.ZipFile(args.output) as bundle:
            bad_member = bundle.testzip()
            if bad_member is not None:
                raise SystemExit(f"ZIP integrity failure: {bad_member}")
            entries = len(bundle.infolist())
    except zipfile.BadZipFile as exc:
        args.output.unlink(missing_ok=True)
        raise SystemExit(f"restored output is not a ZIP archive: {exc}") from exc

    print(f"snapshot: {SNAPSHOT_COMMIT}")
    print(f"restored: {args.output}")
    print(f"sha256:  {digest}")
    print(f"entries: {entries}")


if __name__ == "__main__":
    main()
