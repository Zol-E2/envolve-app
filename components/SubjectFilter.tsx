/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import AppSelect from "./ui/AppSelect";
import SubjectChip from "./SubjectChip";
import { subjects } from "@/constants";
import { getSubjectLabel } from "@/lib/utils";
// Plain Next.js router: formUrlQuery() returns a URL that already includes the locale prefix
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils";

const SubjectFilter = () => {
  const t = useTranslations("Courses");
  const tSubjects = useTranslations("Subjects");
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("subject") || "";

  const [subject, setSubject] = useState(query);

  useEffect(() => {
    // Skip when the URL already shows this subject (e.g. on first render);
    // a redundant push re-renders the whole page for nothing
    const wanted = subject === "all" ? "" : subject;
    if (wanted === (searchParams.get("subject") ?? "")) return;

    let newUrl = "";
    if (subject === "all") {
      newUrl = removeKeysFromUrlQuery({
        params: searchParams.toString(),
        keysToRemove: ["subject"],
      });
    } else {
      newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "subject",
        value: subject,
      });
    }
    router.push(newUrl, { scroll: false });
  }, [subject]);

  return (
    <AppSelect
      value={subject || "all"}
      onValueChange={setSubject}
      ariaLabel={t("subjectPlaceholder")}
      tour="courses-filter"
      options={[
        {
          value: "all",
          label: t("allSubjects"),
          icon: (
            <span className="subject-chip bg-secondary" aria-hidden>
              <LayoutGrid className="size-5" />
            </span>
          ),
        },
        ...subjects.map((value) => ({
          value,
          label: getSubjectLabel(tSubjects, value),
          icon: <SubjectChip subject={value} />,
        })),
      ]}
    />
  );
};

export default SubjectFilter;
