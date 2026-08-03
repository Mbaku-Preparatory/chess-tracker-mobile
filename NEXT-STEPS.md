# Next steps — building an APK

## Goal
Build an Android APK of this app, save it in this folder (`chess-tracker-mobile-app/`),
pointing at the **production Railway backend** — not localhost.

## Blocker: need the Railway public URL
We need the backend's public domain (something like `https://<name>.up.railway.app`).

Ways to get it:
1. **Preferred — Railway dashboard**: open the backend service → **Settings** →
   **Networking** → under "Public Networking" there should be a domain listed
   (click "Generate Domain" if none exists yet). Paste that URL back.
2. Railway CLI is installed and was previously logged in, but its **token expired**
   (stored in `~/.railway/config.json`, `tokenExpiresAt` ~2026-04-28) and a fresh
   `railway login` didn't visibly succeed in this sandbox.
3. **Known issue**: the `railway` CLI in this environment writes its output
   directly to the TTY device instead of stdout/stderr, so **none of its output
   is capturable via the Bash tool** — not even `railway help` or `railway --version`.
   Every invocation returns empty output regardless of success/failure. Don't
   waste time debugging this again; either have the user run `railway` commands
   themselves and paste the output, or just get the URL from the dashboard (option 1).
4. Local config already has a linked project (found at `~/.railway/config.json`):
   - project: `8c2ceed5-0e6d-445f-8583-6cc43fea3124`
   - environment: `production`
   - linked directory (stale, doesn't exist here): `/home/clifford/chess-tracker`
   - This confirms which Railway project to look at, but doesn't give the domain itself.

## Once we have the URL
1. `cd chess-tracker-mobile-app`
2. `cp .env.example .env` (if not already done)
3. Set `EXPO_PUBLIC_API_BASE_URL=<railway-url>/api` in `.env` (append `/api` if
   the URL doesn't already end in it — see `src/lib/api.ts` normalization logic,
   it also handles this automatically either way).
4. Build the APK. Two options, both viable in this environment:
   - **Local build (no Expo account needed)** — Android SDK is already present
     (`$ANDROID_HOME=/home/clifford/Android/Sdk`, `adb` on PATH):
     ```
     npx expo prebuild -p android
     cd android && ./gradlew assembleRelease
     ```
     Output APK lands in `android/app/build/outputs/apk/release/app-release.apk`
     — copy it into this folder afterward. Note: `assembleRelease` needs a signing
     config or it'll produce an unsigned APK; for local testing `assembleDebug`
     is simpler (no signing needed) if a release build isn't required.
   - **EAS Build (cloud)** — `eas` CLI is installed. Requires an Expo account
     login (`eas login`) and produces a build via Expo's servers (slower, but no
     local Android toolchain quirks). `eas build -p android --profile preview`
     with a `local` output flag can download the APK directly.
5. Double-check the built app actually hits Railway, not localhost — the
   `EXPO_PUBLIC_*` env var gets baked in at build time by Metro, so if `.env`
   was wrong at build time, rebuilding is the only fix (can't patch after the fact).

## Also parked (from earlier discussion)
Local Stockfish engine fallback for mobile — deliberately **not** implemented yet.
Findings from research (see prior conversation): Hermes does not support
WebAssembly (despite some inaccurate blog claims about RN 0.84 — verified false
against the official RN blog and Hermes maintainers' own statements), so the
only path is a native TurboModule (`@loloof64/react-native-stockfish` /
`@udaychauhan/react-native-stockfish`, Stockfish 17, same codebase). Caveats:
small/low-adoption library (9 GitHub stars), iOS marked "untested" in its README,
and it requires abandoning Expo Go for a custom dev client (`expo prebuild` +
EAS Build or local native build). Decision was to leave the mobile app on
Lichess-cloud-eval-only for now and revisit this later.
