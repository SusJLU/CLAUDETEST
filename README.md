# SIAL Notes — Luiten Food

> **Huidige hoofdversie:** de webapp in [`luiten-crm-webapp/`](luiten-crm-webapp/LEESMIJ.md) (Flask + SQLite, mobiele web-app voor Android en iPhone). VPS-installatie: [`luiten-crm-webapp/deploy/INSTALLATIE-VPS.md`](luiten-crm-webapp/deploy/INSTALLATIE-VPS.md). Hieronder: de eerdere Android-app (Expo).

Internal Android app (React Native + Expo) for the Luiten Food sales & purchasing team at
**SIAL Paris 2026** (Paris Nord Villepinte, 17–21 Oct 2026). Log a stand visit in under 30 seconds,
keep planned meetings per day, manage follow-ups and export the day.

Design reference: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md).

## What it does

| Tab | |
|---|---|
| **Vandaag / Today** | Day picker (17–21 Oct), stats, planned meetings, recent notes, NL/EN toggle. `+ Afspraak` adds a meeting; press and hold a meeting to edit/delete it. Tapping an unlogged meeting opens a new note prefilled and linked to it. |
| **Notities / Notes** | Search (company, contact, stand, text, country) and product-group filter. |
| **Acties / Follow-ups** | Open / done follow-ups with checkbox, owner and deadline. |
| **Overzicht / Summary** | Day stats, per product group, hot leads, open actions per person, day export and **Export everything**. Gear icon → settings (language, "this phone belongs to", price field). |

- **New note** (green +): company*, stand, contact, country, role, product groups (select one or more; *Overig / Other*
  asks what product), priority, note, price & volume,
  business card photo, photos (camera or gallery), voice memo (recorded on the phone), follow-up with owner and deadline.
- **Notities scannen / Scan notes** (under the note field): photograph a handwritten page; on-device OCR
  (Google ML Kit, bundled model — works offline) reads it and appends the text to the note for checking. The photo is
  kept with the note as a *handwritten page*. Several pages can be scanned. Clear handwriting and good light help; it
  reads Latin script (NL/EN/FR/ES/DE…).
- **Note detail**: photo thumbnails (tap to enlarge), voice memo playback, follow-ups, *Mail samenvatting*, edit, delete.
- **Offline-first**: everything is stored on the phone in SQLite (`sial-notes.db`) and the app's media folder.
  There is no server; sharing happens through mail/CSV/JSON export. Notes carry a `syncedAt` field so a sync
  backend can be added later.

## Exports

| Button | Output |
|---|---|
| Mail naar team | Opens the mail app with the day summary as text, the day CSV and all day photos/memos attached. |
| Naar CRM | `sial-2026-crm-dag-N.csv` — one row per supplier contact (company, contact, rating, notes, open follow-ups…). |
| Download CSV | `sial-2026-dag-N.csv` — all notes of the day. |
| **Alles exporteren → Alle data (JSON)** | `sial-2026-export-YYYYMMDD-HHMM.json` — every note, follow-up and meeting of all days. |
| **Alles exporteren → Alle data + media (ZIP)** | Same JSON as `data.json` plus `notes.csv`, `tasks.csv`, `meetings.csv`, `README.txt` and `media/<noteId>/…` (jpg / m4a). |

Each file export asks **Opslaan in map** (pick a folder, e.g. Downloads or Drive) or **Delen…** (share sheet).
CSV files use `;` as separator with a UTF-8 BOM so Dutch Excel opens them in columns.

### JSON format (`schema: "luitenfood.sial-notes.export"`, `schemaVersion: 2`)

Designed to be handed to Claude (or any script) for later processing:

```jsonc
{
  "schema": "luitenfood.sial-notes.export",
  "schemaVersion": 2,
  "exportedAt": "2026-10-17T16:42:00.000Z",
  "exportedBy": "SV",
  "app": { "name": "SIAL Notes", "version": "1.0.0", "platform": "android" },
  "event": { "name": "SIAL Paris 2026", "venue": "Paris Nord Villepinte",
             "days": [{ "index": 0, "date": "2026-10-17" }, …] },
  "description": "…human-readable explanation of the fields…",
  "team": [{ "id": "SV", "name": "Sander V." }, …],
  "counts": { "notes": 12, "tasks": 7, "openTasks": 5, "meetings": 9, "attachments": 14 },
  "notes": [{
    "id": "…", "company": "Pampa Grass-Fed Beef", "country": "Argentina", "hall": "6", "stand": "6 F 045",
    "contact": "Martín Ríos", "role": "Export manager",
    "groups": ["beef", "other"], // one or more of beef | lamb | poultry | game | pork | duck | other
    "otherGroup": "Fish",        // free text when "other" is selected
    "priority": "hot",          // hot | warm | cold
    "day": 0, "date": "2026-10-17", "time": "10:40", "createdBy": "SV",
    "text": "…", "price": "…", "meetingId": "…" ,
    "createdAt": "…", "updatedAt": "…", "syncedAt": null,
    "tasks": [{ "id": "…", "text": "…", "owner": "SV", "ownerName": "Sander V.", "dueDate": "2026-10-23", "done": false, "createdAt": "…" }],
    "attachments": [{ "id": "…", "type": "photo", "durationSec": null, "createdAt": "…", "file": "media/<noteId>/photo-<id>.jpg" }]
  }],
  "meetings": [{ "id": "…", "day": 1, "date": "2026-10-18", "time": "10:00", "company": "…", "stand": "…", "contact": "…", "noteId": null, "createdAt": "…" }]
}
```

Attachment types: `card`, `photo`, `page` (handwritten notes; OCR text is already in `text`), `voice`.
v1 → v2: `group` (string) became `groups` (array) + `otherGroup`.

`attachments[].file` is `null` in the JSON-only export and a path inside the ZIP in the media export.

## Build the APK

Requirements: Node 20+, JDK 17–21, Android SDK (platform 36, build-tools 36).

```bash
npm install
npx expo prebuild -p android --clean          # generates ./android (not committed)
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# → android/app/build/outputs/apk/release/app-release.apk
```

**Size:** R8 minify, resource shrinking and compressed native libs are enabled via `expo-build-properties` in `app.json` (APK ≈ 31 MB universal, ≈ 23 MB arm64-only with `-PreactNativeArchitectures=arm64-v8a`; the OCR model adds ~10 MB).

**Signing:** release builds are signed with the keystore described in `credentials/keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; the `.jks` sits in `credentials/`). That folder is
git-ignored — keep the keystore safe: updates only install over an existing app when they are signed with the
same key. Without it, release builds fall back to the debug key (`plugins/withReleaseSigning.js`).

Development: `npx expo run:android` (device/emulator) or `npx expo start` with a development build.

Before a new release, bump `version` and `android.versionCode` in `app.json`.

## Project layout

```
App.tsx                 shell: tabs, FAB, detail, capture modal, sheets, toasts, Android back
src/theme.ts            Luiten Food colours, fonts, shadows
src/i18n.ts             NL / EN strings
src/constants.ts        fair dates, product groups, team (SV, IB, MK), date helpers
src/db.ts               SQLite schema + queries
src/store.tsx           app state and actions (React context)
src/media.ts            camera / gallery / file helpers
src/export.ts           CSV, summaries, JSON + ZIP export, save/share/mail
src/ui.tsx              design-system components (Button, Badge, Tag, Input, Checkbox, Toast, icons)
src/screens/            Today, Notes, FollowUps, Summary, Detail, Capture, Sheets (meeting + settings)
modules/sial-ocr/       local Expo module: on-device OCR (ML Kit text recognition, Android)
src/svgAssets.ts        animal-cut and flag SVGs from the handoff
```

## Not in this version

- Team sync / backend (all data stays on the phone; use the exports).
- Business card OCR into contact fields (handwritten notes are OCR'd into the note text).
- Direct CRM integration (CRM still to be confirmed with Luiten IT — the CRM CSV is a generic lead import).
- Editable team list (sample team SV / IB / MK in `src/constants.ts`).
