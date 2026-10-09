import type { Metadata } from "next";
import { ReferralsScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Referrals" };

export default function Page() {
  return <ReferralsScreen />;
}
