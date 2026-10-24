# AGENTS.md

Instructions for coding agents (and humans) working in this repository.

## What this is

**Personal** — an offline gym evaluation app for personal trainers: manage members,
record body-composition evaluations, compare photos/measurements side by side, and
generate a PDF report shared manually over WhatsApp.

- **Frontend**: React 19 + TypeScript + Vite, Tailwind 4, shadcn/ui-style Radix components,
  TanStack Query, React Router (HashRouter), react-hook-form + Zod, Recharts.
- **Backend**: Rust + Tauri 2, with embedded SQLite via `rusqlite` (bundled). Rust is the
  only layer that touches the database.
- **Targets**: macOS/Windows desktop. Android is supported via Tauri Mobile; iOS is not set
  up yet. The UI is responsive (min width 375px) so it works on tablet.
- **Language**: all UI strings are Brazilian Portuguese. Code, comments and docs are English.

`DOCS.md` holds the original requirements and `plan.md` the implementation plan — treat
them as the source of truth for intended behavior.

## Layout

```
src/                     React frontend
  components/            feature folders: members, evaluations, evolution, payments,
                         pdf, photos, settings, shared, ui
  lib/                   tauri command clients, queries, schemas, metrics, dates
  pages/                 MembersListPage, MemberDetailPage
src-tauri/
  src/commands/          typed Tauri commands exposed to the frontend
  src/repo/              SQLite access (CRUD, payments, backup) + `#[cfg(test)]` tests
  src/models/            serde structs
  src/db/migrations/     numbered SQL migrations
  gen/android/           committed Android Studio project (hand-edited — see below)
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | install frontend deps (Node 22, matching CI) |
| `npm run dev` | Vite only, in a browser at http://localhost:1420 |
| `npm run tauri dev` | full desktop app with hot reload |
| `npm run build` | `tsc` type-check + Vite production build — **the only frontend check** |
| `npm run tauri build` | packaged desktop bundle |
| `cd src-tauri && cargo test` | Rust unit tests |
| `cd src-tauri && cargo clippy --all-targets` | lints (what CI runs) |

There is no JS test runner and no ESLint/Prettier/rustfmt config. Keep `npm run build`,
`cargo test` and `cargo clippy --all-targets` green — that is exactly what CI enforces.

## Conventions

- **Migrations are append-only.** Add `NNNN_description.sql` to `src-tauri/src/db/migrations/`
  and never edit one that has shipped — they are tracked in the `schema_migrations` table.
- **Rust tests live beside the code** in `src-tauri/src/repo/*.rs` under `#[cfg(test)]`,
  using in-memory/tempfile SQLite. Add tests there for repo-level behavior.
- **Frontend talks to Rust only through typed commands**, wrapped in `src/lib/tauri-commands.ts`
  and cached with TanStack Query. Do not add a second data path.
- **Photos are SQLite BLOBs**, transferred as base64.
- Keep UI text in pt-BR.

## Versioning

Bump the app version on **every** branch that changes code, following semantic versioning
according to the kind of change:

- **fix** → patch (`0.6.0` → `0.6.1`)
- **feature** → minor (`0.6.0` → `0.7.0`)
- **breaking change** → major (`0.6.0` → `1.0.0`)

Keep the version in sync in all of these files:

| File | Field |
| --- | --- |
| `package.json` | `version` |
| `package-lock.json` | root `version` (appears twice) |
| `src-tauri/tauri.conf.json` | `version` |
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/Cargo.lock` | the `avaliacao` package entry |

## Android

`src-tauri/gen/android/` is a **committed** Android Studio project, not a throwaway build
artifact. It contains hand-made edits, so:

- **Do not re-run `tauri android init`.** It regenerates the project from templates and would
  discard the changes below. If you ever must regenerate, re-apply them and diff carefully.
- **Never commit secrets.** `keystore.properties`, `local.properties` and `.jks` files are
  gitignored. The signing keystore lives outside the repo at `~/upload-keystore.jks`; its
  password is in the gitignored `gen/android/keystore.properties` and in the maintainer's
  password manager. Never write that password into a tracked file.
- **The app identifier is `com.personal.avaliacao`** — deliberately generic, no personal name.
  It becomes the Android `namespace`/`applicationId` and the `com/personal/avaliacao` source
  folder, and it is the app's permanent identity, so don't change it once shipped.

Hand-applied changes to preserve:

1. `app/build.gradle.kts` — `ndkVersion = "27.0.12077973"`, plus a release `signingConfigs`
   block that reads `rootProject.file("keystore.properties")`. The whole block is guarded by
   `if (keystorePropertiesFile.exists())`, so a clone without a keystore still builds
   (unsigned release APK) instead of failing configuration.
2. `app/src/main/AndroidManifest.xml` — tablet entries: `android.hardware.touchscreen`
   not required, `<supports-screens largeScreens/xlargeScreens>`, and
   `android:resizeableActivity="true"`.

Versioning: `versionCode` is derived from `version` in `tauri.conf.json`
(`major*1000000 + minor*1000 + patch`), so bumping the app version bumps the code.

Local setup: JDK 17, Android SDK and NDK 27.0.12077973 (the `ndkVersion` above must match
`ANDROID_NDK_VERSION` in `.github/workflows/build-android.yml`).

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export NDK_HOME="$ANDROID_HOME/ndk/27.0.12077973"

npm run tauri android build -- --apk --target aarch64   # fast; arm64 tablets
npm run tauri android build -- --apk                    # all ABIs; needed for x86_64 emulators
```

Output: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`.
Install with `adb install -r <apk>`.

## CI

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | PR, push to `main` | frontend build; `cargo test` + `cargo clippy` |
| `build-windows.yml` | manual, `v*` tags | Windows bundle; publishes a draft release on tags |
| `build-android.yml` | manual, `v*` tags | signed APK; uploads artifact, attaches to draft release on tags |

The Android workflow needs repository secrets `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
and `ANDROID_KEY_BASE64` (`base64 -i ~/upload-keystore.jks`). It writes
`keystore.properties` at build time and installs the matching NDK.

## Known gaps

- **PDF save is desktop-shaped.** "Gerar PDF" uses `tauri-plugin-dialog`'s native save
  dialog + `tauri-plugin-fs` writes. On Android's scoped storage this needs rework
  (write to app storage, then use a share sheet). Test on-device before trusting it.
- **No camera plugin.** Photos come from a file picker; capturing from the camera on a
  tablet is not implemented.
- `src-tauri/capabilities/default.json` still references the desktop schema and scopes
  `fs` permission to the main window.
