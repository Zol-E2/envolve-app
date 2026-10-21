import { notFound } from "next/navigation";
// import { PricingTable } from "@clerk/nextjs";

// The plans page is not live yet: it returns 404 until billing launches.
// To enable it, restore the component below (and its tips, see
// lib/onboarding/tours.ts).
const Subscription = () => {
  notFound();
  // return (
  //   <main>
  //     <PricingTable />
  //   </main>
  // );
};
export default Subscription;
