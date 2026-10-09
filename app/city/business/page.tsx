import type { Metadata } from "next";
import { BusinessScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Business" };

export default function Page() {
  return <BusinessScreen />;
}
