# upload-with-ai

A Grist custom widget built with `grist-widget-sdk`: **upload a file per
row, extract its text, and scan it with an LLM** into structured columns.
Drop (or pick) a file onto the linked row's `File` attachment column; the
widget extracts raw text locally (PDF.js for PDFs, plain-text otherwise),
sends it to a configurable AI gateway, and writes the results back into the
mapped `FileMetadata` (JSON), `FileExtract` (raw text), and `AiText`
(LLM-generated document text) columns.

`src/App.tsx` renders `WidgetApp` (`src/components/widget-app.tsx`) plus a
`sonner` `Toaster`, and re-exports `GRIST_OPTIONS`/`WIDGET_METADATA` from
`src/grist-options.ts` (which declares the required `File` (Attachments)
column plus the three optional output columns, and requests `full` access
so the widget can write back). `src/widget-entry.tsx` re-exports the same
for programmatic consumers.

- **File handling**: `src/components/file-drop-zone.tsx` +
  `src/hooks/use-file-upload.ts` +
  `src/lib/{file-picker,parse-file-metadata,pdf-text}.ts` (PDF.js text
  extraction lives in `pdf-text.ts`).
- **AI scanning**: everything under `src/ai/` — the gateway client + config
  (`gateway-client.ts`, `gateway-config*.ts`, `use-ai-gateway-config.ts`),
  the OpenAI-compatible scan pipeline (`scan-file.ts`, `scan-input.ts`,
  `scan-prompt.ts`, `scan-schema.ts`, `scan-progress.ts`), and the settings
  UI (`ai-gateway-settings-dialog.tsx`, `gateway-model-selector.tsx`). The
  gateway URL/key/model are stored client-side.

`src/main.tsx` wraps the app with `GristWidgetProvider`, `GristBoundary`
(gated on `"canRender"` since columns are declared, with a 4s unavailable
grace), and `GristSdkAlerts`. Opened outside a Grist iframe, `main.tsx`
renders the showcase hub (`TemplateLanding`) at a bare path or a
`ChannelNotice` on `/latest/`, `/dev/`, `/v<version>/`
(`src/lib/showcase-routing.ts`); when embedded, `GristStatusChip` shows live
handshake status. `GristSdkAlerts` maps `getGristSdkAlertDescriptors()` from
the SDK to shadcn `Alert`.

- **ESLint** blocks direct `grist` global usage in `src/` — use the SDK only.
- The `File` column is required; `FileMetadata`/`FileExtract`/`AiText` are
  optional outputs. Mapping alerts use `GristSdkAlerts`.

To add widget tests later, see [Testing](https://github.com/ArthurBlanchon/grist-widget-sdk/blob/main/apps/docs/guide/testing.md) (`renderWithGrist` from `grist-widget-sdk/emulator/testing`).

## Deployment

A bundled GitHub Actions workflow (`.github/workflows/deploy.yml` +
`scripts/deploy.mjs`) publishes this widget to **your own** GitHub Pages.

### The workflow: always develop on `dev`, release by merging to `main`

1. Commit and push to the `dev` branch (created for you at scaffold time).
   Every push auto-deploys a live preview at `/dev/` that self-reloads
   inside an open Grist document a few seconds later — paste that URL into
   a Grist doc once, then just keep pushing while you iterate.
2. Ready to publish a release? **Bump `package.json`'s `version`** as part
   of your `dev` branch changes, then open a PR from `dev` into `main`.
3. **Merge the PR.** This is the step that actually publishes — merging to
   `main` builds immutable `/v<version>/` and updates mutable `/latest/`.

> ⚠️ **Merging without bumping the version publishes nothing.** The release
> build is idempotent — it skips whenever `package.json`'s version already
> has a matching `v<version>/` directory published, which is always true if
> you forgot to bump it (it'll match whatever's already live). The PR merges
> cleanly and CI runs "successfully," but `/latest/` silently stays exactly
> as it was. Bump the version *before* merging, not after.

After merging, keep committing to the same `dev` branch for your next round
of changes — it's the permanent working/preview branch for this widget, not
a one-off feature branch to delete and recreate. Deleting it retires `/dev/`
automatically.

> ⚠️ **Used GitHub's "Use this template" button instead of `npm create
> grist-widget`?** That path copies this repo's default branch verbatim —
> it doesn't run any of the CLI's own setup (renaming `package.json`,
> titles, etc.), and whatever version happens to be checked into the
> source repo's `package.json` (which can be well past `0.0.1`) comes along
> with it. **The moment the repo is created, GitHub's own initial push to
> `main` fires this workflow and publishes a clean `v0.0.1`** — your first
> release always resolves to `v0.0.1` regardless of what `package.json`
> says, so `/`, `/latest/`, and `/v0.0.1/` all go live right away (once
> you've done the one-time Pages setup below). You don't reset the version
> by hand: on that first release the pipeline also **rewrites
> `package.json`'s version back to `0.0.1` in the repo itself** (a commit it
> pushes to `main`/`dev`), so your *next* release naturally bumps to
> `0.0.2` instead of jumping to whatever inherited number you started with.
> If you also checked **"Include all branches"** (to get `gh-pages`/Pages
> already set up, no manual Settings step), that first release also clears
> out every leftover bit of inherited content it finds — stray
> `v<version>/` dirs, and a root/`latest/` still pointing at the *source*
> repo's own path — before writing its own. A `v<version>/` only counts as
> a genuine prior release once it carries a `showcase-meta.json` naming
> *this* repo, so on a repo with no genuine releases yet, everything else is
> provably inherited noise and gets safely replaced. On that same first
> release, every branch except `main`, `dev`, and `gh-pages` is pruned and
> `dev` is force-reset to match `main`'s tip — a fresh widget always starts
> from `main == dev`, whether it came from the CLI (already true) or a
> template copy (may have inherited a stray branch, or a `dev` full of the
> source template's own unrelated preview history). All of this only ever
> applies before your *first* genuine release — once one exists, it's
> permanently a no-op, so it's still safest to never manually re-seed
> `gh-pages` again after that point.

**One-time setup** (the workflow can't do this part for you):

1. **Settings → Pages** → Source: "Deploy from a branch" → branch `gh-pages`
   → `/ (root)`. The workflow creates the `gh-pages` branch itself the first
   time it runs (if it doesn't exist yet), but Pages needs to be pointed at
   it once.
   > ⚠️ **Not `main`.** If Pages is left on (or accidentally set to) `main`,
   > it serves this repo's raw, unbuilt source — including a script tag
   > pointing at `/src/main.tsx` — instead of the built site. The symptom is
   > a blank/black page with a 404 for `/src/main.tsx` in the browser
   > console, even though the workflow itself reports success (it pushed the
   > right build to `gh-pages`; Pages is just reading from the wrong place).
2. **Settings → Actions → General → Workflow permissions** → "Read and write
   permissions". New repos sometimes default the workflow's token to
   read-only, which would fail the push to `gh-pages` with a 403.
3. If the repo is private, set **Pages visibility to Public** — a widget
   embeds inside a Grist iframe, which needs a publicly reachable URL.

No manifest/widget-catalog file is generated — that's a multi-widget,
Grist-widget-repository concept this single-widget template doesn't need.
Paste your `/latest/` or `/v<version>/` URL directly into Grist's custom
widget URL field.

