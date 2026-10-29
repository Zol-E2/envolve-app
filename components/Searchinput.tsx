"use client";

// Plain Next.js router: formUrlQuery() builds its URL from window.location,
// which already carries the locale prefix.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
    <div className="search-box" data-tour="courses-search">
      <Search className="size-5 shrink-0" aria-hidden />
      <input
        type="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};
export default SearchInput;
