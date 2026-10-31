import { getSubjectColor } from "@/lib/utils";
import { SubjectIcon } from "./SubjectTile";

/** A small coloured square with the subject's icon, for lists and dropdowns */
const SubjectChip = ({ subject }: { subject: string }) => (
  <span className="subject-chip" style={{ backgroundColor: getSubjectColor(subject) }} aria-hidden>
    <SubjectIcon subject={subject} className="size-5" strokeWidth={2} />
  </span>
);

export default SubjectChip;
