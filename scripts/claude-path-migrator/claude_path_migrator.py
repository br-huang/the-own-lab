#!/usr/bin/env python3
"""
Interactive TUI for migrating Claude Code project state under ~/.claude/projects.

Controls
--------
Up/Down: move selection
Tab: switch focus
Enter: activate focused action
e: edit target path
p: preview migration plan
m: run migration
q: quit
"""

from __future__ import annotations

import curses
import datetime as dt
import hashlib
from pathlib import Path
import shutil
import textwrap
import traceback


CLAUDE_ROOT = Path.home() / ".claude"
PROJECTS_ROOT = CLAUDE_ROOT / "projects"
BACKUP_ROOT = CLAUDE_ROOT / "path-migrator-backups"
WORKSPACE_ROOT = Path.home() / "Workspaces"
PRESET_PATH_MAP = {
    # apps/
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-110-Obsidian-RAG": str(WORKSPACE_ROOT / "apps" / "obsidian-second-brain"),
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-111-Social-Worker-AI": str(WORKSPACE_ROOT / "apps" / "social-worker-ai"),
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-113-Not-Forget-List": str(WORKSPACE_ROOT / "apps" / "never-forget-list"),
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-115-Open-Typora": str(WORKSPACE_ROOT / "apps" / "open-typora"),
    "-Users-rong-Workspaces-1-Projects-12-Sandbox-Labs-120-Terminal": str(WORKSPACE_ROOT / "apps" / "ultra-terminal"),
    "-Users-rong-Workspaces-1-Projects-12-Sandbox-Labs-122-Better-Browser": str(WORKSPACE_ROOT / "apps" / "browser"),
    "-Users-rong-Workspaces-1-Projects-13-Personal-Brand": str(WORKSPACE_ROOT / "apps" / "the-own-lab"),
    # packages/
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-112-Claude-Company-of-One": str(WORKSPACE_ROOT / "packages" / "claude-company-of-one"),
    "-Users-rong-Workspaces-1-Projects-11-Brian-Projects-114-claude-code-statusline": str(WORKSPACE_ROOT / "packages" / "claude-statusline"),
    "-Users-rong-Workspaces-3-Resources-31-Shared-Layer-310-UI-Library": str(WORKSPACE_ROOT / "packages" / "ui"),
    # scripts/
    "-Users-rong-Workspaces-1-Projects-14-Scripts-140-React-Starter": str(WORKSPACE_ROOT / "scripts" / "react-starter"),
    "-Users-rong-Workspaces-1-Projects-14-Scripts-141-Application-Activator": str(WORKSPACE_ROOT / "scripts" / "application-activator"),
    # learn/
    "-Users-rong-Workspaces-2-Areas-21-Claude-Code-210-Harness-Agents": str(WORKSPACE_ROOT / "learn" / "harness-agent"),
}


def path_to_key(path: str) -> str:
    resolved = str(Path(path).expanduser().resolve(strict=False))
    encoded = resolved.replace("/", "-")
    return encoded if encoded.startswith("-") else f"-{encoded}"


def key_to_path(key: str) -> str:
    if not key.startswith("-"):
        raise ValueError(f"Not a Claude project key: {key}")
    return key.replace("-", "/")[1:] or "/"


def is_session_dir(path: Path) -> bool:
    name = path.name
    if name == "memory":
        return False
    parts = name.split("-")
    return len(parts) == 5 and all(parts)


def list_project_dirs() -> list[Path]:
    if not PROJECTS_ROOT.exists():
        return []
    items = [p for p in PROJECTS_ROOT.iterdir() if p.is_dir() and p.name.startswith("-")]
    return sorted(items, key=lambda p: p.name.lower())


def directory_digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def safe_copy_file(src: Path, dst: Path, suffix: str, notes: list[str]) -> None:
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        notes.append(f"Copied file: {src.name}")
        return

    if directory_digest(src) == directory_digest(dst):
        notes.append(f"Skipped identical file: {dst.name}")
        return

    alt = dst.with_name(f"{dst.name}.{suffix}")
    shutil.copy2(src, alt)
    notes.append(f"Conflict copied as: {alt.name}")


def merge_tree(src: Path, dst: Path, suffix: str, notes: list[str]) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    for child in sorted(src.iterdir(), key=lambda p: p.name.lower()):
        target = dst / child.name
        if child.is_dir():
            if target.exists() and not target.is_dir():
                alt = dst / f"{child.name}.{suffix}"
                shutil.copytree(child, alt)
                notes.append(f"Conflict directory copied as: {alt.name}")
                continue
            merge_tree(child, target, suffix, notes)
        else:
            safe_copy_file(child, target, suffix, notes)


def build_plan(src_dir: Path, target_path: str) -> dict[str, str | bool | Path]:
    target_abs = str(Path(target_path).expanduser().resolve(strict=False))
    target_key = path_to_key(target_abs)
    target_dir = PROJECTS_ROOT / target_key
    backup_dir = BACKUP_ROOT / f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}__{src_dir.name[1:]}"
    return {
        "source_dir": src_dir,
        "source_path": key_to_path(src_dir.name),
        "target_path": target_abs,
        "target_key": target_key,
        "target_dir": target_dir,
        "target_exists": target_dir.exists(),
        "backup_dir": backup_dir,
        "same_key": src_dir.name == target_key,
    }


def execute_migration(src_dir: Path, target_path: str) -> list[str]:
    plan = build_plan(src_dir, target_path)
    notes: list[str] = []

    if plan["same_key"]:
        raise RuntimeError("Source and target resolve to the same Claude project key.")

    source_dir = Path(plan["source_dir"])
    target_dir = Path(plan["target_dir"])
    backup_dir = Path(plan["backup_dir"])
    suffix = f"migrated-{dt.datetime.now().strftime('%Y%m%d%H%M%S')}"

    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_dir, backup_dir)
    notes.append(f"Backup created: {backup_dir}")

    if not target_dir.exists():
        source_dir.rename(target_dir)
        notes.append(f"Renamed {source_dir.name} -> {target_dir.name}")
        return notes

    notes.append(f"Target exists, merging into {target_dir.name}")
    for child in sorted(source_dir.iterdir(), key=lambda p: p.name.lower()):
        target = target_dir / child.name
        if child.is_dir():
            if not target.exists():
                shutil.copytree(child, target)
                notes.append(f"Copied directory: {child.name}")
            else:
                merge_tree(child, target, suffix, notes)
        else:
            safe_copy_file(child, target, suffix, notes)

    shutil.rmtree(source_dir)
    notes.append(f"Removed old source directory: {source_dir.name}")
    return notes


def build_batch_candidates() -> list[tuple[Path, str]]:
    candidates: list[tuple[Path, str]] = []
    for old_key, target_path in PRESET_PATH_MAP.items():
        src_dir = PROJECTS_ROOT / old_key
        if src_dir.exists():
            candidates.append((src_dir, target_path))
    return candidates


class App:
    def __init__(self, stdscr: curses.window) -> None:
        self.stdscr = stdscr
        self.entries = list_project_dirs()
        self.selected = 0
        self.focus = "list"
        self.target_path = ""
        self.message = "Select a Claude project, then set a new absolute path."
        self.preview_lines: list[str] = []

    @property
    def current(self) -> Path | None:
        if not self.entries:
            return None
        self.selected = max(0, min(self.selected, len(self.entries) - 1))
        return self.entries[self.selected]

    def refresh_entries(self) -> None:
        self.entries = list_project_dirs()
        if self.selected >= len(self.entries):
            self.selected = max(0, len(self.entries) - 1)

    def set_default_target(self) -> None:
        current = self.current
        if not current:
            self.target_path = ""
            return
        self.target_path = PRESET_PATH_MAP.get(current.name, key_to_path(current.name))

    def wrap(self, text: str, width: int) -> list[str]:
        lines: list[str] = []
        for block in text.splitlines() or [""]:
            lines.extend(textwrap.wrap(block, width=width) or [""])
        return lines

    def render(self) -> None:
        self.stdscr.erase()
        h, w = self.stdscr.getmaxyx()
        split = max(36, min(48, w // 3))
        right_x = split + 1

        title = "Claude Path Migrator"
        self.stdscr.addnstr(0, 2, title, w - 4, curses.A_BOLD)
        self.stdscr.addnstr(1, 2, "Tab switch focus | e edit | r preset | p preview | m migrate | b batch preview | a batch migrate | q quit", w - 4)

        for y in range(2, h - 8):
            if split < w:
                self.stdscr.addch(y, split, curses.ACS_VLINE)

        self.stdscr.addnstr(3, 2, "Projects", split - 4, curses.A_BOLD)
        self.stdscr.addnstr(3, right_x + 1, "Details", w - right_x - 3, curses.A_BOLD)

        list_height = h - 12
        top = 0
        if self.selected >= list_height:
            top = self.selected - list_height + 1

        for idx, entry in enumerate(self.entries[top : top + list_height]):
            y = 4 + idx
            abs_idx = top + idx
            marker = ">" if abs_idx == self.selected else " "
            attr = curses.A_REVERSE if self.focus == "list" and abs_idx == self.selected else curses.A_NORMAL
            self.stdscr.addnstr(y, 2, f"{marker} {entry.name}", split - 4, attr)

        current = self.current
        details: list[str] = []
        if current:
            actual_path = key_to_path(current.name)
            child_names = [p.name for p in sorted(current.iterdir(), key=lambda p: p.name.lower())]
            session_count = sum(1 for name in child_names if is_session_dir(current / name))
            has_memory = "memory" in child_names
            details = [
                f"Claude key: {current.name}",
                f"Path: {actual_path}",
                f"Memory dir: {'yes' if has_memory else 'no'}",
                f"Session dirs: {session_count}",
                f"Preset target: {PRESET_PATH_MAP.get(current.name, '<none>')}",
                "",
                "Target absolute path:",
                self.target_path or "<empty>",
            ]
        else:
            details = ["No Claude project entries found under ~/.claude/projects."]

        y = 4
        for line in details:
            for wrapped in self.wrap(line, max(20, w - right_x - 3)):
                if y >= h - 8:
                    break
                attr = curses.A_REVERSE if self.focus == "target" and wrapped == (self.target_path or "<empty>") else curses.A_NORMAL
                self.stdscr.addnstr(y, right_x + 1, wrapped, w - right_x - 3, attr)
                y += 1

        preview_title_y = h - 7
        self.stdscr.addnstr(preview_title_y, 2, "Preview / Result", w - 4, curses.A_BOLD)
        preview_area = h - preview_title_y - 3
        lines = self.preview_lines or self.wrap(self.message, w - 4)
        for idx, line in enumerate(lines[:preview_area]):
            self.stdscr.addnstr(preview_title_y + 1 + idx, 2, line, w - 4)

        self.stdscr.refresh()

    def prompt_target(self) -> None:
        current = self.current
        if not current:
            return
        self.focus = "target"
        self.message = "Editing target path. Press Enter to save or Esc to cancel."
        h, w = self.stdscr.getmaxyx()
        edit_y = max(7, h - 9)
        prompt = "New absolute path: "
        buf = list(self.target_path)
        pos = len(buf)
        curses.curs_set(1)

        while True:
            self.stdscr.move(edit_y, 2)
            self.stdscr.clrtoeol()
            self.stdscr.addnstr(edit_y, 2, prompt + "".join(buf), w - 4)
            self.stdscr.move(edit_y, min(w - 3, 2 + len(prompt) + pos))
            self.stdscr.refresh()
            ch = self.stdscr.get_wch()
            if ch in ("\n", "\r"):
                self.target_path = "".join(buf).strip()
                self.message = "Target path updated."
                break
            if ch == "\x1b":
                self.message = "Edit cancelled."
                break
            if ch in (curses.KEY_BACKSPACE, "\b", "\x7f"):
                if pos > 0:
                    buf.pop(pos - 1)
                    pos -= 1
                continue
            if ch == curses.KEY_LEFT:
                pos = max(0, pos - 1)
                continue
            if ch == curses.KEY_RIGHT:
                pos = min(len(buf), pos + 1)
                continue
            if isinstance(ch, str) and ch.isprintable():
                buf.insert(pos, ch)
                pos += 1

        curses.curs_set(0)

    def confirm(self, prompt: str) -> bool:
        h, w = self.stdscr.getmaxyx()
        row = h - 2
        self.stdscr.move(row, 2)
        self.stdscr.clrtoeol()
        self.stdscr.addnstr(row, 2, f"{prompt} [y/N]: ", w - 4, curses.A_BOLD)
        self.stdscr.refresh()
        ch = self.stdscr.get_wch()
        return ch in ("y", "Y")

    def preview(self) -> None:
        current = self.current
        if not current:
            self.message = "No source project selected."
            self.preview_lines = []
            return
        if not self.target_path:
            self.message = "Target path is empty."
            self.preview_lines = []
            return

        plan = build_plan(current, self.target_path)
        self.preview_lines = [
            f"Source key:   {current.name}",
            f"Source path:  {plan['source_path']}",
            f"Target path:  {plan['target_path']}",
            f"Target key:   {plan['target_key']}",
            f"Target exists: {'yes' if plan['target_exists'] else 'no'}",
            f"Backup dir:   {plan['backup_dir']}",
        ]
        if plan["same_key"]:
            self.preview_lines.append("Warning: source and target map to the same Claude key.")
        self.message = "Preview generated."

    def use_preset_target(self) -> None:
        current = self.current
        if not current:
            self.message = "No source project selected."
            return
        preset = PRESET_PATH_MAP.get(current.name)
        if not preset:
            self.message = "No preset target for this project."
            return
        self.target_path = preset
        self.message = "Preset target applied."

    def migrate(self) -> None:
        current = self.current
        if not current:
            self.message = "No source project selected."
            self.preview_lines = []
            return
        if not self.target_path:
            self.message = "Target path is empty."
            self.preview_lines = []
            return

        try:
            notes = execute_migration(current, self.target_path)
            self.refresh_entries()
            new_key = path_to_key(self.target_path)
            for idx, entry in enumerate(self.entries):
                if entry.name == new_key:
                    self.selected = idx
                    break
            self.preview_lines = notes
            self.message = "Migration completed."
        except Exception as exc:  # noqa: BLE001
            self.preview_lines = self.wrap(f"{type(exc).__name__}: {exc}", 120)
            self.message = "Migration failed."

    def batch_preview(self) -> None:
        candidates = build_batch_candidates()
        if not candidates:
            self.preview_lines = ["No existing Claude project entries matched the preset map."]
            self.message = "Batch preview found nothing to migrate."
            return

        lines: list[str] = []
        for src_dir, target_path in candidates:
            plan = build_plan(src_dir, target_path)
            status = "MERGE" if plan["target_exists"] else "MOVE"
            lines.append(f"{status}: {src_dir.name} -> {plan['target_key']}")
        self.preview_lines = lines
        self.message = f"Batch preview ready for {len(candidates)} project(s)."

    def batch_migrate(self) -> None:
        candidates = build_batch_candidates()
        if not candidates:
            self.preview_lines = ["No existing Claude project entries matched the preset map."]
            self.message = "Nothing to migrate."
            return
        if not self.confirm(f"Migrate {len(candidates)} preset project(s)?"):
            self.message = "Batch migration cancelled."
            return

        results: list[str] = []
        for src_dir, target_path in candidates:
            try:
                notes = execute_migration(src_dir, target_path)
                results.append(f"OK: {src_dir.name} -> {path_to_key(target_path)}")
                results.extend(f"  {note}" for note in notes[:3])
            except Exception as exc:  # noqa: BLE001
                results.append(f"FAIL: {src_dir.name} -> {type(exc).__name__}: {exc}")

        self.refresh_entries()
        self.preview_lines = results
        self.message = "Batch migration finished."

    def run(self) -> None:
        curses.curs_set(0)
        curses.use_default_colors()
        self.set_default_target()

        while True:
            self.render()
            ch = self.stdscr.get_wch()

            if ch in ("q", "Q"):
                return
            if ch == "\t":
                self.focus = "target" if self.focus == "list" else "list"
                continue
            if ch in ("e", "E"):
                self.prompt_target()
                continue
            if ch in ("r", "R"):
                self.use_preset_target()
                continue
            if ch in ("p", "P"):
                self.preview()
                continue
            if ch in ("m", "M"):
                if not self.confirm("Run migration for the selected project?"):
                    self.message = "Migration cancelled."
                    continue
                self.migrate()
                continue
            if ch in ("b", "B"):
                self.batch_preview()
                continue
            if ch in ("a", "A"):
                self.batch_migrate()
                continue

            if self.focus == "list":
                if ch == curses.KEY_UP:
                    self.selected = max(0, self.selected - 1)
                    self.set_default_target()
                elif ch == curses.KEY_DOWN:
                    self.selected = min(len(self.entries) - 1, self.selected + 1)
                    self.set_default_target()
            elif self.focus == "target" and ch in ("\n", "\r"):
                self.prompt_target()


def main(stdscr: curses.window) -> None:
    app = App(stdscr)
    app.run()


if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
    except Exception:  # noqa: BLE001
        traceback.print_exc()
