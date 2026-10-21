"use client";

// Plain Next.js router: formUrlQuery() builds its URL from window.location,
// which already carries the locale prefix.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils";

const SearchInput = () => {
  const t = useTranslations("Courses");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Start from the URL so a shared or reloaded search link keeps its text
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("topic") ?? ""
  );

  useEffect(() => {
    // Debounce URL updates so we don't push a new route on every keystroke
    const delayDebounceFn = setTimeout(() => {
      // Only navigate when the URL actually needs to change. Every push gives
      // useSearchParams a new object, which re-runs this effect, so pushing
      // an identical URL re-rendered the page forever and froze it.
      if (searchQuery === (searchParams.get("topic") ?? "")) return;

      if (searchQuery) {
        const newUrl = formUrlQuery({
          params: searchParams.toString(),
          key: "topic",
          value: searchQuery,
        });

        router.push(newUrl, { scroll: false });
      } else {
        // Remove the topic filter from the URL when the search is cleared
        const newUrl = removeKeysFromUrlQuery({
          params: searchParams.toString(),
          keysToRemove: ["topic"],
        });

        router.push(newUrl, { scroll: false });
      }
    }, 500);

    // Clear the pending timeout if the query changes before it fires
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, router, searchParams]);

  return (
    <div
      className="relative border border-black rounded-lg items-center flex gap-2 px-2 py-1 h-fit"
      data-tour="courses-search"
    >
      <Image src="/icons/search.svg" alt="" width={15} height={15} />
      <input
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="outline-none"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};
export default SearchInput;
