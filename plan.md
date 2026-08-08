## Plan: Fitness Evaluation Desktop App (Tauri)

Greenfield Tauri v2 + React/TypeScript desktop app (macOS/Windows) for a personal trainer to manage members and body-composition evaluations, culminating in a PDF report generator (comparison tables + side-by-side photos + full evolution graphs) shared manually via WhatsApp. No login. SQLite embedded via Rust (rusqlite), photos stored as BLOBs. Mobile (iOS/Android) is explicitly deferred to a future phase, but the PDF pipeline is built with a cross-platform JS library so it will still work when mobile is added later.

**Decisions**
- Frontend: React + TypeScript + Vite (Tauri v2 template), Tailwind + shadcn/ui components.
- Routing: React Router (HashRouter, required for Tauri asset protocol).
- Data fetching/cache: TanStack Query wrapping typed `invoke()` calls.
- Forms: react-hook-form + zod validation.
- DB access: Rust-native — rusqlite (bundled sqlite3) + hand-rolled SQL migrations + typed Tauri commands (no tauri-plugin-sql, for type safety).
- Photos: stored as BLOB columns in SQLite (member face photo; evaluation front/side-right/side-left/back). Default placeholder avatar bundled as a static asset when member has no face photo.
- Charts: Recharts for on-screen Evolução tab.
- PDF generation: `@react-pdf/renderer` (cross-platform, runs in webview, no headless Chromium needed) — chosen specifically because it also works on Tauri Mobile later. Charts embedded in PDF are rasterized to PNG (via `html-to-image`/canvas snapshot of the Recharts components) and inserted as `<Image>`.
- WhatsApp sending: manual — app only saves/exports the PDF file (via native save dialog); user attaches it in WhatsApp themselves. No API/deep-link integration.
- Evaluation "número": auto-computed as count of member's existing evaluations + 1 (not user-editable).
- i18n: none — all UI text authored directly in Brazilian Portuguese (single language, no login/multi-tenant need).
- Mobile (iOS/Android): out of scope for this plan; UI is built responsive (Tailwind breakpoints) so it's mobile-ready, but actual Tauri Mobile builds/signing/permissions are a separate future plan.

**Steps / Phases**

### Phase 0 — Project Scaffolding
1. Init Tauri v2 app with React+TS+Vite template; add Tailwind, shadcn/ui, React Router (Hash), TanStack Query, react-hook-form, zod.
2. Add Rust deps in `src-tauri/Cargo.toml`: `rusqlite` (bundled feature), `serde`/`serde_json`, `chrono`. Set up app data dir path for the sqlite file via Tauri's path API.
3. Verify: `npm run tauri dev` launches an empty window on macOS without errors.

### Phase 1 — Data Layer (Rust) — *depends on Phase 0*
1. Write SQL migrations (manual runner, executed on app startup) for `members` and `evaluations` tables covering every field in DOCS.md (member: name, phone, birthday, gender, face_photo BLOB nullable; evaluation: member_id FK, date, number, weight, height, all perimeter measurements, all bioimpedance fields, 4 photo BLOBs). Index `evaluations(member_id, date)`.
2. Define Rust structs (`Member`, `NewMember`, `Evaluation`, `NewEvaluation`) with serde for IPC.
3. Implement Tauri commands: `members_create/list/get/update/delete`, `evaluations_create/list/get/update/delete` (auto-sets `number`), photo byte read/write.
4. Verify: Rust unit tests using in-memory sqlite covering CRUD + numbering logic (1st, 2nd, 3rd evaluation gets number 1/2/3; deleting/re-adding does not renumber existing rows).

### Phase 2 — Member Management UI — *depends on Phase 1*
1. Members list page: grid of cards (face photo w/ default fallback, name, phone), search-by-name filter.
2. `MemberForm` (create/edit) with react-hook-form + zod: name, phone, birthday, gender, face photo picker (file dialog → bytes → command).
3. Delete member confirmation dialog.
4. Verify: manually create/edit/delete members in dev app; list updates via React Query invalidation.

### Phase 3 — Evaluation Management UI — *depends on Phase 2*
1. Member detail page shell with shadcn `Tabs`: **Dados** (reuses `MemberForm` in edit mode), **Avaliações**, **Evolução**.
2. Avaliações tab: list of evaluations (date + número), defaults to showing the most recent; actions to view/edit/add.
3. `EvaluationForm` with all fields grouped into sections (Peso/Altura, Perímetros, Bioimpedância, Fotos — 4 photo uploads with preview).
4. Verify: add several evaluations to a test member, confirm auto-numbering and that edits persist correctly.

### Phase 4 — Evolução Tab — *depends on Phase 3 data*
1. Recharts line charts grouped by metric family (peso/IMC, perímetros, bioimpedância) plotted across all of a member's evaluations ordered by date.
2. Photo carousel (shadcn/embla carousel) showing evaluation photos over time.
3. Verify: visually check chart rendering with 1, 2, and 5+ evaluations (sparse-data edge cases shouldn't break axes/lines).

### Phase 5 — PDF Generation — *depends on Phase 3 & 4* (highest-risk phase)
1. Build `EvaluationPdfDocument` (`@react-pdf/renderer`): header/cover, comparison tables per DOCS.md rule (1 evaluation = no comparison; 2 = compare those 2; 3+ = first + last two by default), side-by-side photo grid for the same selected evaluations, and a final section with full evolution graphs built from **all** evaluations (rasterized Recharts → PNG via `html-to-image`, embedded as `<Image>`).
2. "Gerar PDF" selection modal: default preselects first + last two (or fewer per rule above); lets the trainer swap which evaluation fills each comparison slot; per-item "remove" button that drops it from comparison (removing down to 1 falls back to single-evaluation report, per DOCS.md item 9).
3. Wire native save flow: generate PDF bytes in the webview, use `tauri-plugin-dialog` save dialog + `tauri-plugin-fs` (or a Tauri command) to write the file to the chosen path.
4. Verify: generate PDFs for the 1/2/3+ evaluation scenarios; confirm tables, side-by-side photos, and evolution graphs render/paginate correctly when opened.

### Phase 6 — Responsive Polish — *depends on Phases 2-5 UI existing*
1. Apply Tailwind responsive breakpoints across Members list, Member detail tabs, and forms so the app stays usable at narrow (~375px) widths, preparing for the future mobile phase.
2. Verify: resize the dev window down to phone-sized width on each page and confirm no overflow/broken layout.

### Phase 7 — Desktop Packaging — *depends on all above*
1. Configure `tauri.conf.json` bundle identifiers, app icons, and default-avatar asset; set targets for macOS (.dmg) and Windows (.msi/.exe).
2. Verify: `tauri build` produces a working macOS artifact locally; Windows artifact build documented as a manual/CI step (needs a Windows machine or GitHub Actions runner).

**Relevant files** (all new — greenfield project)
- `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — Rust deps and bundle config
- `src-tauri/src/db/` — migrations + connection setup
- `src-tauri/src/models/{member,evaluation}.rs` — serde structs
- `src-tauri/src/commands/{members,evaluations}.rs` — Tauri commands
- `src/pages/MembersListPage.tsx`, `src/pages/MemberDetailPage.tsx`
- `src/components/members/{MemberForm,MemberCard}.tsx`
- `src/components/evaluations/{EvaluationForm,EvaluationList}.tsx`
- `src/components/evolution/{EvolutionCharts,PhotoCarousel}.tsx`
- `src/components/pdf/EvaluationPdfDocument.tsx`, `src/components/pdf/PdfSelectionModal.tsx`
- `src/lib/tauri-commands.ts`, `src/lib/queries.ts`

**Further Considerations**
1. Chart rasterization quality in the PDF (Recharts SVG → PNG via `html-to-image`) should be spot-checked early in Phase 5 for resolution/print sharpness — small spike recommended before building the full PDF layout.
2. Migration approach is intentionally simple (hand-rolled SQL runner) given the small, stable schema — revisit only if schema churn becomes frequent.
3. Mobile phase (Tauri Mobile iOS/Android: camera permissions, touch nav, signing/store distribution) should be scoped as its own follow-up plan once desktop ships.
