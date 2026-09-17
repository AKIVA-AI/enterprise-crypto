import json
import os
import subprocess
import sys
from pathlib import Path

root = Path.cwd()
scratch = root / ".radar/audit-20260917"
env = os.environ.copy()
env.update(
    PYTHONDONTWRITEBYTECODE="1",
    PYTHON_DOTENV_DISABLED="1",
    PYTEST_DISABLE_PLUGIN_AUTOLOAD="1",
    PAPER_TRADING="true",
    SUPABASE_URL="http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY="audit-placeholder",
    CI="true",
    VITE_SUPABASE_URL="http://127.0.0.1:9",
    VITE_SUPABASE_PUBLISHABLE_KEY="audit-placeholder",
    VITE_SUPABASE_ANON_KEY="audit-placeholder",
)
env["PYTHONPATH"] = os.pathsep.join(
    str(p)
    for p in [
        scratch,
        root / "backend",
        root.parent / "akiva-ai-framework/packages/execution-contracts/src",
        root.parent / "akiva-ai-framework/packages/policy-runtime/src",
    ]
)
commands = {
    "frontend-full-source-coverage": (
        root,
        [
            "node",
            "node_modules/vitest/vitest.mjs",
            "run",
            "--coverage",
            "--coverage.include=src/**/*.{ts,tsx}",
            "--coverage.reportsDirectory=" + str(scratch / "frontend-full-coverage"),
        ],
    ),
    "framework-tests": (
        root / "backend",
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_control_plane.py",
            "-p",
            "pytest_asyncio.plugin",
            "-q",
            "-o",
            "cache_dir=" + str(scratch / "framework-pytest-cache"),
        ],
    ),
}
results = []
for name, (cwd, command) in commands.items():
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )
    for stream in ["stdout", "stderr"]:
        (scratch / f"{name}.{stream}.txt").write_text(
            getattr(result, stream), encoding="utf-8"
        )
    entry = dict(name=name, command=command, exit_code=result.returncode)
    results.append(entry)
    print(json.dumps(entry), flush=True)
(scratch / "extra-checks.json").write_text(
    json.dumps(results, indent=2) + "\n", encoding="utf-8"
)
