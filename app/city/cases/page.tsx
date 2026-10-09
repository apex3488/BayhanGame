import type { Metadata } from "next";
import { CasesScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Cases" };

export default function Page() {
  return <CasesScreen />;
}
