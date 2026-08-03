#!/usr/bin/env python3
"""Build or verify the deterministic Release ZIP allowlist."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTRACT = ROOT / "contracts" / "release-artifact-v1.json"
EXECUTABLE_PATHS = {
    "install.js",
    "hooks/hook_adapter.py",
    "tools/import_upstream_runtime.py",
    "runtime/owned-catchup.py",
    "runtime/owned-plan.py",
    "runtime/upstream/session-catchup.py",
    "runtime/upstream/resolve-plan-dir.sh",
    "runtime/upstream/inject-plan.sh",
    "runtime/upstream/ledger-summary.sh",
}
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def safe_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("artifact entry path is invalid")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"unsafe artifact entry path: {value}")
    return path.as_posix()


def load_contract(path: Path) -> tuple[dict, list[str]]:
    contract = json.loads(path.read_text(encoding="utf-8"))
    if contract.get("schema_version") != 1:
        raise ValueError("unsupported release artifact schema")
    if contract.get("ordering") != "lexicographic_by_utf8_path":
        raise ValueError("unsupported artifact ordering")
    if contract.get("timestamp") != "1980-01-01T00:00:00Z":
        raise ValueError("unsupported artifact timestamp")
    if contract.get("compression") != "deflate":
        raise ValueError("unsupported artifact compression")
    root = contract.get("archive_root")
    if not isinstance(root, str) or not root.endswith("/") or safe_path(root[:-1]) != root[:-1]:
        raise ValueError("invalid archive root")

    entries = contract.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("artifact entry list is empty")
    paths: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("state") != "present":
            raise ValueError(f"artifact entry is not ready: {entry}")
        paths.append(safe_path(entry.get("path")))
    if len(paths) != len(set(paths)):
        raise ValueError("artifact entry list contains duplicates")
    for external in contract.get("external_release_assets", []):
        if safe_path(external.get("path")) in paths:
            raise ValueError("external release asset entered ZIP allowlist")
    for prefix in contract.get("excluded_prefixes", []):
        if not isinstance(prefix, str) or any(item == prefix.rstrip("/") or item.startswith(prefix) for item in paths):
            raise ValueError(f"excluded prefix entered ZIP allowlist: {prefix}")
    return contract, sorted(paths, key=lambda item: item.encode("utf-8"))


def source_bytes(relative: str) -> bytes:
    target = ROOT.joinpath(*PurePosixPath(relative).parts)
    if target.is_symlink() or not target.is_file():
        raise ValueError(f"artifact source is missing or unsafe: {relative}")
    return target.read_bytes()


def build_bytes(contract: dict, paths: list[str], output: Path) -> None:
    archive_root = contract["archive_root"]
    temporary = output.with_name(f".{output.name}.pwf-build-{os.getpid()}")
    if temporary.exists() or temporary.is_symlink():
        raise ValueError(f"temporary artifact path already exists: {temporary}")
    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(temporary, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for relative in paths:
                info = zipfile.ZipInfo(f"{archive_root}{relative}", ZIP_TIMESTAMP)
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                mode = 0o755 if relative in EXECUTABLE_PATHS else 0o644
                info.external_attr = (stat.S_IFREG | mode) << 16
                archive.writestr(info, source_bytes(relative), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        os.replace(temporary, output)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def inspect_archive(archive_path: Path, contract: dict, paths: list[str]) -> dict:
    archive_root = contract["archive_root"]
    expected_names = [f"{archive_root}{relative}" for relative in paths]
    with zipfile.ZipFile(archive_path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if names != expected_names:
            raise ValueError("artifact inventory or ordering mismatch")
        for relative, info in zip(paths, infos):
            if info.is_dir() or info.date_time != ZIP_TIMESTAMP or info.compress_type != zipfile.ZIP_DEFLATED:
                raise ValueError(f"artifact metadata mismatch: {relative}")
            expected_mode = 0o755 if relative in EXECUTABLE_PATHS else 0o644
            if stat.S_IMODE(info.external_attr >> 16) != expected_mode:
                raise ValueError(f"artifact mode mismatch: {relative}")
            if archive.read(info) != source_bytes(relative):
                raise ValueError(f"artifact content mismatch: {relative}")
    content = archive_path.read_bytes()
    return {
        "healthy": True,
        "archive": str(archive_path),
        "entries": len(paths),
        "sha256": sha256_bytes(content),
        "size": len(content),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build", "check"))
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    if args.command == "build" and args.output is None:
        parser.error("--output is required for build")
    if args.command == "check" and args.archive is None:
        parser.error("--archive is required for check")
    return args


def main() -> int:
    try:
        args = parse_args()
        contract, paths = load_contract(args.contract.resolve(strict=True))
        target = args.output if args.command == "build" else args.archive
        archive_path = Path(os.path.abspath(target))
        if args.command == "build":
            build_bytes(contract, paths, archive_path)
        result = inspect_archive(archive_path.resolve(strict=True), contract, paths)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(json.dumps({"healthy": False, "error": str(error)}, sort_keys=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
