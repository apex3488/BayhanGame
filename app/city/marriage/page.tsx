import type { Metadata } from "next";
import { MarriageScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Marriage" };

export default function Page() {
  return <MarriageScreen />;
}
