import type { Metadata } from "next";
import { CorpScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Corporations" };

export default function Page() {
  return <CorpScreen />;
}
