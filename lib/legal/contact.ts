/**
 * Who runs eNvolve, as shown in the privacy policy and the terms of use.
 *
 * Fill these in before enabling the legal consent checkbox in Clerk.
 * While any value still starts with "[", both pages show a "draft" banner.
 */
export const LEGAL_CONTACT = {
  /** Data controller: a person's name, or the company once one exists */
  controller: "Elek Zoltán",
  /** Postal address of the controller */
  address: "4484 Ibrány, Toldi u. 2/A.",
  /** Address for privacy requests and questions */
  email: "lightningwebdesigner@gmail.com",
};

/** Date of the current version, shown on both pages (YYYY-MM-DD) */
export const LEGAL_UPDATED = "2026-10-26";

export const isLegalDraft = Object.values(LEGAL_CONTACT).some((value) =>
  value.startsWith("[")
);
