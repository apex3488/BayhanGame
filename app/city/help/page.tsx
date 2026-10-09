import type { Metadata } from "next";
import { HelpScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Help" };

export default function Page() {
  return <HelpScreen />;
}
