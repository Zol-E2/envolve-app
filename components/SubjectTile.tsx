import {
  BookOpen,
  Calculator,
  ChartLine,
  CodeXml,
  FlaskConical,
  Landmark,
  MessageSquareText,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { cn, getSubjectColor } from "@/lib/utils";

// One icon per subject (lucide-react). Unknown subjects get a book.
const SUBJECT_ICONS: Record<string, LucideIcon> = {
  maths: Calculator,
  language: MessageSquareText,
  science: FlaskConical,
  history: Landmark,
  coding: CodeXml,
  economics: ChartLine,
};

export const SubjectIcon = ({ subject, ...props }: { subject: string } & LucideProps) => {
  const Icon = SUBJECT_ICONS[subject] ?? BookOpen;
  return <Icon aria-hidden {...props} />;
};

const SIZES = {
  sm: { box: "size-11 rounded-xl", icon: "size-5" },
  md: { box: "size-14 rounded-2xl", icon: "size-7" },
  lg: { box: "size-20 rounded-3xl", icon: "size-10" },
} as const;

/**
 * Subject colour + icon. Colour alone never carries meaning (colour-blind
 * students), so the icon always comes with it, and a text label nearby.
 */
const SubjectTile = ({
  subject,
  size = "md",
  className,
}: {
  subject: string;
  size?: keyof typeof SIZES;
  className?: string;
}) => (
  <span
    className={cn("subject-tile", SIZES[size].box, className)}
    style={{ backgroundColor: getSubjectColor(subject) ?? "var(--secondary)" }}
  >
    <SubjectIcon subject={subject} className={SIZES[size].icon} strokeWidth={2} />
  </span>
);

export default SubjectTile;
