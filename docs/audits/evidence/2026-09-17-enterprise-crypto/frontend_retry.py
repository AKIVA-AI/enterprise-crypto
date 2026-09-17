import json
import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

root = Path.cwd()
scratch = root / ".radar/audit-20260917"
env = os.environ.copy()
env.update(
    CI="true",
    VITE_SUPABASE_URL="http://127.0.0.1:9",
    VITE_SUPABASE_PUBLISHABLE_KEY="audit-placeholder",
    VITE_SUPABASE_ANON_KEY="audit-placeholder",
)
commands = {
    "frontend-tests-retry": [
        "node",
        "node_modules/vitest/vitest.mjs",
        "run",
        "--coverage",
        "--coverage.reportsDirectory=" + str(scratch / "frontend-coverage"),
    ],
    "frontend-build-retry": [
        "node",
        "node_modules/vite/bin/vite.js",
        "build",
        "--outDir",
        str(scratch / "dist"),
    ],
}


def run(item):
    name, command = item
    start = time.monotonic()
    result = subprocess.run(
        command,
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=240,
    )
    for stream in ["stdout", "stderr"]:
        (scratch / f"{name}.{stream}.txt").write_text(
            getattr(result, stream), encoding="utf-8"
        )
    value = dict(
        name=name,
        command=command,
        exit_code=result.returncode,
        seconds=round(time.monotonic() - start, 2),
        reason="Sandbox esbuild could not read ancestor directory; same checks retried outside sandbox.",
    )
    print(json.dumps(value), flush=True)
    return value


with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(run, commands.items()))
(scratch / "frontend-retry.json").write_text(
    json.dumps(results, indent=2) + "\n", encoding="utf-8"
)
