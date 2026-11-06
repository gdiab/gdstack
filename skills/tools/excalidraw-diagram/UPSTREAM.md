# Inspiration and provenance

- Source: [coleam00/excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill).
- Evaluated revision: `8646fcc9f74f38539c6cdb4c969723336a96ddcd` (2026-03-01).
- License observation on 2026-10-21: that revision contains no license file;
  GitHub's repository metadata reports no declared license.

## Ideas from the source

Choose a visual structure that explains the subject. Research technical content
before drawing. Use branches, converging paths, timelines, and feedback loops
where they clarify relationships. Inspect rendered output and revise defects.

## gdstack implementation

All text and code in this skill are original. No upstream text, templates,
palette, or renderer is bundled. There is therefore no copied upstream block to
merge or relicense. The skill is covered by the repository's MIT license. Its
npm dependencies retain their own licenses and are installed through the lockfile.

The additions come from a local rendering trial: six undersized text elements
looked complete in exports but clipped in the actual editor. The trial also
encountered a failed transitive CDN import. The new renderer uses pinned local
packages, explicit font loading, source text measurements, reciprocal binding
checks, and screenshots of the actual editor in both themes.

The skill does not inherit fixed box ratios, mandatory visual variety, a fixed
palette, a ban on generators, or a required iteration count. Those choices
depend on the content and the user's request.

## Future updates

Review later source revisions for useful ideas, rather than replacing this
entrypoint with upstream text. Check licensing before copying any upstream
material. For dependency upgrades, update the package pins and lockfile together,
run the regression tests, and inspect a real diagram in both editor themes.
Update this provenance record and CREDITS.md when the reference revision changes.
