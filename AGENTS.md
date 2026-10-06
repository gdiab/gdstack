# AGENTS.md

`gdstack` is George Diab's skills repo, shipped as a Claude Code plugin (`.claude-plugin/`) and installable for other agents with `npx skills`.

## Layout

- `skills/<bucket>/<name>/SKILL.md`: one folder per skill. Buckets: `engineering`, `writing`, `tools`.
- Every skill listed in `.claude-plugin/plugin.json` under `skills`.
- Adapted skills carry an `UPSTREAM.md` and a row in `CREDITS.md`. Keep upstream text unchanged in one block and put our changes in clearly marked sections, so upstream updates merge cleanly.

## Rules

- **One owner per job.** Before adding a skill, check it doesn't compete with an installed skill for the same request (Matt Pocock's plugin, built-in skills, other gdstack skills). Model-invoked skills compete on their description.
- **User-invoked by default.** Set `disable-model-invocation: true` unless the skill must fire on its own. Quote `description` values in frontmatter.
- **Public repo.** No employer or client code, names, pricing, hostnames, account ids, personal paths or credentials. Write neutral examples.
- **No em dashes** in prose.
- Run `python3 scripts/check-skills.py` before committing.
