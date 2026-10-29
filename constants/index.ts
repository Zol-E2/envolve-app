// Subjects available for selection when creating a course.
// Each one needs an icon in components/SubjectTile.tsx (SUBJECT_ICONS).
export const subjects = [
  "maths",
  "language",
  "science",
  "history",
  "coding",
  "economics",
];

// Pastel background colours for subject tiles, always shown with the
// subject's icon (dark navy icon on these: 9:1 or more)
export const subjectsColors = {
  science: "#E3D4FF",
  maths: "#FFE08A",
  language: "#BFE3FF",
  coding: "#FFCCE5",
  history: "#FFD9B8",
  economics: "#C9F0DA",
};

// ElevenLabs voice IDs per lesson language and gender.
// Used by buildLessonCall() in lib/ai/assistants.ts; the voice model itself
// (eleven_v4_turbo) is set on the saved Vapi assistants.
export const voices = {
  hu: { male: "TumdjBNWanlT3ysvclWh", female: "tnSpp4vdxKPjI9w0GnoV" },
  en: { male: "2BJW5coyhAzSr8STdHbE", female: "ZIlrSGI4jZqobxRKprJz" },
};

// Static placeholder data — used for UI development only, not from the database
export const recentSessions = [
  {
    id: "1",
    subject: "science",
    name: "Neura the Brainy Explorer",
    topic: "Neural Network of the Brain",
    duration: 45,
    color: "#E5D0FF",
  },
  {
    id: "2",
    subject: "maths",
    name: "Countsy the Number Wizard",
    topic: "Derivatives & Integrals",
    duration: 30,
    color: "#FFDA6E",
  },
  {
    id: "3",
    subject: "language",
    name: "Verba the Vocabulary Builder",
    topic: "English Literature",
    duration: 30,
    color: "#BDE7FF",
  },
  {
    id: "4",
    subject: "coding",
    name: "Codey the Logic Hacker",
    topic: "Intro to If-Else Statements",
    duration: 45,
    color: "#FFC8E4",
  },
  {
    id: "5",
    subject: "history",
    name: "Memo, the Memory Keeper",
    topic: "World Wars: Causes & Consequences",
    duration: 15,
    color: "#FFECC8",
  },
  {
    id: "6",
    subject: "economics",
    name: "The Market Maestro",
    topic: "The Basics of Supply & Demand",
    duration: 10,
    color: "#C8FFDF",
  },
];
