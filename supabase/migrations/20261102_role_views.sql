-- Role-based views (lib/views.ts).
--
-- 1. Teachers can change the name their students see (teacher profile page):
--    the column joins the ones a teacher may update on their own classes.
-- 2. Tips analytics accepts the new teacher pages.
--
-- Safe to run more than once.

grant update (name, subject, join_code, teacher_name) on public.classes to authenticated;

alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription',
             'signIn', 'notFound', 'legal', 'classes', 'classDetail', 'assign', 'join',
             'teacherWelcome', 'teacherHome', 'library', 'lessonPreview', 'teacherProfile', 'newCourseTeacher')
  );
