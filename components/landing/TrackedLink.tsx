"use client";

import { track } from "@vercel/analytics";

interface TrackedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Name of the click in Vercel Analytics (Events), e.g. "landing_sign_in" */
  event: string;
  /** Where on the page the button is, so the hero and the closing band can be compared */
  place: string;
}

/**
 * A plain link that also counts its clicks in Vercel Analytics, anonymously:
 * how many visitors of the landing page go on to sign in or write to us.
 */
const TrackedLink = ({ event, place, onClick, ...props }: TrackedLinkProps) => (
  <a
    {...props}
    onClick={(e) => {
      track(event, { place });
      onClick?.(e);
    }}
  />
);

export default TrackedLink;
