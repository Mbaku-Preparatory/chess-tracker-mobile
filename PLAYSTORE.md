# Releasing to the Play Store

> Supersedes `RELEASING.md`, which this file replaces wholesale. Last worked on
> **2026-08-18**.

## Where things stand

| | |
|---|---|
| Identity verification | **Cleared 2026-08-17.** No longer blocking. |
| Version | `1.0.5` / `versionCode 7` — never published |
| Privacy policy | Live, 200 signed out, covers all four processors |
| Device test | Founder testing in progress |
| Closed testing | **Not started — see the warning below** |

### ⚠️ Read this before planning a launch date

For a **personal** developer account, Play requires a closed test with
**12 testers opted in continuously for 14 days** before you can even apply for
production access. That is a calendar dependency, not a task. The fourteen days
start once all twelve are in, and a tester who opts out resets their own
contribution — so recruit the twelve *before* uploading.

Verify the current threshold in the Console; Google has changed these numbers
before. If it still applies, the earliest possible production date is roughly
two weeks after the closed track fills, regardless of how ready the binary is.

## Identity — do not change these casually

| | |
|---|---|
| Application id | `com.chesspreparatory.app` |
| Store name | Chess Preparatory |
| Backend | `https://mbaku-preparatory-production.up.railway.app/api` |
| Privacy policy | `https://www.chesspreparatory.com/privacy` |

The application id is **permanent**. Google Play binds a listing to it forever;
changing it means publishing a brand-new app with zero installs and reviews.

> **The URL above is live and returns 200 signed out**, which is how a reviewer
> opens it. Two things still need doing by hand, because neither lives in this
> repo: the **Play Console listing** must be pointed at it (it historically named
> `chess-tracker-frontend.vercel.app`, which is *not ours* and now serves an
> unrelated chess site), and the same URL goes in the **Data safety** form's
> privacy policy field.
>
> **Keep the policy and the binary in step.** On 2026-08-13 the policy still said
> the app contained "no analytics, advertising, crash-reporting or tracking SDKs
> of any kind" — two days after Sentry shipped in `1.0.4`. A policy that
> contradicts the binary is grounds for suspension *after* approval, which is far
> worse than a rejection. Any SDK that sends data off the device changes three
> things at once: the policy page, the Data safety answers below, and the
> in-app disclosure. Change all three or none.

## App access — test credentials for reviewers

The app is entirely behind a login, so Play Console's **App access** section
must carry working credentials. Leaving it blank gets the review rejected.

**The account must be pre-verified.** In this codebase `is_active` means "has
verified their email" (`users/models.py:22`), and `LoginView` returns 403
*"Please verify your email before logging in"* otherwise (`users/views.py:116`).
A Google reviewer cannot receive your verification email.

**Recommended route — sign up through the app itself:**

1. Register in the app with a throwaway address you control (not your personal
   account — reviewers can see these credentials).
2. Verify by email normally. Brevo is configured and mail does arrive.
3. Open Magnus Carlsen and Hikaru Nakamura, which are seeded automatically
   (see below), and tap Import once on each so the pages have real games.
4. Paste that username and password into App access.

This gives real credentials, populated content, and a free end-to-end test of
the signup flow on the build you are about to ship.

**Fallback — create it directly**, if signup is unavailable:

```bash
railway run python manage.py shell -c "
from django.contrib.auth import get_user_model
from players.services.sample_players import create_sample_players
U = get_user_model()
u, created = U.objects.get_or_create(
    username='playreview',
    defaults={'email': 'playreview@example.com', 'is_active': True},
)
u.is_active = True
u.set_password('<pick-a-strong-password>')
u.save()
create_sample_players(u)   # create_user bypasses registration, so seed by hand
print('created' if created else 'updated', u.username, u.is_active)
"
```

No `AccountStatus` row is needed — `user_is_disabled` handles its absence,
which is the normal case.

### Sample players on new accounts

`players/services/sample_players.py` (backend) seeds **Magnus Carlsen** and
**Hikaru Nakamura** onto every account at registration, so nobody — reviewer or
real user — opens on an empty list.

| | Magnus | Hikaru |
|---|---|---|
| chess.com | `magnuscarlsen` | `hikaru` |
| Lichess | `DrNykterstein` | *(blank on purpose)* |
| FIDE | `1503014` | `2016192` |

All verified against the live sources on 2026-08-18. Hikaru's Lichess field is
**deliberately empty**: the account named `Hikaru` there carries no title and is
not him, and seeding it would import a stranger's games onto his page for every
new user.

The rows carry handles but **no games** — importing is one tap on the player
page, not something that happens at signup. That is deliberate: registration
happens once, cannot be retried without support, and may not depend on a third
party being up.

## Payments are web-only, on purpose

`TipSection` is gated behind `Platform.OS === "web"` in `AccountScreen`, so the
packaged Android app contains no way to send money.

Google Play requires its own billing system for in-app purchases. There are
carve-outs, and a voluntary tip to a developer may well sit inside one — but
the edge between "donation" and "payment for a digital service" is exactly
where listings get rejected, and getting it wrong *after* approval is a
suspension of an application id Google binds to the listing permanently.

The web tip flow is untouched and still takes real money through Paystack.

**Before ungating this**, in order: read Google's current Payments policy on
donations, answer the Data safety form's financial-info questions, and confirm
the privacy policy's "Supporting the project" section still matches — it
currently states in as many words that the Android app does not include this.

## Build

```bash
pnpm eas:login     # interactive, one time — cannot be automated
pnpm build:aab     # eas build -p android --profile production → the .aab
```

The production profile builds an **app bundle** (`.aab`), which is what Play
requires. `pnpm build:apk` (the `preview` profile) is for sideloading to a test
device only; `pnpm build:dev` is the dev client.

On the first build EAS will offer to generate an upload keystore. Accept, and let
EAS hold it. If you ever take the keystore local instead, back it up somewhere
you cannot lose it: losing the upload key means you can no longer ship updates to
the listing.

### Two known warnings, both harmless

**"Detected that your app uses Expo Go for development."** Fires only because
`expo-dev-client` is not a dependency; that is the sole signal EAS checks. It
does not affect the AAB — the production profile compiles the real native app,
and Expo Go is never in that path. This project cannot run in Expo Go anyway
(local native module `ringtone-picker`, config plugins, an `android/` dir).
The honest fix, when convenient, is `npx expo install expo-dev-client` — not
`EAS_BUILD_NO_EXPO_GO_WARNING=true`, which hides the signal without changing
anything.

**Sentry source maps are not uploaded** (`SENTRY_DISABLE_AUTO_UPLOAD` in all
three `eas.json` profiles). Crashes still report, but stack traces are
minified. That was a deliberate fix to unbreak the EAS build (`ad5885e`).

### Why the API URL lives in `eas.json`, not `.env`

`.env` is gitignored, and EAS Build only uploads git-tracked files. A cloud build
therefore sees no `EXPO_PUBLIC_API_BASE_URL`, silently falls back to the
`http://localhost:8000/api` default in `src/lib/api.ts`, and produces a release
that builds green but cannot reach the backend from any device. The URL is set
per-profile in `eas.json` to prevent that. It is not a secret — every
`EXPO_PUBLIC_*` value is baked into the shipped JS bundle regardless.

## Bumping the version

`eas.json` sets `appVersionSource: "local"`, so both values come from `app.json`
and neither is incremented automatically. **Every** upload to Play needs a
`versionCode` strictly higher than the last one, or the Console rejects it:

```jsonc
"version": "1.0.5",               // versionName — what users see
"android": { "versionCode": 7 }   // must increase on every single upload
```

Then update **`MOBILE_LATEST_VERSION` in Railway's variables** to match, so the
in-app "update available" banner is accurate. Do not edit the default in
`config/settings/base.py` — those defaults are deliberately inert fallbacks, and
the whole point of the gate being env-driven is that changing it never needs a
backend deploy.

There is **no EAS Update configured**, so every JS change needs a new build and
a new store release. Batch changes and bump `versionCode` once at the end.

## Forcing an update (emergency)

Set on Railway — no code change, no rebuild:

| Variable | Effect |
|---|---|
| `MOBILE_MIN_VERSION` | Anything below this is hard-blocked with the update screen |
| `MOBILE_BLOCKED_VERSIONS` | Comma-separated kill switch for specific bad builds, without raising the floor |
| `MOBILE_UPDATE_MESSAGE` | Optional custom text on the update screen |

The gate fails open at every layer: unset variables leave it inert, an unparseable
client version is let through, and the app treats any network error as "carry on".
That is deliberate — a gate that fails closed turns a config typo into an app
nobody can open.

## Permissions

`app.json` pins an explicit allowlist and a `blockedPermissions` list. The blocks
matter: `expo-image-picker` declares `RECORD_AUDIO` and `CAMERA` for capture, but
this app only ever calls `launchImageLibraryAsync`, and shipping an unjustified
microphone or draw-over-other-apps permission invites a policy review hold.

`blockedPermissions` works by emitting `tools:node="remove"` into the manifest,
which the Gradle manifest merger applies at build time — so the permissions are
still visible in `android/app/src/main/AndroidManifest.xml` after a prebuild and
only actually disappear from the merged output. To verify:

```bash
npx expo prebuild --clean -p android
cd android && ./gradlew :app:processReleaseManifest
grep -o 'android:name="android.permission[^"]*"' \
  app/build/intermediates/merged_manifest/release/processReleaseManifest/AndroidManifest.xml
```

Expected: `INTERNET`, `POST_NOTIFICATIONS`, `READ_MEDIA_IMAGES`, `VIBRATE`, plus
`RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `ACCESS_NETWORK_STATE`, `READ_APP_BADGE`,
`USE_BIOMETRIC`/`USE_FINGERPRINT` from expo-notifications and expo-secure-store.

Be ready to justify `READ_MEDIA_IMAGES` if asked. If nothing still uses image
picking, dropping it is cleaner than defending it.

`android/` is gitignored and regenerated by prebuild — never hand-edit it. All
native config belongs in `app.json`.

## Play Console — Data Safety answers

Verified against the code, not assumed. Re-verified 2026-08-13 after Sentry and
the Mbaku assistant shipped — the previous version of this table was written
before both and answered "no" where the answer is now "yes".

| Question | Answer |
|---|---|
| Collects data? | Yes |
| Name, email address | Collected, required, for account management. **Also sent to Sentry** — `identifyUser()` attaches the signed-in email to crash reports |
| **FIDE ID** | **Collected** — optional at signup, stored on the user's own player row. New since the last answers were written; do not reuse an old form |
| Photos | **Not collected** — profile picture is written to device local storage only, never uploaded |
| Location, contacts, calendar, financial info | Not collected |
| App activity — other user-generated content | **Collected** — questions asked of Mbaku and the answers, stored against the account and sent to Anthropic |
| App info and performance — crash logs, diagnostics | **Collected** — `@sentry/react-native`, see `src/lib/monitoring.ts` |
| Advertising / tracking | None. No ad SDK, no ad ID, `tracesSampleRate: 0` |
| Data encrypted in transit? | Yes (HTTPS) |
| Users can request deletion? | Yes — in-app, Account → Danger zone, plus by email per the policy |

**Financial info must stay "not collected"** — that is true *only* because tips
are gated out of the native build. If that gate ever comes off, this answer and
the privacy policy both become wrong.

**The one row worth reading the Console's own wording on: "shared".** Google
distinguishes *shared* (transferred to another company for their own use) from
*processed by a service provider on your behalf*. Sentry and Anthropic are the
latter — they process under our instruction, and Anthropic's API terms do not
train on the data. That makes "No" to sharing defensible, but it is the answer
most likely to be second-guessed, so answer it deliberately rather than by
habit, and make sure the policy page names both companies (it does, under
"Where your data is stored").

Chess.com, Lichess, chess-results.org and FIDE are read *from* on the user's
instruction; no user data is sent to them.

### What ships in the binary that touches data

| SDK | What leaves the device | Where it is configured |
|---|---|---|
| `@sentry/react-native` | Stack traces, device model, OS and app version, navigation breadcrumbs, signed-in email. Not field contents (`sendDefaultPii: false`), off in dev | `src/lib/monitoring.ts` |
| Mbaku assistant (via our backend) | The question, plus an opponent briefing built from stored game data. No email, no password, no prep notes | `players/services/assistant.py` (backend) |

## Still needs a human

- [x] Play Console developer account and identity verification — **cleared 2026-08-17**
- [ ] **Closed testing track: 12 testers × 14 continuous days.** Start recruiting now; see the warning at the top
- [ ] Point the Console's privacy policy field at `www.chesspreparatory.com/privacy`
- [ ] Data safety form — fresh pass, not a reuse. FIDE ID is new
- [ ] Store listing: short (80 char) + full (4000 char) description, feature
      graphic (1024×500), 512×512 icon, at least two phone screenshots, app
      category, content rating questionnaire, target audience, ads declaration (none)
- [ ] Device test on hardware — nothing had run on a phone since the
      `useNavigationState` crash
- [ ] `pnpm eas:login`, then `pnpm build:aab`
- [ ] Deploy the backend if sample-player seeding is to be live at signup
      (it is a backend change; pushing `develop` deploys to Railway production)
