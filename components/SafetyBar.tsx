import { BellRing, HeartHandshake } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * The lesson safety bar under the menu, for teachers and admins: stays on
 * every page until someone has opened what it points to. It carries no
 * student name (the screen may be projected in class).
 */
const SafetyBar = ({
  tone,
  text,
  href,
  action,
}: {
  tone: "alert" | "help";
  text: string;
  href: string;
  action: string;
}) => {
  const Icon = tone === "help" ? HeartHandshake : BellRing;
  return (
    <div className="safety-bar" data-tone={tone} role="status" aria-live="polite">
      <div className="safety-bar-inner">
        <Icon className="size-7 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 basis-56 text-lg font-bold max-sm:text-base">{text}</p>
        <Link href={href} className="btn-primary text-base">
          {action}
        </Link>
      </div>
    </div>
  );
};

export default SafetyBar;
