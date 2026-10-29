"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock, Plus, Volume2 } from "lucide-react";
import { subjects } from "@/constants";
import { createCourse } from "@/lib/actions/course.actions";
import { cn, getSubjectLabel } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/onboarding/speech";
import { COURSE_FORM_SPEECH, joinForSpeech } from "@/lib/onboarding/speechText.mjs";
import SubjectTile from "./SubjectTile";

type FormTranslator = ReturnType<typeof useTranslations<"CourseForm">>;

// Schema is built per render so validation messages follow the active locale
const buildFormSchema = (t: FormTranslator) =>
  z.object({
    name: z.string().trim().min(1, { message: t("nameRequired") }),
    subject: z.string().min(1, { message: t("subjectRequired") }),
    topic: z.string().trim().min(1, { message: t("topicRequired") }),
    voice: z.string().min(1, { message: t("voiceRequired") }),
    language: z.enum(["hu", "en"], { message: t("languageRequired") }),
    duration: z.coerce.number().min(1, { message: t("durationRequired") }),
  });

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

/**
 * One question per step instead of one long form: less to read at once,
 * a visible "where am I" bar, and nothing is lost when going back.
 */
const STEPS = [
  { id: "subject", label: "stepSubject", fields: ["subject"] },
  { id: "topic", label: "stepTopic", fields: ["topic", "name"] },
  { id: "voice", label: "stepVoice", fields: ["voice", "language"] },
  { id: "length", label: "stepLength", fields: ["duration"] },
] as const;

const DURATIONS = [5, 10, 15, 20, 30];
const IDEA_KEYS = ["a", "b", "c"] as const;

const CourseForm = () => {
  const t = useTranslations("CourseForm");
  const tSubjects = useTranslations("Subjects");
  const router = useRouter();
  // New courses default to the language the student is using the app in
  const locale = useLocale();
  const canRead = useCanSpeak(locale);
  const formSchema = useMemo(() => buildFormSchema(t), [t]);
  const [stepIndex, setStepIndex] = useState(0);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: "",
      subject: "",
      topic: "",
      voice: "",
      language: locale === "en" ? "en" : "hu",
      duration: 15,
    },
  });
  const { setValue, trigger, formState, clearErrors } = form;
  // An error disappears as soon as the student fixes that answer
  const register = (name: keyof FormValues) =>
    form.register(name, { onChange: () => clearErrors(name) });
  const { errors, isSubmitting } = formState;
  // Live values for the ideas, the summary and the name suggestion
  const values = useWatch({ control: form.control }) as FormValues;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Land on the new question (keyboard and screen-reader users), and stop
  // reading the previous one aloud
  useEffect(() => {
    stopSpeaking();
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    questionRef.current?.focus();
  }, [stepIndex]);
  useEffect(() => () => stopSpeaking(), []);

  const save = async (data: FormValues) => {
    try {
      const course = await createCourse(data);
      // Locale-aware router: "/courses/:id" becomes "/hu/courses/:id" when needed
      if (course) router.push(`/courses/${course.id}`);
    } catch (error) {
      console.error("Course not saved:", error);
      // The form keeps every value, so the student only has to press save again
      form.setError("root", { message: t("submitError") });
    }
  };

  const next = async () => {
    const ok = await trigger([...step.fields]);
    if (ok) setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  };

  // Enter in a text field moves on instead of submitting half a form
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isLast) void form.handleSubmit(save)();
    else void next();
  };

  const readAloud = () => {
    // Keys come from a plain JS list shared with the recording script
    const text = t as unknown as (key: string) => string;
    speak(joinForSpeech(COURSE_FORM_SPEECH[step.id].map((key) => text(key))), locale);
  };

  const pickIdea = (idea: string) => {
    setValue("topic", idea, { shouldValidate: true });
    if (!values.name.trim()) setValue("name", idea, { shouldValidate: true });
  };

  const ideas = values.subject && (subjects as string[]).includes(values.subject)
    ? IDEA_KEYS.map((key) => t(`ideas.${values.subject}.${key}` as Parameters<typeof t>[0]))
    : [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* Progress: done steps get a tick, the current one is filled */}
      <ol className="form-steps" data-tour="course-steps" aria-label={t("progressLabel")}>
        {STEPS.map((item, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "now" : "todo";
          return (
            <li key={item.id} className="form-step" data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className="form-step-dot" aria-hidden>
                {state === "done" ? <Check className="size-[18px]" strokeWidth={3} /> : index + 1}
              </span>
              <span className="form-step-label">{t(item.label)}</span>
            </li>
          );
        })}
      </ol>

      <section className="form-card" aria-labelledby="form-question">
        <p className="form-eyebrow">
          {t("stepOf", { current: stepIndex + 1, total: STEPS.length })} · {t(step.label)}
        </p>
        <h2 id="form-question" ref={questionRef} tabIndex={-1} className="form-question">
          {t(`${step.id}Question`)}
        </h2>
        <p className="form-hint">
          <CircleHelp className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{t(`${step.id}Hint`)}</span>
        </p>

        {step.id === "subject" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t("subject")}</legend>
            <div className="choice-grid">
              {subjects.map((subject) => (
                <label key={subject} className="choice">
                  <input type="radio" value={subject} className="sr-only" {...register("subject")} />
                  <SubjectTile subject={subject} size="sm" />
                  <span className="flex-1">{getSubjectLabel(tSubjects, subject)}</span>
                  <Check className="choice-check size-5" aria-hidden />
                </label>
              ))}
            </div>
            <FieldError message={errors.subject?.message} />
          </fieldset>
        )}

        {step.id === "topic" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="course-topic" className="field-label">
                {t("topic")}
              </label>
              <textarea
                id="course-topic"
                rows={3}
                className="field"
                placeholder={t("topicPlaceholder")}
                aria-invalid={!!errors.topic}
                {...register("topic")}
              />
              <FieldError message={errors.topic?.message} />
            </div>
            {ideas.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-base font-bold text-muted-foreground">{t("ideasLabel")}</p>
                <div className="flex flex-wrap gap-2">
                  {ideas.map((idea) => (
                    <button key={idea} type="button" className="idea-chip" onClick={() => pickIdea(idea)}>
                      <Plus className="size-4" aria-hidden />
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor="course-name" className="field-label">
                {t("nameLabel")}
              </label>
              <input
                id="course-name"
                className="field"
                placeholder={t("namePlaceholder")}
                aria-invalid={!!errors.name}
                aria-describedby="course-name-hint"
                {...register("name")}
              />
              <p id="course-name-hint" className="text-base text-muted-foreground">
                {t("nameHint")}
              </p>
              <FieldError message={errors.name?.message} />
            </div>
          </div>
        )}

        {step.id === "voice" && (
          <div className="flex flex-col gap-6">
            <ChoiceGroup legend={t("voice")} error={errors.voice?.message}>
              {(["female", "male"] as const).map((voice) => (
                <label key={voice} className="choice">
                  <input type="radio" value={voice} className="sr-only" {...register("voice")} />
                  <span className="choice-radio" aria-hidden />
                  <span className="flex-1">{t(voice === "female" ? "voiceFemale" : "voiceMale")}</span>
                </label>
              ))}
            </ChoiceGroup>
            <ChoiceGroup legend={t("language")} error={errors.language?.message}>
              {(["hu", "en"] as const).map((language) => (
                <label key={language} className="choice">
                  <input type="radio" value={language} className="sr-only" {...register("language")} />
                  <span className="choice-radio" aria-hidden />
                  <span className="flex-1">{t(language === "hu" ? "languageHu" : "languageEn")}</span>
                  <span className="pill">{language.toUpperCase()}</span>
                </label>
              ))}
            </ChoiceGroup>
          </div>
        )}

        {step.id === "length" && (
          <div className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{t("duration")}</legend>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((minutes) => (
                  <label key={minutes} className="duration-chip">
                    <input
                      type="radio"
                      name="duration"
                      value={minutes}
                      className="sr-only"
                      checked={Number(values.duration) === minutes}
                      onChange={() => setValue("duration", minutes, { shouldValidate: true })}
                    />
                    <Clock className="size-5" aria-hidden />
                    {t("minutes", { count: minutes })}
                  </label>
                ))}
              </div>
              <FieldError message={errors.duration?.message} />
            </fieldset>

            {/* A last look before saving, so nothing is a surprise */}
            <div className="summary-card">
              <p className="form-eyebrow">{t("summaryTitle")}</p>
              <div className="flex items-center gap-3">
                <SubjectTile subject={values.subject} />
                <div className="flex min-w-0 flex-col">
                  <p className="font-display text-xl leading-tight font-bold" lang={values.language}>
                    {values.name}
                  </p>
                  <p className="text-[15px] font-bold text-muted-foreground">
                    {getSubjectLabel(tSubjects, values.subject)}
                  </p>
                </div>
              </div>
              <p className="text-base text-muted-foreground" lang={values.language}>
                {values.topic}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="pill">
                  <Clock className="size-4" aria-hidden />
                  {t("minutes", { count: Number(values.duration) || 0 })}
                </span>
                <span className="pill">{t(values.voice === "male" ? "voiceMale" : "voiceFemale")}</span>
                <span className="pill">{values.language.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}

        {errors.root && (
          <p className="help-box" role="alert">
            {errors.root.message}
          </p>
        )}
      </section>

      <div className="form-nav">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
          disabled={stepIndex === 0 || isSubmitting}
        >
          <ArrowLeft className="size-5" aria-hidden />
          {t("back")}
        </button>
        {canRead && (
          <button type="button" className="btn-outline" onClick={readAloud} data-tour="course-read">
            <Volume2 className="size-5" aria-hidden />
            <span className="max-sm:sr-only">{t("readAloud")}</span>
          </button>
        )}
        <button
          type="submit"
          className="btn-primary ml-auto max-sm:order-last max-sm:w-full"
          disabled={isSubmitting}
          data-tour="course-next"
        >
          {isLast ? (
            <>
              <Check className="size-5" aria-hidden />
              {isSubmitting ? t("submitting") : t("submit")}
            </>
          ) : (
            <>
              {t("next")}
              <ArrowRight className="size-5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;

const ChoiceGroup = ({ legend, error, children }: { legend: string; error?: string; children: ReactNode }) => (
  <fieldset className="flex flex-col gap-2">
    <legend className="field-label mb-1">{legend}</legend>
    <div className={cn("grid gap-3 sm:grid-cols-2")}>{children}</div>
    <FieldError message={error} />
  </fieldset>
);

export default CourseForm;
