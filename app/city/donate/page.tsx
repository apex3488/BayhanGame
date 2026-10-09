import type { Metadata } from "next";
import { DonateScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Donate" };

export default function Page() {
  return <DonateScreen />;
}
