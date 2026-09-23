# The Small Hours

This is the static site for Jeff's painted stories, served by GitHub Pages from `main` at the repository root.

## Rules

- The story folders are build output. Edit the sources, then run `bash tools/build.sh`. Never edit a copy here. The sources are:
  - `~/AIS-OS/content/youtube/drafts/ten-thousand-windows/web`
  - `~/AIS-OS/content/youtube/drafts/finite-time/publish`
  - `~/Downloads/Hand Over Hand`
- The Ten Thousand Windows card image needs that project's dev server on port 8791 (`preview_start` name `ten-thousand-windows`).
- The repository is public. Never add private files. That means the Finite Time clue map, contact sheets, and research drafts stay out. Run the security audit's history scan before every push that adds new kinds of files.
- Publishing an update needs Jeff's approval for each change.

## Mistakes to avoid

- A local server started for a screenshot kept a folder locked and broke the next build. Stop every server you start.
