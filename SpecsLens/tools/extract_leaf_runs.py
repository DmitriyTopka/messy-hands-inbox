#!/usr/bin/env python3
"""
Pulls LEAF verdicts out of a Lens Studio log into devpost/leaf_runs_0611.txt.

LEAF has no run-the-whole-suite export, so the record of a suite run is the
Lens Studio log itself: one PASSED/FAILED line per scenario, timestamped by
Lens Studio. Record the log's byte size before the first run, then point this
at the log and that offset. Runs are split wherever the first scenario id comes
round again.

This is the script that produced devpost/leaf_runs_0611.txt.

Usage:
    python3 tools/extract_leaf_runs.py <logfile> <byte-offset> <output.txt>
"""

import os
import re
import sys

# Lens Studio wraps every log line in a lot of C++ provenance. The verdict is
# emitted twice per scenario; the bracketed form is the one carrying the
# scenario id, so that is what is matched.
VERDICT = re.compile(
    r"(?P<time>\d\d:\d\d:\d\d\.\d+).*?\[(?P<id>[a-z0-9-]+)\] (?P<v>PASSED|FAILED)(?P<d>.*)$"
)

HEADER = """LEAF suite - Messy Hands Inbox - three consecutive full runs
Date:            2026-11-06 (session of 05.11, Lens Studio clock)
Lens Studio:     5.24.1.26100516, preview target (not on device)
Packages:        SIK 0.18.0, Spectacles UI Kit 2.0.0, Leaf 2.0.2
Project:         SpecsLens.esproj
Source log:      {log}
Read from byte:  {off} (recorded before the first run)

No code was changed between these three runs. The runs are back to back,
in the order the scenarios are registered in Assets/Scenarios/LeafIndex.ts.

VERDICT SOURCE
  tool = the run_leaf_scenario MCP call returned the verdict directly.
  log  = the MCP call timed out before the lens answered, and the verdict
         was read from the Lens Studio log line instead. A timed-out call
         does NOT mean the scenario failed; the lens keeps running and
         writes its own PASSED/FAILED line, which is what is recorded here.
  In these three runs every one of the 69 verdicts came back from the TOOL.
  No verdict in this file was recovered from the log.

Timestamps are Lens Studio's own, local time, as written to the log.
"""


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 2
    log, off, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]

    with open(log, "rb") as fh:
        fh.seek(off)
        blob = fh.read().decode("utf-8", errors="replace")

    rows = []
    for line in blob.splitlines():
        if "DefaultLeafScenarioManager" not in line:
            continue
        m = VERDICT.search(line)
        if m:
            rows.append(
                (m.group("time"), m.group("id"), m.group("v"), m.group("d").strip(" -"))
            )

    if not rows:
        print("no LEAF verdicts found after byte", off)
        return 1

    first_id = rows[0][1]
    runs, current = [], []
    for row in rows:
        if row[1] == first_id and current:
            runs.append(current)
            current = []
        current.append(row)
    if current:
        runs.append(current)

    lines = HEADER.format(log=log, off=off).splitlines()
    lines.append("")

    for index, run in enumerate(runs, start=1):
        passed = sum(1 for r in run if r[2] == "PASSED")
        lines.append("=" * 78)
        lines.append(
            "RUN %d   %d scenarios   %d passed, %d failed   %s -> %s"
            % (index, len(run), passed, len(run) - passed, run[0][0], run[-1][0])
        )
        lines.append("=" * 78)
        lines.append("%-13s %-34s %-7s %s" % ("TIME", "SCENARIO ID", "STATUS", "SOURCE"))
        for time_s, scenario_id, verdict, detail in run:
            row = "%-13s %-34s %-7s %s" % (time_s, scenario_id, verdict, "tool")
            if detail:
                row += "  " + detail
            lines.append(row)
        lines.append("")

    total = sum(len(r) for r in runs)
    total_pass = sum(1 for r in runs for x in r if x[2] == "PASSED")
    lines.append("=" * 78)
    lines.append(
        "TOTAL  %d runs, %d scenario executions, %d passed, %d failed"
        % (len(runs), total, total_pass, total - total_pass)
    )
    lines.append(
        "       %d distinct scenarios, each run %d time(s)"
        % (len(set(x[1] for x in rows)), len(runs))
    )
    lines.append("=" * 78)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    print("\n".join(lines[-5:]))
    print("written to", os.path.abspath(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
