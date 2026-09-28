# Handoff: SIAL Paris 2026 – Exhibition Notes App (Luiten Food)

## Overview
Internal mobile app for the Luiten Food sales & purchasing team visiting supplier stands at SIAL Paris 2026 (Paris Nord Villepinte, 17–21 Oct 2026). Staff log a stand visit in under 30 seconds, see planned meetings per day, manage follow-up actions with an owner, and export a day summary to the team / CRM.

Target: **Android and iPhone** (team uses both). Must work **offline** in the exhibition halls and sync when back online. UI language **NL (default) + EN toggle**.

## About the Design Files
The files in `prototype/` are **design references created in HTML** — a clickable prototype showing intended look and behavior, not production code. Recreate the design in a real mobile stack. No codebase exists yet; recommended: **React Native + Expo** (one codebase for Android + iOS, camera/audio/file APIs, EAS builds for APK / Play Store / TestFlight). Local storage: SQLite (expo-sqlite) or WatermelonDB with a sync queue. Backend: any (Supabase / Firebase / small REST API) for team sync.

Open `prototype/SIAL Notes App.dc.html` in a browser (served over a local web server, e.g. `npx serve prototype`) to click through. All logic (data model, state, translations) is in the `<script data-dc-script>` block at the bottom of that file — the `TX` object holds every NL/EN string verbatim.

## Fidelity
**High-fidelity.** Final colors, type, spacing and copy per the Luiten Food huisstijl. Recreate pixel-accurately, adapting to platform conventions (Android back gesture, safe areas, system keyboard). Sample data (suppliers, prices) is fictional.

## Screens / Views
Device reference: 402×874pt. Bottom tab bar (4 tabs) + floating "+" button. All headers navy `#022D4E` with white text; content area `#F4F5F6`; 20px horizontal padding.

### 1. Vandaag / Today (tab 1)
- **Header (navy)**: padding 58 20 0. Full-width co-branded logo (`assets/logo-wide.png`, white on navy). Row: eyebrow "SIAL PARIS · PARIS NORD VILLEPINTE" (Oswald 12px, uppercase, letter-spacing .12em, `#98CD50`) + sync status right (7px dot `#98CD50` online / `#99ABB9` offline + label, 12px `#CCE5A8`: "Gesynchroniseerd" / "Offline · N te synchroniseren").
- Title row: "DAG 1 · ZA 17 OKT" (Oswald 700, 28px, uppercase, lh 1.1) + **language toggle** right: 2 segments (round 16px flag + "NL"/"EN", Oswald 12px), 1px border `#335773`, active segment bg `#98CD50`.
- 3px × 36px green rule `#98CD50`.
- **Day picker**: 5 equal columns, gap 6px, each button: weekday (11px uppercase) + date (Oswald 500 20px). Selected: bg + border `#98CD50`; others transparent with 1px `#335773` border. Square corners.
- **Stats row**: 3 white cards (gap 8, padding 12, shadow `0 2px 8px rgba(2,45,78,.06)`): number Oswald 600 26px (hot leads in `#3EA448`), label 12px `#668196`. "Notities vandaag", "Hot leads", "Open acties".
- **Geplande afspraken**: section title Oswald 600 16px uppercase ls .04em. Rows: white card, grid `52px 1fr auto`, padding 12 14: time (Oswald 500 17px), company (Oswald 600 15px uppercase, ellipsis) + "Hal 6 · 6 F 045 · Contact" (13px `#668196`), right: Badge "Vastgelegd" (tint) if a note exists, else green link "Notitie →" (Oswald 13px uppercase `#3EA448`).
  - Tap logged meeting → Note detail. Tap unlogged → New note, prefilled company/stand/contact, and linked to the meeting on save.
- **Recente notities**: last 3 notes of the selected day; row: animal icon 40×28, company, "time · Hal X · stand", priority badge. "Alle notities →" → Notes tab.

### 2. Notities / Notes (tab 2)
- Header: "NOTITIES" (Oswald 700 28px) + sync status. Search field: white, 44px high, square, search icon `#668196`, placeholder "Zoek bedrijf, contact, stand". Searches company, contact, stand and note text.
- Filter pills (DS `Tag`, horizontal scroll, no-wrap): Alle, Rund, Lam, Gevogelte, Wild, Ibérico / varken, Eend & gans.
- Result count (13px `#668196`). Note cards: icon + company + "Hal · stand · time" + priority badge; 2-line clamped note text (14px/1.5); footer divider `#E1E4E5` with contact left and attachments right ("2 foto's · kaartje · spraakmemo", 12px).
- Empty: "Geen notities gevonden."

### 3. Acties / Follow-ups (tab 3)
- Header "ACTIES" + segmented control Open · N / Klaar · N (2 cols, 1px `#668196` border, active bg `#98CD50`, Oswald 14px uppercase).
- Task card: grid `24px 1fr 32px`: DS `Checkbox`; text 15px 600 (done: line-through, `#99ABB9`); "Company · deadline ma 26 okt" 13px; owner avatar 32px navy circle with initials (Oswald 12px). Tap text → note detail. No FAB on this tab.

### 4. Overzicht / Day summary (tab 4)
- Header "DAGOVERZICHT" + green rule + compact day picker.
- Stats: Bezoeken, Hot leads, Nieuwe acties (for selected day).
- "Per productgroep": white list, rows `40px 1fr auto` (icon, group, count Oswald 18px), only groups with ≥1 note.
- "Hot leads": cards with company, contact · stand, price line on `#F1F8E7` (if price field enabled).
- "Open acties per persoon": avatar, name, first open task (ellipsis), count.
- **Export block** (navy bg, white text, padding 18): title "EXPORTEREN" + status right ("Nog niet geëxporteerd" / "Geëxporteerd 17:42"), description, DS Button primary "Mail naar team" (full width), DS Button inverse "Naar CRM", text link "Download CSV →" (`#98CD50`). Each shows a Toast on success.

### 5. Notitie detail (pushed screen)
- Header: back link (chevron + previous tab name, `#98CD50`), company (Oswald 700 24px uppercase), "Country · Hal · stand" (14px `#CCE5A8`), priority badge.
- Info card rows (grid `110px 1fr`, dividers `#E1E4E5`): Contactpersoon (name + role), Productgroep (icon + label), Vastgelegd (time door initials).
- Price & volume box (`#F1F8E7`, eyebrow Oswald 12px `#3EA448`).
- "NOTITIE" text 16px/1.6.
- Media grid 3 cols, square tiles: business card, photos, voice memo (in prototype: striped placeholders; build as real thumbnails / audio player).
- Follow-ups list with checkbox, deadline, owner avatar. Buttons: secondary "Mail samenvatting", outline "Sluiten".

### 6. Nieuwe notitie / New note (full-screen modal, slides up 300ms)
- Header: "Annuleer" (left), "NIEUWE NOTITIE" (Oswald 600 18px), "Bewaar" (right, `#98CD50`).
- Fields (DS `Input`): **Bedrijf*** (required), Stand + Contactpersoon (2 cols), Productgroep (3×2 grid of icon tiles; selected: 2px navy border, bg `#E3F1CF`), Prioriteit (3-segment Hot / Warm / Koud; selected navy bg white text), Notitie (multiline 4 rows), Prijs & volume (optional, can be hidden by setting), attachment tiles Visitekaartje / Foto / Spraakmemo (selected: 2px `#3EA448` border, bg `#F1F8E7`), Actie box (`#F4F5F6`): task text + "Toewijzen aan" owner avatars (36px circles).
- Primary full-width "Notitie opslaan".
- Validation: empty company → error "Vul een bedrijfsnaam in", no save.
- On save: note added to top, meeting link set, go to Notes tab, Toast "Notitie opgeslagen" + "Gedeeld met het SIAL-team." or offline "Opgeslagen op deze telefoon. Synchroniseert zodra je weer online bent."

### Tab bar
Navy, 84px incl. safe area, 4 equal columns: icon 22px (Lucide 2px stroke: calendar, file-text, check-square, clipboard-list) + label Oswald 11px uppercase ls .08em. Active: `#98CD50` + 3px green top bar; inactive `#99ABB9`. Hidden while New note is open.
**FAB**: 60×60 square, `#98CD50` (hover/press `#3EA448`), white plus, shadow `0 6px 18px rgba(2,45,78,.25)`, right 20 / bottom 100. Visible on Today + Notes.

## Interactions & Behavior
- Transitions: detail fade-in 250ms ease; modal slide-up 300ms ease; toast slide-up 250ms, auto-dismiss 2.8s. No bounce.
- Language toggle switches all UI strings instantly and persists. Dates formatted per locale ("za 17 okt" / "Sat 17 Oct").
- Offline-first: all writes go to local DB; sync queue uploads when online; header shows pending count.
- Real device features to implement (placeholders in prototype): camera for business card + photos (optionally OCR business card into contact fields), audio recording for voice memo, share sheet / mail composer for summaries, CSV file export.

## State / Data Model
```
Note     { id, company, country, hall, stand, contact, role, group: beef|lamb|poultry|game|pork|duck,
           priority: hot|warm|cold, day (0–4), time, createdBy, text, price, attachments[], meetingId?, syncedAt? }
Task     { id, noteId, text, owner, dueDate, done }
Meeting  { id, day, time, company, stand, contact, noteId? }
Attachment { id, noteId, type: card|photo|voice, uri, durationSec? }
User     { id, initials, name }  // team: SV, IB, MK (sample)
Settings { lang: nl|en, showPrices: bool }
```
UI state: activeTab, selectedDay, detailNoteId, captureOpen, filter, query, taskView (open|done), draft form, toast, exportedAt per day.
Backend needs: auth (team members), notes/tasks/meetings CRUD with sync, attachment upload, meeting import (e.g. from Outlook calendar or CSV), CRM export endpoint (CRM to be confirmed with Luiten IT).

## Design Tokens (Luiten Food huisstijl)
- Navy `#022D4E` (text, headers, tab bar) · Green `#98CD50` (actions, active, rules) · Accent green `#3EA448` (hover, hot-lead numbers, links)
- Tints: `#F1F8E7`, `#E3F1CF`, `#CCE5A8` · Blue-greys: `#335773`, `#668196`, `#99ABB9` · Greys: `#C5CCCD` (input border), `#E1E4E5` (dividers), `#F4F5F6` (app bg), white cards
- Type: **Oswald** (titles/labels, uppercase, 400–700) · **Source Sans 3** (body 13–16px, lh 1.5–1.6)
- Radius: 0 everywhere; circles only for avatars/flags; pills for filter tags
- Shadow: cards `0 2px 8px rgba(2,45,78,.06)`; FAB `0 6px 18px rgba(2,45,78,.25)`
- Spacing: 20px screen padding; 8–12px gaps in lists; 20–24px between sections
- No emoji. Arrows "→" allowed in link CTAs.
Full tokens: `prototype/_ds/.../tokens/*.css`. Component specs (Button, Badge, Tag, Input, Checkbox, Toast): `prototype/_ds/.../_ds_bundle.js`.

## Assets
- `assets/logo-wide.png` — approved LF × TFI co-brand logo (white, for navy). Never alter.
- `assets/animals/*.svg` — navy butcher-cut silhouettes: rund (beef), lam (lamb), kip (poultry), hert (game), varken (pork/Ibérico), eend (duck).
- `assets/flags/nl.svg`, `en.svg` — round flags for language toggle.
- UI icons: Lucide (2px stroke).
- Fonts: `prototype/_ds/.../fonts/` (Oswald, Source Sans 3).

## Files
- `prototype/SIAL Notes App.dc.html` — full prototype (template + logic + NL/EN strings + sample data)
- `prototype/support.js`, `prototype/ios-frame.jsx` — prototype runtime / phone frame only (do not port)
- `prototype/_ds/` — Luiten Food design system tokens, fonts, components
- `prototype/assets/` — logos, animal icons, flags

## Open questions for Luiten
- Which CRM (for export/integration)?
- Source of planned meetings (Outlook, CSV, manual)?
- Distribution: internal APK / MDM, or Play Store + TestFlight?
