export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

/**
 * Current microphone permission without triggering the browser prompt.
 * "unknown" when the browser cannot tell (older Safari/Firefox).
 */
export const getMicPermission = async (): Promise<MicPermission> => {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return "unknown";
  }
};
