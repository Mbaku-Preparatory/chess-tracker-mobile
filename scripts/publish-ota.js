#!/usr/bin/env node
// Publishes the current JavaScript as an over-the-air update, with the checks that keep a bad
// publish from reaching phones.
//
//   pnpm publish:ota:preview                          test phones (APKs from pnpm build:apk)
//   pnpm publish:ota:production                       everyone on the Play Store build
//   pnpm publish:ota:production --message "Fix X"     describe it (default: last commit subject)
//   add --dry-run to run every check and stop before publishing
//
// Checks, in order:
//   1. production refuses uncommitted changes; preview only warns
//   2. node_modules is reinstalled from the lockfile, so the fingerprint below is computed from
//      the same packages EAS Build used
//   3. a finished build on this channel has this tree's runtime version (fingerprint). Otherwise
//      something native changed since that build - a package, app.json, eas.json - and the update
//      would go to a runtime no phone has, reaching nobody. Ship a new build instead
//   4. the JS version goes up by one per publish: 1.0.5 is the store build, then 1.0.5.1, 1.0.5.2.
//      It is read back from the last update on this runtime, so there is nothing to keep in sync
//
// The bundle gets the same EXPO_PUBLIC_* values as the channel's store build, taken from that
// profile in eas.json, and never the local .env - which points at localhost during development
// and would ship an app that cannot reach the backend.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHANNELS = ["preview", "production"];

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

// Returns stdout. A non-zero exit stops the script, unless allowFailure(output) says that failure
// is expected, in which case it returns null.
const run = (command, args, { capture = false, env, allowFailure } = {}) => {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    env: env ?? process.env,
  });
  if (result.status === 0) return capture ? result.stdout : "";
  if (allowFailure?.(`${result.stdout}${result.stderr}`)) return null;
  fail(`${command} ${args.join(" ")} exited with ${result.status}\n${capture ? result.stderr : ""}`);
};

const eas = (args, options) => run("npx", ["-y", "eas-cli", ...args, "--non-interactive"], options);

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    const hasValue = next !== undefined && !next.startsWith("--");
    args[argv[i].slice(2)] = hasValue ? next : true;
    if (hasValue) i += 1;
  }
  return args;
};

const args = parseArgs(process.argv.slice(2));
const channel = args.channel;
if (!CHANNELS.includes(channel)) fail(`--channel must be one of: ${CHANNELS.join(", ")}`);
if (args.message === true) fail("--message needs a value");
const dryRun = Boolean(args["dry-run"]);

// 1. Committed code only on production, so every published update maps to a commit.
const dirty = run("git", ["status", "--porcelain"], { capture: true }).trim();
if (dirty && channel === "production") fail(`Uncommitted changes. Commit them first:\n${dirty}`);
if (dirty) console.warn(`\n⚠ Uncommitted changes (allowed on preview):\n${dirty}`);

// 2.
console.log("\n→ Installing node_modules from the lockfile…");
run("pnpm", ["install", "--frozen-lockfile"]);

// 3. Resolved exactly the way `eas update` resolves it. Managed workflow because android/ is
//    gitignored and generated on EAS - a local android/ folder must not change the answer.
console.log("\n→ Working out the runtime version…");
const resolved = run(
  "pnpm",
  ["exec", "expo-updates", "runtimeversion:resolve", "--platform", "android", "--workflow", "managed"],
  { capture: true }
);
const runtimeVersion = JSON.parse(resolved.trim().split("\n").pop()).runtimeVersion;
if (!runtimeVersion) fail(`Could not read the runtime version from:\n${resolved}`);

const builds = JSON.parse(
  eas(
    ["build:list", "--platform", "android", "--channel", channel, "--runtime-version", runtimeVersion,
      "--status", "finished", "--limit", "1", "--json"],
    { capture: true }
  )
);
if (builds.length === 0) {
  fail(
    `No finished ${channel} build has runtime version ${runtimeVersion}.\n` +
      "Something native changed since the last build (a package, app.json, eas.json, assets),\n" +
      "so no phone could run this update. Undo that change, or ship a new build:\n" +
      `  ${channel === "production" ? "pnpm build:aab" : "pnpm build:apk"}`
  );
}
console.log(`✔ Matches ${channel} build ${builds[0].id} (runtime ${runtimeVersion})`);

// 4. Messages are written as "<js version>: <text>" below; update:list shows them quoted.
const appVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")).expo.version;
const listed = eas(
  ["update:list", "--branch", channel, "--runtime-version", runtimeVersion, "--limit", "1", "--json"],
  // The branch only exists after the first publish to the channel. Any other failure stops the
  // script: guessing "none yet" would restart the numbering and move the JS version backwards.
  { capture: true, allowFailure: (output) => output.includes("Could not find branch") }
);
const lastMessage = listed ? JSON.parse(listed).currentPage?.[0]?.message ?? "" : "";
const lastJsVersion = (lastMessage.match(/^"?(\d+(?:\.\d+)+):/) || [])[1];
const jsVersion = lastJsVersion?.startsWith(`${appVersion}.`)
  ? lastJsVersion.replace(/\d+$/, (n) => String(Number(n) + 1))
  : `${appVersion}.1`;
console.log(`✔ JS version ${jsVersion}${lastJsVersion ? ` (last on this runtime: ${lastJsVersion})` : ""}`);

const subject = run("git", ["log", "-1", "--pretty=%s"], { capture: true }).trim();
const message = `${jsVersion}: ${args.message || subject}`;
const profileEnv = JSON.parse(fs.readFileSync(path.join(ROOT, "eas.json"), "utf8")).build[channel].env;
const env = { ...process.env, ...profileEnv, EXPO_PUBLIC_JS_VERSION: jsVersion, EXPO_NO_DOTENV: "1" };
const updateArgs = ["update", "--channel", channel, "--platform", "android", "--environment", channel, "--message", message];

if (dryRun) {
  console.log(`\n(dry run) would run: eas ${updateArgs.join(" ")}`);
  console.log(`  with API ${profileEnv.EXPO_PUBLIC_API_BASE_URL}\n`);
  process.exit(0);
}
eas(updateArgs, { env });
console.log(`\n✔ Published ${jsVersion} to ${channel}. Phones pick it up on their next launch.`);
console.log(`  To force it on everyone: set MOBILE_MIN_JS_VERSION=${jsVersion} on Railway.\n`);
