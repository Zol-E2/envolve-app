// Records the read-aloud texts (page tips, welcome cards, course builder) with an
// ElevenLabs voice, so "Read aloud" sounds natural instead of using the
// browser's built-in voice.
//
//   npm run speech:generate             record new or changed texts
//   npm run speech:generate -- --dry    only show what would be recorded
//   npm run speech:generate -- --force  record everything again
//   npm run check:speech                list texts without a recording (no API key needed)
//
// Needs ELEVENLABS_API_KEY in .env.local. Writes public/speech/<locale>/<id>.mp3
// and lib/onboarding/speech-manifest.json; commit both. Texts without a
// recording fall back to the browser's voice, so nothing breaks in between.
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { IntlMessageFormat } from "intl-messageformat";
import {
  COURSE_FORM_SPEECH,
  TEACHER_WELCOME_SPEECH,
  WELCOME_SPEECH,
  joinForSpeech,
  speechId,
} from "../lib/onboarding/speechText.mjs";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL("lib/onboarding/speech-manifest.json", root);
const LOCALES = ["hu", "en"];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const dryRun = args.has("--dry") || args.has("--dry-run");
const force = args.has("--force");

for (const file of [".env.local", ".env"]) {
  if (process.env.ELEVENLABS_API_KEY) break;
  try {
    process.loadEnvFile(new URL(file, root));
  } catch {
    // file missing: fine
  }
}

// eleven_v4: ElevenLabs' highest-quality model with Hungarian support. Latency
// does not matter here because the files are recorded ahead of time.
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_v4";
// "Alice – Clear, Engaging Educator", one of ElevenLabs' built-in voices,
// for both languages. Built-in voices are free via the API; the tutor's
// library voices would need a paid ElevenLabs plan.
const ALICE = "Xb7hH8MSUJpSbSDYk0k2";
const VOICES = {
  hu: process.env.ELEVENLABS_VOICE_HU || ALICE,
  en: process.env.ELEVENLABS_VOICE_EN || ALICE,
};
const API = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io";
const FORMAT = "mp3_44100_64";

// --- the texts, built exactly like the app builds them ---------------------

const readMessages = (locale) =>
  JSON.parse(readFileSync(new URL(`messages/${locale}.json`, root), "utf8"));

const format = (message, locale) => String(new IntlMessageFormat(message, locale).format());

/** @returns {Map<string, string>} recording id -> text */
const speechTexts = (locale) => {
  const messages = readMessages(locale);
  const texts = [];

  // Tips: every Tour.<page>.<step> with a title and a text
  for (const page of Object.values(messages.Tour)) {
    if (!page || typeof page !== "object") continue;
    for (const step of Object.values(page)) {
      if (step && typeof step === "object" && step.title && step.text) {
        texts.push(joinForSpeech([format(step.title, locale), format(step.text, locale)]));
      }
    }
  }

  // Welcome cards
  for (const [card, keys] of Object.entries(WELCOME_SPEECH)) {
    texts.push(joinForSpeech(keys.map((key) => format(messages.Welcome[card][key], locale))));
  }

  // Teacher welcome cards
  for (const [card, keys] of Object.entries(TEACHER_WELCOME_SPEECH)) {
    texts.push(joinForSpeech(keys.map((key) => format(messages.TeacherWelcome[card][key], locale))));
  }

  // Course builder questions, for students and in the teacher's wording
  for (const keys of Object.values(COURSE_FORM_SPEECH)) {
    texts.push(joinForSpeech(keys.map((key) => format(messages.CourseForm[key], locale))));
    texts.push(
      joinForSpeech(keys.map((key) => format(messages.CourseFormTeacher?.[key] ?? messages.CourseForm[key], locale)))
    );
  }

  return new Map(texts.map((text) => [speechId(text), text]));
};

// --- manifest and files ----------------------------------------------------

const readManifest = () => {
  try {
    return JSON.parse(readFileSync(manifestUrl, "utf8"));
  } catch {
    return { model: "", voices: {}, files: {} };
  }
};

const writeManifest = (manifest) => {
  for (const locale of LOCALES) manifest.files[locale]?.sort();
  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
};

const audioDir = (locale) => new URL(`public/speech/${locale}/`, root);
const audioFile = (locale, id) => new URL(`${id}.mp3`, audioDir(locale));

const manifest = readManifest();
const plan = LOCALES.map((locale) => {
  const texts = speechTexts(locale);
  const sameVoice = manifest.model === MODEL && manifest.voices?.[locale] === VOICES[locale];
  const recorded = new Set(sameVoice ? manifest.files?.[locale] ?? [] : []);
  const missing = [...texts].filter(
    ([id]) => force || !recorded.has(id) || !existsSync(audioFile(locale, id))
  );
  return { locale, texts, missing };
});

const missingCount = plan.reduce((sum, { missing }) => sum + missing.length, 0);
const characters = plan.reduce(
  (sum, { missing }) => sum + missing.reduce((n, [, text]) => n + text.length, 0),
  0
);

if (checkOnly) {
  if (missingCount === 0) {
    console.log("Read-aloud recordings OK: every tip has a recording.");
  } else {
    // A warning, not an error: without a recording the browser voice reads it
    console.warn(
      `Read-aloud: ${missingCount} text(s) have no recording yet and will use the browser voice.\n` +
        "Run npm run speech:generate to record them."
    );
  }
  process.exit(0);
}

console.log(
  `Model ${MODEL}, voices hu=${VOICES.hu} en=${VOICES.en}\n` +
    plan.map(({ locale, texts, missing }) => `${locale}: ${texts.size} texts, ${missing.length} to record`).join("\n") +
    `\nCharacters to record: ${characters}`
);

if (dryRun) {
  for (const { locale, missing } of plan) {
    for (const [id, text] of missing) console.log(`  [${locale}] ${id}: ${text}`);
  }
  process.exit(0);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (missingCount > 0 && !apiKey) {
  console.error("ELEVENLABS_API_KEY is missing. Add it to .env.local and run again.");
  process.exit(1);
}

const record = async (locale, text) => {
  const send = (withLanguage) =>
    fetch(`${API}/v1/text-to-speech/${VOICES[locale]}?output_format=${FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        ...(withLanguage ? { language_code: locale } : {}),
      }),
    });

  let response = await send(true);
  let body = response.ok ? null : await response.text();
  // Some models do not accept language_code; the voice then reads by the text
  if (!response.ok && response.status === 400 && /language/i.test(body)) {
    response = await send(false);
    body = response.ok ? null : await response.text();
  }
  if (!response.ok) {
    const hint =
      response.status === 401 ? " (check ELEVENLABS_API_KEY)" :
      response.status === 402 || /quota|credits/i.test(body) ? " (the ElevenLabs plan does not allow this: paid plan or more credits needed)" :
      response.status === 429 ? " (too many requests, try again in a minute)" : "";
    throw new Error(`ElevenLabs answered ${response.status}${hint}: ${body.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

// Start from a manifest that matches the current voice and model
if (manifest.model !== MODEL) manifest.files = {};
manifest.model = MODEL;
manifest.voices ??= {};
manifest.files ??= {};

let recordedNow = 0;
let removed = 0;
try {
  for (const { locale, texts, missing } of plan) {
    mkdirSync(audioDir(locale), { recursive: true });
    if (manifest.voices[locale] !== VOICES[locale]) manifest.files[locale] = [];
    manifest.voices[locale] = VOICES[locale];
    const done = new Set((manifest.files[locale] ?? []).filter((id) => texts.has(id)));

    for (const [id, text] of missing) {
      process.stdout.write(`[${locale}] ${text.slice(0, 60)}… `);
      writeFileSync(audioFile(locale, id), await record(locale, text));
      done.add(id);
      manifest.files[locale] = [...done];
      writeManifest(manifest); // keep progress if a later text fails
      recordedNow++;
      console.log("ok");
    }
    manifest.files[locale] = [...done];

    // Remove recordings of texts that no longer exist
    for (const file of readdirSync(audioDir(locale))) {
      if (file.endsWith(".mp3") && !texts.has(file.slice(0, -4))) {
        unlinkSync(new URL(file, audioDir(locale)));
        removed++;
      }
    }
  }
} catch (error) {
  console.error(`\n${error.message}`);
  writeManifest(manifest);
  console.error(`Stopped after ${recordedNow} recording(s); run again to continue.`);
  process.exit(1);
}

writeManifest(manifest);
console.log(`Done: ${recordedNow} recorded, ${removed} old file(s) removed.`);
