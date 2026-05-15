// Clerk user fields stored locally when needed outside of auth context
type User = {
  name: string;
  email: string;
  image?: string;
  accountId: string;
};

// Subjects available for course creation (must match icon filenames in /public/icons)
enum Subject {
  maths = "maths",
  language = "language",
  science = "science",
  history = "history",
  coding = "coding",
  geography = "geography",
  economics = "economics",
  finance = "finance",
  business = "business",
}

// Represents a course row from the Supabase `courses` table.
// `bookmarked` is computed at query time, not stored in the DB.
type Course = {
  id: string;
  name: string;
  subject: string;
  topic: string;
  duration: number;
  voice: string;
  style: string;
  author: string;
  bookmarked: boolean;
  created_at?: string;
};

// Payload used when creating a new course via the form
interface CreateCourse {
  name: string;
  subject: string;
  topic: string;
  voice: string;
  style: string;
  duration: number;
}

// Query parameters for the getAllCourses server action
interface GetAllCourses {
  limit?: number;
  page?: number;
  subject?: string | string[];
  topic?: string | string[];
}

// Used by the Supabase client factory (legacy — kept for compatibility)
interface BuildClient {
  key?: string;
  sessionToken?: string;
}

// Payload for creating a user record
interface CreateUser {
  email: string;
  name: string;
  image?: string;
  accountId: string;
}

// Next.js App Router page prop — searchParams is a Promise in Next 15+
interface SearchParams {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Props for user avatar display components
interface Avatar {
  userName: string;
  width: number;
  height: number;
  className?: string;
}

// A single line in the conversation transcript
interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

// Props passed to the live CourseComponent (AI voice session UI)
interface CourseComponentProps {
  courseId: string;
  subject: string;
  topic: string;
  name: string;
  userName: string;
  userImage: string;
  voice: string;
  style: string;
}
