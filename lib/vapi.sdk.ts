import Vapi from "@vapi-ai/web";

/**
 * Singleton Vapi client used throughout the app.
 * Initialized once with the public web token so all components
 * share the same underlying WebRTC connection.
 */
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

const NORMAL_END = /ejection|ejected|meeting has ended/i;

const describe = (value: unknown) => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
};

/**
 * When the tutor hangs up (end of the lesson, time is up, or a safety
 * stop), the call service "ejects" the browser from the call and reports
 * it as an error. It is a normal end, not a broken connection.
 */
export const isNormalCallEnd = (error: unknown) => NORMAL_END.test(describe(error));

// The call library also writes that normal end to the console as an error
// ("Meeting ended due to ejection: Meeting has ended"), which looks like a
// bug in development. Only that exact message is dropped; every other
// console error is kept.
const FILTER_FLAG = "__envolveCallEndFilter";
if (typeof window !== "undefined" && !(window as unknown as Record<string, unknown>)[FILTER_FLAG]) {
  (window as unknown as Record<string, unknown>)[FILTER_FLAG] = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.length > 0 && typeof args[0] === "string" && /^Meeting ended due to ejection/.test(args[0])) return;
    original(...args);
  };
}
