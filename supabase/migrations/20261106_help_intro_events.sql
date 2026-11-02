-- Tips no longer open by themselves. The only bubble that does is the
-- one-time pointer to the Help button on the home page (helpIntro for
-- students, helpIntroAdult for teachers and admins); tips analytics accepts
-- these two flows. 'signIn' stays allowed for the rows already recorded.
--
-- Safe to run more than once.

alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription',
             'signIn', 'notFound', 'legal', 'classes', 'classDetail', 'assign', 'join',
             'teacherWelcome', 'teacherHome', 'library', 'lessonPreview', 'teacherProfile', 'newCourseTeacher',
             'adminHome', 'adminUsers', 'adminCourses', 'adminLog', 'adminProfile', 'adminPreview',
             'helpIntro', 'helpIntroAdult')
  );
