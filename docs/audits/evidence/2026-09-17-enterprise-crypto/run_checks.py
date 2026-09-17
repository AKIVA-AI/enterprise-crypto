import argparse
import importlib.metadata
import json
import os
import platform
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--repo", type=Path, required=True)
parser.add_argument("--only", nargs="+")
parser.add_argument("--label", default="")
args = parser.parse_args()
root = args.repo.resolve()
scratch = root / ".radar/audit-20260917"
scratch.mkdir(parents=True, exist_ok=True)
git = ["git", "-c", "safe.directory=" + root.as_posix()]
env = os.environ.copy()
for key in list(env):
    if any(
        x in key.upper()
        for x in (
            "SUPABASE",
            "API_KEY",
            "API_SECRET",
            "SIGNING_KEY",
            "SENTRY_DSN",
            "OTEL_EXPORTER",
        )
    ):
        env.pop(key)
env.update(
    PYTHONDONTWRITEBYTECODE="1",
    PYTHON_DOTENV_DISABLED="1",
    PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    PAPER_TRADING="true",
    SUPABASE_URL="http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY="audit-placeholder",
    SUPABASE_ANON_KEY="audit-placeholder",
    REDIS_URL="redis://127.0.0.1:9",
    VITE_SUPABASE_URL="http://127.0.0.1:9",
    VITE_SUPABASE_PUBLISHABLE_KEY="audit-placeholder",
    VITE_SUPABASE_ANON_KEY="audit-placeholder",
    CI="true",
    COVERAGE_FILE=str(scratch / ".coverage"),
    PYTHONPATH=os.pathsep.join([str(scratch), str(root / "backend")]),
    OMP_NUM_THREADS="1",
    MKL_NUM_THREADS="1",
)
commands = {
    "frontend-tests": (
        root,
        [
            "node",
            "node_modules/vitest/vitest.mjs",
            "run",
            "--coverage",
            "--coverage.reportsDirectory=" + str(scratch / "frontend-coverage"),
        ],
    ),
    "frontend-types": (
        root,
        [
            "node",
            "node_modules/typescript/bin/tsc",
            "-p",
            "tsconfig.app.json",
            "--noEmit",
        ],
    ),
    "frontend-lint": (
        root,
        [
            "node",
            "node_modules/eslint/bin/eslint.js",
            ".",
            "--max-warnings=0",
            "--format=json",
        ],
    ),
    "frontend-build": (
        root,
        [
            "node",
            "node_modules/vite/bin/vite.js",
            "build",
            "--outDir",
            str(scratch / "dist"),
        ],
    ),
    "backend-tests": (
        root / "backend",
        [
            sys.executable,
            "-m",
            "pytest",
            "-p",
            "pytest_asyncio.plugin",
            "-p",
            "pytest_cov",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=json:" + str(scratch / "backend-coverage.json"),
            "--cov-fail-under=60",
            "-q",
            "-o",
            "cache_dir=" + str(scratch / "pytest-cache"),
            "--basetemp=" + str(scratch / "pytest-tmp"),
        ],
    ),
    "backend-lint": (
        root / "backend",
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "app/",
            "--select",
            "E,W,F",
            "--ignore",
            "E501",
            "--output-format=json",
        ],
    ),
    "backend-types": (
        root / "backend",
        [
            sys.executable,
            "-m",
            "mypy",
            "app/",
            "--ignore-missing-imports",
            "--no-error-summary",
            "--cache-dir",
            str(scratch / "mypy-cache"),
        ],
    ),
}


def run(item):
    name, (cwd, command) = item
    if args.label:
        name += "-" + args.label
    start = time.monotonic()
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=300,
        )
        code, stdout, stderr = result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired as exc:
        code = "timeout"
        stdout = (
            (exc.stdout or b"").decode("utf-8", errors="replace")
            if isinstance(exc.stdout, bytes)
            else (exc.stdout or "")
        )
        stderr = (
            (exc.stderr or b"").decode("utf-8", errors="replace")
            if isinstance(exc.stderr, bytes)
            else (exc.stderr or "")
        )
    for label, value in [("stdout", stdout), ("stderr", stderr)]:
        (scratch / f"{name}.{label}.txt").write_text(
            value, encoding="utf-8", newline="\n"
        )
    entry = dict(
        name=name,
        command=command,
        cwd=str(cwd),
        exit_code=code,
        seconds=round(time.monotonic() - start, 2),
    )
    print(json.dumps(entry), flush=True)
    return entry


versions = {}
for name in [
    "pytest",
    "pytest-asyncio",
    "pytest-cov",
    "coverage",
    "ruff",
    "mypy",
    "fastapi",
    "pydantic",
    "supabase",
    "httpx",
    "redis",
    "numpy",
    "pandas",
    "ccxt",
]:
    try:
        versions[name] = importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        versions[name] = None
initial = dict(
    head=subprocess.check_output(
        git + ["rev-parse", "HEAD"], cwd=root, text=True
    ).strip(),
    origin_main=subprocess.check_output(
        git + ["rev-parse", "origin/main"], cwd=root, text=True
    ).strip(),
    status=subprocess.check_output(
        git + ["status", "--porcelain"], cwd=root, text=True
    ),
    python=sys.version,
    platform=platform.platform(),
    versions=versions,
    environment="Dummy local endpoints and credentials; dotenv disabled; Python socket.connect blocked by sitecustomize; no bytecode writes.",
)
if not (scratch / "initial.json").exists():
    (scratch / "initial.json").write_text(
        json.dumps(initial, indent=2) + "\n", encoding="utf-8"
    )
if args.only:
    commands = {k: v for k, v in commands.items() if k in args.only}
with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(run, commands.items()))
(scratch / ("checks" + ("-" + args.label if args.label else "") + ".json")).write_text(
    json.dumps(results, indent=2) + "\n", encoding="utf-8"
)
