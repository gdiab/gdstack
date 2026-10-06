#!/usr/bin/env python3
"""Check every skill folder: valid YAML frontmatter, name matches folder, quoted description, listed in plugin.json."""
import json, pathlib, sys
import yaml

root = pathlib.Path(__file__).resolve().parent.parent
listed = {str((root / p).resolve()) for p in json.loads((root / ".claude-plugin/plugin.json").read_text())["skills"]}
errors = []
for skill_md in sorted(root.glob("skills/*/*/SKILL.md")):
    folder = skill_md.parent
    rel = folder.relative_to(root)
    text = skill_md.read_text()
    if not text.startswith("---\n"):
        errors.append(f"{rel}: SKILL.md must start with YAML frontmatter")
        continue
    raw = text.split("---", 2)[1]
    try:
        meta = yaml.safe_load(raw) or {}
    except yaml.YAMLError as e:
        errors.append(f"{rel}: invalid frontmatter YAML: {e}")
        continue
    if meta.get("name") != folder.name:
        errors.append(f"{rel}: name '{meta.get('name')}' doesn't match folder '{folder.name}'")
    if not meta.get("description"):
        errors.append(f"{rel}: missing description")
    elif not any(line.startswith('description: "') for line in raw.splitlines()):
        errors.append(f"{rel}: quote the description value")
    if str(folder.resolve()) not in listed:
        errors.append(f"{rel}: not listed in .claude-plugin/plugin.json")
for p in listed:
    if not (pathlib.Path(p) / "SKILL.md").exists():
        errors.append(f"plugin.json lists {p} but it has no SKILL.md")
print("\n".join(errors) or "all skills ok")
sys.exit(1 if errors else 0)
