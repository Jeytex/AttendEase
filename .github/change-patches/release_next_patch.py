#!/usr/bin/env python3
"""
Dependency-aware random patch selector and release engine for AttendEase.

Selects ONE currently eligible patch from `.github/change-patches/001.patch`..`100.patch`
that:
  1. Has not yet been released (tracked in `.github/change-patches/released.txt` and `git log`).
  2. Has all of its prerequisite patches (from the permutation conflict/dependency graph)
     already released.
  3. Passes `git apply --check` cleanly against the current repository state.

Applies the selected patch, updates `.github/change-patches/released.txt` and
`.github/auto-commit-state` (with a random 2-6 hour next-release timestamp), stages
all changes, and writes step outputs to `$GITHUB_OUTPUT` when running in GitHub Actions.
"""

import os
import re
import secrets
import subprocess
import sys
import time
from pathlib import Path

TOTAL_PATCHES = 100
MIN_DELAY_SECONDS = 7200   # 2 hours
MAX_DELAY_SECONDS = 21600  # 6 hours (7200 + 14400)


def build_dependency_map() -> dict[int, set[int]]:
    """
    Return the dependency graph mapping each patch number (1..100) to the set of
    prerequisite patch numbers that MUST be applied before it.

    Derived from full permutation testing across `.github/change-patches/001.patch`..`100.patch`:
      - Enforces hunk/context ordering for overlapping or adjacent changes within the same file.
      - Enforces cross-file logical dependencies (e.g., tests depending on implementation changes).
    """
    deps: dict[int, set[int]] = {i: set() for i in range(1, TOTAL_PATCHES + 1)}

    # 1. backend/qr.py: 002 -> 019 -> 020
    deps[19].add(2)
    deps[20].update([2, 19])

    # 2. backend/auth.py: 016 -> 017
    deps[17].add(16)

    # 3. backend/attendance.py:
    #    - 022 -> 023 -> 024..040 (ALLOWED_QR_LIFETIMES and DAYS_ORDER context/symbol dependency)
    #    - 026, 027 -> 028 -> 029..040 (request.get_json(silent=True) spans 11 hunks across file)
    #    - 039 -> 040 (adjacent lines in manual_mark_attendance / student profile)
    deps[23].add(22)
    for p in range(24, 41):
        deps[p].add(23)
    deps[28].update([26, 27])
    for p in range(29, 41):
        deps[p].add(28)
    deps[40].add(39)

    # 4. backend/zepiris_service.py: 045 -> 046 -> 047 -> 048, 049, 050
    deps[46].add(45)
    deps[47].add(46)
    for p in (48, 49, 50):
        deps[p].add(47)

    # 5. backend/test_suite.py cross-file logical dependencies:
    #    - 054 tests cosine_similarity edge cases added in 048 and 049
    #    - 055 asserts /api/auth/me response updated in 018
    deps[54].update([48, 49])
    deps[55].add(18)

    # 6. backend/requirements.txt: 057 -> 058
    deps[58].add(57)

    # 7. frontend/src/api/config.js: 064 -> 065
    deps[65].add(64)

    # 8. frontend/src/pages/faculty/TimetablePage.jsx: 086 -> 089
    deps[89].add(86)

    # 9. frontend/src/pages/faculty/{Faculty,Students,Subjects}Page.jsx: 088 -> 090
    deps[90].add(88)

    # 10. frontend/src/pages/student/ProfilePage.jsx logical dependency on backend 040:
    deps[92].add(40)

    # 11. README.md: 096 -> 097 -> 098
    deps[97].add(96)
    deps[98].add(97)

    return deps


def extract_subject(patch_path: Path) -> str:
    """Extract the clean commit message from a `git format-patch` file's Subject header."""
    text = patch_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    subject_parts = []
    in_subject = False
    for line in lines:
        if line.startswith("Subject: "):
            in_subject = True
            cleaned = re.sub(r"^Subject:\s*(\[PATCH[^\]]*\]\s*)?", "", line).strip()
            subject_parts.append(cleaned)
        elif in_subject:
            if line.startswith(" ") or line.startswith("\t"):
                subject_parts.append(line.strip())
            else:
                break
    subject = " ".join(part for part in subject_parts if part)
    if not subject:
        raise RuntimeError(f"Could not parse Subject header from {patch_path}")
    return subject


def load_released_patches(released_file: Path, patches_dir: Path, repo_root: Path) -> set[int]:
    """
    Load the set of already-released patch numbers (1..100) from `released.txt`
    and cross-check against recent commit subjects in `git log`.
    """
    released: set[int] = set()
    if released_file.exists():
        for raw_line in released_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.split("#", 1)[0].strip()
            if line.isdigit():
                released.add(int(line))

    # Secondary safeguard: check git log since origin/main initial state for matching commit subjects
    subject_to_id: dict[str, int] = {}
    for i in range(1, TOTAL_PATCHES + 1):
        p = patches_dir / f"{i:03d}.patch"
        if p.exists():
            subject_to_id[extract_subject(p)] = i

    log_res = subprocess.run(
        ["git", "log", "-n", "200", "--format=%s"],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if log_res.returncode == 0:
        for subj in log_res.stdout.splitlines():
            subj_clean = subj.strip()
            if subj_clean in subject_to_id:
                released.add(subject_to_id[subj_clean])

    return released


def can_apply_cleanly(patch_path: Path, repo_root: Path) -> tuple[bool, bool]:
    """
    Return (can_apply, needs_3way) for `patch_path` against `repo_root`.
    """
    strict = subprocess.run(
        ["git", "apply", "--check", str(patch_path)],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if strict.returncode == 0:
        return True, False

    three_way = subprocess.run(
        ["git", "apply", "--3way", "--check", str(patch_path)],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if three_way.returncode == 0:
        return True, True

    return False, False


def write_github_outputs(outputs: dict[str, str]) -> None:
    """Append key=value pairs to $GITHUB_OUTPUT if running in GitHub Actions."""
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if not gh_out:
        return
    with open(gh_out, "a", encoding="utf-8") as f:
        for k, v in outputs.items():
            f.write(f"{k}={v}\n")


def main() -> int:
    patches_dir = Path(__file__).resolve().parent
    repo_root = patches_dir.parent.parent
    released_file = patches_dir / "released.txt"
    state_file = repo_root / ".github" / "auto-commit-state"

    deps = build_dependency_map()
    released = load_released_patches(released_file, patches_dir, repo_root)

    if len(released) >= TOTAL_PATCHES:
        print("All 100 patches have been released. Stopping automatically.")
        write_github_outputs({
            "applied": "false",
            "status": "completed",
            "remaining": "0",
        })
        return 0

    # Find all patches whose prerequisite dependencies have all been released
    dep_eligible = [
        i
        for i in range(1, TOTAL_PATCHES + 1)
        if i not in released and deps[i].issubset(released)
    ]

    # Verify clean git applicability for each candidate
    applicable_candidates: list[tuple[int, bool]] = []
    for i in dep_eligible:
        patch_path = patches_dir / f"{i:03d}.patch"
        ok, use_3way = can_apply_cleanly(patch_path, repo_root)
        if ok:
            applicable_candidates.append((i, use_3way))

    if not applicable_candidates:
        raise RuntimeError(
            f"No eligible patch could be applied! Released={sorted(released)}, "
            f"Dep-eligible={dep_eligible}"
        )

    # Randomly choose ONE currently eligible patch
    chosen_id, use_3way = secrets.choice(applicable_candidates)
    patch_filename = f"{chosen_id:03d}.patch"
    patch_path = patches_dir / patch_filename
    commit_msg = extract_subject(patch_path)

    # Apply the chosen patch to the working tree and index
    apply_cmd = ["git", "apply", "--index"]
    if use_3way:
        apply_cmd.append("--3way")
    apply_cmd.append(str(patch_path))

    subprocess.run(apply_cmd, cwd=repo_root, check=True)

    # Record the released patch in `.github/change-patches/released.txt`
    released.add(chosen_id)
    released_lines = ["# Released patch IDs (001-100), one per line"]
    for pid in sorted(released):
        released_lines.append(f"{pid:03d}")
    released_file.write_text("\n".join(released_lines) + "\n", encoding="utf-8")

    # Update `.github/auto-commit-state` with the next random 2-6 hour release window
    now_ts = int(time.time())
    delay = MIN_DELAY_SECONDS + secrets.randbelow(MAX_DELAY_SECONDS - MIN_DELAY_SECONDS + 1)
    next_ts = now_ts + delay
    state_file.write_text(f"{next_ts}\n", encoding="utf-8")

    # Stage tracking files alongside the applied patch changes
    subprocess.run(
        ["git", "add", "--", ".github/change-patches/released.txt", ".github/auto-commit-state"],
        cwd=repo_root,
        check=True,
    )

    remaining = TOTAL_PATCHES - len(released)
    print(f"Selected and applied patch {patch_filename}: {commit_msg}")
    print(f"Progress: {len(released)}/{TOTAL_PATCHES} released ({remaining} remaining).")
    print(f"Next scheduled release eligible after Unix timestamp {next_ts} (+{delay // 60}m).")

    write_github_outputs({
        "applied": "true",
        "status": "released",
        "patch_id": f"{chosen_id:03d}",
        "commit_message": commit_msg,
        "remaining": str(remaining),
    })
    return 0


if __name__ == "__main__":
    sys.exit(main())
