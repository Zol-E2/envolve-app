import React from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import NavItems from "./Navitems";
import LanguageSwitcher from "./LanguageSwitcher";
import NavAuth from "./NavAuth";
import { useTranslations } from "next-intl";

const Navbar = () => {
  // useTranslations also works in (non-async) Server Components
  const t = useTranslations("Navbar");

  return (
    <nav className="navbar">
      <Link href="/">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <Image
            src="/images/logo.svg"
            alt={t("logoAlt")}
            width={100}
            height={70}
          />
        </div>
      </Link>
      <div className="flex items-center gap-8">
        <NavItems />
        <LanguageSwitcher />
        <NavAuth />
      </div>
    </nav>
  );
};

export default Navbar;
