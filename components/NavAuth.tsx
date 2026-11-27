"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { readClassAccount } from "@/lib/classAccounts";

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
  const { user } = useUser();
  // Class accounts are managed by the teacher (new card, new password), so
  // the menu offers only signing out, not the account settings
  const classAccount = !!readClassAccount(user?.publicMetadata);

  return (
    <>
      <SignedOut>
        <SignInButton>
          <button className="btn-signin">{t("signIn")}</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <span className="flex" data-tour="nav-account">
          {/* Same height as the buttons next to it, easier to tap */}
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "size-10 max-sm:size-9",
                ...(classAccount && { userButtonPopoverActionButton__manageAccount: "hidden" }),
              },
            }}
          />
        </span>
      </SignedIn>
    </>
  );
};

export default NavAuth;
