import Vapi from "@vapi-ai/web";

/**
 * Singleton Vapi client used throughout the app.
 * Initialized once with the public web token so all components
 * share the same underlying WebRTC connection.
 */
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
