"use client";

import { useSyncExternalStore } from "react";
import { COMFORT_BOOT_SCRIPT } from "@/lib/comfort";

const subscribe = () => () => {};

/**
 * Applies "Így kényelmes nekem" before the first paint (lib/comfort.ts).
 *
 * The script is only part of the server HTML, where the browser runs it
 * straight away. After hydration, and when React renders the layout in the
 * browser again (switching language), it renders nothing: ComfortProvider
 * has already applied the settings, and a script tag created by React would
 * never run anyway (React warns about it).
 */
const ComfortBootScript = () => {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (hydrated) return null;
  return <script dangerouslySetInnerHTML={{ __html: COMFORT_BOOT_SCRIPT }} />;
};

export default ComfortBootScript;
