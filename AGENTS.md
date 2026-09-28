This is an Expo (SDK 57) / React Native app: **SIAL Notes** for Luiten Food. See README.md.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo or React Native API,
check the installed type declarations in `node_modules/<package>/build/*.d.ts` or the versioned docs at
`https://docs.expo.dev/versions/v57.0.0/`.

## Conventions

- Navigation is a small state machine in `App.tsx` (tabs + detail + capture modal), mirroring the design prototype —
  no Expo Router.
- All UI strings live in `src/i18n.ts` (NL + EN); never hard-code copy in screens.
- Colours/fonts from `src/theme.ts`. Square corners everywhere; circles only for avatars/flags; no emoji.
- Data goes through `src/store.tsx` → `src/db.ts` (SQLite). Media files live in the app document dir `media/`.
- The JSON export schema (`src/export.ts` → `buildJson`) is consumed downstream; bump `schemaVersion` on breaking changes.

## Commands

```bash
npx expo install <package>   # instead of npm install <package>
npx tsc --noEmit             # typecheck
npx expo-doctor              # dependency check
npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)
```
