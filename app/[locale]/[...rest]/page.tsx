import { notFound } from "next/navigation";

// Catch-all for unknown paths under a valid locale (e.g. /hu/nincs-ilyen),
// so they render app/[locale]/not-found.tsx instead of the bare Next.js 404.
export default function CatchAllPage() {
  notFound();
}
