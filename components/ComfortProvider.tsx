"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import {
  COMFORT_STORAGE_KEY,
  DEFAULT_COMFORT,
  applyComfort,
  readAccountComfort,
  readComfort,
  writeLocalComfort,
  type ComfortSettings,
} from "@/lib/comfort";

interface ComfortContextValue {
  settings: ComfortSettings;
  /** Changes some settings; applied at once and saved in the background */
  update: (patch: Partial<ComfortSettings>) => Promise<void>;
}

const ComfortContext = createContext<ComfortContextValue | null>(null);

export const useComfort = () => {
  const context = useContext(ComfortContext);
  if (!context) throw new Error("useComfort must be used inside <ComfortProvider>");
  return context;
};

// localStorage as an external store; "storage" fires when another tab changes it
const SERVER = "\u0000server";
const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const readLocalRaw = () => {
  try {
    return window.localStorage.getItem(COMFORT_STORAGE_KEY);
  } catch {
    return null;
  }
};

/** The student's display settings (see lib/comfort.ts), for the whole app. */
const ComfortProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, user } = useUser();
  const localRaw = useSyncExternalStore(subscribeToStorage, readLocalRaw, () => SERVER);
  const local = useMemo(() => {
    if (localRaw === SERVER || localRaw === null) return DEFAULT_COMFORT;
    try {
      return readComfort(JSON.parse(localRaw));
    } catch {
      return DEFAULT_COMFORT;
    }
  }, [localRaw]);

  // Signed in: the account's settings. Signed in without saved settings means
  // defaults, not the previous student's local copy on a shared computer.
  const metadata = user?.unsafeMetadata;
  const account = useMemo(() => readAccountComfort(metadata) ?? DEFAULT_COMFORT, [metadata]);
  const owner = user?.id ?? null;
  const base = isLoaded && user ? account : local;

  // A change made here shows at once, before Clerk or storage catch up
  const [draft, setDraft] = useState<{ owner: string | null; settings: ComfortSettings } | null>(null);
  const settings = draft && isLoaded && draft.owner === owner ? draft.settings : base;
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Keep <html> and the local copy in step with the settings. Skipped in the
  // hydration render, which cannot see localStorage yet: the <head> script
  // has already styled the page and must not be undone.
  const key = JSON.stringify(settings);
  useEffect(() => {
    if (localRaw === SERVER) return;
    const current = JSON.parse(key) as ComfortSettings;
    applyComfort(current);
    writeLocalComfort(current);
  }, [key, localRaw]);

  const update = useCallback(
    async (patch: Partial<ComfortSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setDraft({ owner, settings: next });
      if (!user) return;
      await user.update({ unsafeMetadata: { ...user.unsafeMetadata, comfort: next } });
    },
    [owner, user]
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <ComfortContext.Provider value={value}>{children}</ComfortContext.Provider>;
};

export default ComfortProvider;
