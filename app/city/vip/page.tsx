import type { Metadata } from "next";
import { VipScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "VIP" };

export default function Page() {
  return <VipScreen />;
}
