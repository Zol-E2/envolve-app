"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

/**
 * Deliberately a Client Component. When this JSX lives in a Server Component,
 * React Flight can deliver <SignInButton>'s single child as a one-item array,
 * which Clerk <= 6.39 rejects at hydration with
 * "You've passed multiple children components to <SignInButton/>"
 * (fixed upstream in clerk/javascript#8556). Creating the element on the
 * client keeps it out of the server/client boundary entirely.
 */
const NavAuth = () => {
  const t = useTranslations("Navbar");

  return (
    <>
      <SignedOut>
        <SignInButton>
          <button className="btn-signin">{t("signIn")}</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
};

export default NavAuth;
