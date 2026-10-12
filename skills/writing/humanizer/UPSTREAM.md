# Upstream and maintenance

- Imported from [gdiab/humanizer](https://github.com/gdiab/humanizer) 3.1.0 at `52d2deedf6db19f786ccf1abf650d1fd9e53c501`.
- That fork is based on [blader/humanizer](https://github.com/blader/humanizer) 3.0.0. It adds patterns 26 to 33, detect mode, the portability test, the quotation-selection rule, and eval.md. Patterns 26 to 28 credit [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop).
- The imported SKILL.md body, from `# Humanizer: remove AI writing patterns` to the end, is unchanged. eval.md and agents/openai.yaml are also unchanged. The original MIT notice ships as LICENSE in this folder.
- GD stack owns the replacement frontmatter, the clearly marked task-routing section above that body, and references/story-development.md. Version 3.2.0 adds optional nonfiction story development, author elicitation, evidence selection, and review of the reading format. No pattern was added or renumbered.

## Maintenance policy

GD stack is the source for future changes to this variant. The standalone repository retains its history and last standalone package for existing users, with a migration notice after this skill is released. It is a legacy distribution, not a second development branch. Do not set up two-way synchronization or delete old releases.

Keep normal discovery enabled, matching the standalone skill. Story development is conditional on the user's task. Install one active copy per agent environment; migrating packaging should not leave duplicate Humanizer skills competing for the same request.

## Taking upstream changes

Review changes from blader/humanizer deliberately. Keep upstream attribution and the fork's additions visible. Replace the preserved block only as part of a documented upstream update; recheck the task router, story-development preservation exception, and eval.md together. Update the source commit and CREDITS.md when the imported base changes.

## Release order

1. Merge and release the GD stack addition; verify skill discovery and ordinary edit, detect, and story-development routing.
2. Add a notice to gdiab/humanizer pointing to the released skill. Keep its existing package and tags usable. Do not archive it automatically.
3. Migrate installed environments individually: verify the GD stack skill is available, then retire the duplicate standalone discovery entry with a recoverable backup. Check project instructions for direct paths before changing an installation. Never delete a local clone that contains uncommitted work.
