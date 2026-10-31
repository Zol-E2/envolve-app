"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LIMITS } from "@/lib/validation";
import { createAssignment } from "@/lib/actions/teacher.actions";
import type { ClassCourse, ClassMember } from "@/lib/teacher/types";
import TaskCard from "@/components/classes/TaskCard";
import AppSelect from "@/components/ui/AppSelect";
import SubjectChip from "@/components/SubjectChip";

interface AssignFormProps {
  classId: string;
  teacherName: string;
  members: ClassMember[];
  courses: { own: ClassCourse[]; library: ClassCourse[] };
  /** Picked in advance (from the Kurzustár or a lesson preview) */
  initialCourseId?: string | null;
}

/**
 * Hand out a course: which one, to whom, by when, and a short message. The
 * card on the right is exactly what the student will see on their home page.
 */
const AssignForm = ({ classId, teacherName, members, courses, initialCourseId }: AssignFormProps) => {
  const t = useTranslations("Assign");
  const router = useRouter();
  const all = useMemo(() => [...courses.own, ...courses.library], [courses]);
  const [courseId, setCourseId] = useState(
    (initialCourseId && all.some((c) => c.id === initialCourseId) ? initialCourseId : all[0]?.id) ?? ""
  );
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = all.find((c) => c.id === courseId);
  const toOption = (c: ClassCourse) => ({
    value: c.id,
    label: c.name,
    description: `${t("minutes", { count: c.duration })} · ${c.language.toUpperCase()}`,
    icon: <SubjectChip subject={c.subject} />,
  });

  const toggle = (studentId: string) =>
    setPicked((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return setError(t("courseRequired"));
    if (!everyone && picked.length === 0) return setError(t("pickRequired"));
    setBusy(true);
    setError(null);
    try {
      await createAssignment({ classId, courseId, everyone, studentIds: everyone ? [] : picked, dueDate, message });
      router.push(`/classes/${classId}?tab=assignments`);
    } catch {
      setError(t("saveError"));
      setBusy(false);
    }
  };

  if (all.length === 0) {
    return (
      <div className="list-empty card">
        <p>{t("noCourses")}</p>
      </div>
    );
  }

  return (
    <form className="assign-layout" onSubmit={submit} noValidate>
      <div className="form-card flex flex-col gap-5">
        <div className="field-group" data-tour="assign-course">
          <label htmlFor="assign-course" className="field-label">
            {t("course")}
          </label>
          <AppSelect
            id="assign-course"
            value={courseId}
            onValueChange={setCourseId}
            groups={[
              { label: t("ownCourses"), options: courses.own.map(toOption) },
              { label: t("libraryCourses"), options: courses.library.map(toOption) },
            ]}
          />
        </div>

        <fieldset className="field-group" data-tour="assign-who">
          <legend className="field-label mb-2">{t("who")}</legend>
          <div className="choice-grid">
            <label className="choice">
              <input type="radio" name="who" className="sr-only" checked={everyone} onChange={() => setEveryone(true)} />
              <span className="choice-radio" aria-hidden />
              <span className="choice-label">{t("everyone", { count: members.length })}</span>
            </label>
            <label className="choice">
              <input type="radio" name="who" className="sr-only" checked={!everyone} onChange={() => setEveryone(false)} />
              <span className="choice-radio" aria-hidden />
              <span className="choice-label">{t("some")}</span>
            </label>
          </div>
          {!everyone && (
            <div className="pick-list mt-2">
              {members.map((m) => (
                <label key={m.studentId} className="choice min-h-12">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={picked.includes(m.studentId)}
                    onChange={() => toggle(m.studentId)}
                  />
                  <span className="choice-label">{m.displayName}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="field-group" data-tour="assign-due">
          <label htmlFor="assign-due" className="field-label">
            {t("due")}
          </label>
          <input
            id="assign-due"
            type="date"
            className="field max-w-xs"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <span className="form-hint">{t("dueHint")}</span>
        </div>

        <div className="field-group" data-tour="assign-message">
          <label htmlFor="assign-message" className="field-label">
            {t("message")}
          </label>
          <textarea
            id="assign-message"
            className="field"
            rows={3}
            maxLength={LIMITS.message}
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <span className="form-hint">
            {t("messageHint", { left: LIMITS.message - message.length })}
          </span>
        </div>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-nav">
          <button type="button" className="btn-outline" onClick={() => router.push(`/classes/${classId}`)}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy} data-tour="assign-submit">
            <Send className="size-5" aria-hidden />
            {busy ? t("saving") : t("submit")}
          </button>
        </div>
      </div>

      <aside className="assign-preview" aria-label={t("previewLabel")} data-tour="assign-preview">
        <p className="form-eyebrow">{t("preview")}</p>
        {course && (
          <TaskCard
            preview
            teacherName={teacherName}
            course={course}
            minutes={course.duration}
            dueDate={dueDate || null}
            message={message.trim()}
          />
        )}
      </aside>
    </form>
  );
};

export default AssignForm;
