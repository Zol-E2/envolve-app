"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subjects } from "@/constants";
import { Textarea } from "./ui/textarea";
import { createCourse } from "@/lib/actions/course.actions";
import { getSubjectLabel } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type FormTranslator = ReturnType<typeof useTranslations<"CourseForm">>;

// Schema is built per render so validation messages follow the active locale
const buildFormSchema = (t: FormTranslator) =>
  z.object({
    name: z.string().min(1, { message: t("nameRequired") }),
    subject: z.string().min(1, { message: t("subjectRequired") }),
    topic: z.string().min(1, { message: t("topicRequired") }),
    voice: z.string().min(1, { message: t("voiceRequired") }),
    style: z.string().min(1, { message: t("styleRequired") }),
    duration: z.coerce.number().min(1, { message: t("durationRequired") }),
  });

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

const CourseForm = () => {
  const t = useTranslations("CourseForm");
  const tSubjects = useTranslations("Subjects");
  const router = useRouter();
  const formSchema = useMemo(() => buildFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: "",
      subject: "",
      topic: "",
      voice: "",
      style: "",
      duration: 30,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const course = await createCourse(values);

    if (course) {
      // Locale-aware router: "/courses/:id" becomes "/hu/courses/:id" when needed
      router.push(`/courses/${course.id}`);
    }
    // If createCourse throws, the error propagates and the form stays mounted
    // so the user can correct their input without losing it.
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("namePlaceholder")}
                  {...field}
                  className="input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("subject")}</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="input capitalize">
                    <SelectValue placeholder={t("subjectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem
                        key={subject}
                        value={subject}
                        className="capitalize"
                      >
                        {getSubjectLabel(tSubjects, subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("topic")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("topicPlaceholder")}
                  {...field}
                  className="input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="voice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("voice")}</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="input">
                    <SelectValue placeholder={t("voicePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("voiceMale")}</SelectItem>
                    <SelectItem value="female">{t("voiceFemale")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("style")}</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="input">
                    <SelectValue placeholder={t("stylePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">{t("styleFormal")}</SelectItem>
                    <SelectItem value="casual">{t("styleCasual")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("duration")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="30"
                  {...field}
                  className="input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full cursor-pointer">
          {t("submit")}
        </Button>
      </form>
    </Form>
  );
};

export default CourseForm;
