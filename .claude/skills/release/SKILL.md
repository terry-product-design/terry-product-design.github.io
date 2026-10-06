---
name: release
description: Publish the portfolio site — verify the build, commit the current changes and push to GitHub, which deploys to GitHub Pages. Use when Terry types /release or asks to release, publish or update the live site.
---

# Release the portfolio site

Terry runs `/release` after editing the site. The goal: get the current local changes live on
https://terrywu799.github.io/terry-productdesign/ safely. Reply in Traditional Chinese.

Repository: https://github.com/terrywu799/terry-productdesign (branch `main`).
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and deploys to GitHub Pages.

## Steps

1. **Check there is something to release.**
   Run `git status --short`. If nothing changed and nothing is unpushed (`git log origin/main..main`;
   if `origin/main` doesn't exist yet this is the first release — continue), say the live site is
   already up to date and stop.

2. **Verify the build.**
   Run `BASE_PATH=/terry-productdesign SITE_URL=https://terrywu799.github.io npm run build`.
   If it fails, stop, explain the error in plain language, and offer to fix it. Never push a broken build.

3. **Review what's going out.**
   Look at `git status` and `git diff --stat` (and the diff itself for copy changes). Check for things
   that must not be published:
   - files over 50 MB, `.env` or credentials, `node_modules/`, `dist/`
   - unblurred personal data in new screenshots (names, emails, phone numbers)
   If something looks wrong, ask before continuing.

4. **Summarize and commit.**
   Give Terry a short list of what changed, in plain words (pages and sections, not file paths).
   Commit everything with a concise English message describing the change, e.g.
   `Update experience: IDEKU role ended Sep 2026`. Follow the commit attribution rules of the session.

5. **Push.**
   `git push origin main` (first release ever: `git push -u origin main`; if GitHub says the repository
   doesn't exist, ask Terry to create it at https://github.com/new?name=terry-productdesign&visibility=public
   — empty, no README). If authentication fails, explain that GitHub needs a Personal Access Token
   (classic, `repo` + `workflow` scopes) entered as the password once; macOS Keychain will remember it.
   Do not ask Terry to paste the token into the chat.

6. **Report.**
   Tell Terry the push succeeded, that the site updates in about 1–2 minutes, and give:
   - Live site: https://terrywu799.github.io/terry-productdesign/
   - Deploy progress: https://github.com/terrywu799/terry-productdesign/actions
   If a check of the Actions page (or `curl -s https://api.github.com/repos/terrywu799/terry-productdesign/actions/runs?per_page=1`)
   shows the run failed, read the failure and offer to fix it.

## Notes

- Always build before pushing. Never force-push, never rewrite history.
- Keep commits as one logical change per release unless Terry asks otherwise.
- The site is served under `/terry-productdesign/`; all internal links use `import.meta.env.BASE_URL`,
  so don't hard-code root-relative paths in new pages.
