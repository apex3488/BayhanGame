import type { Metadata } from "next";
import { PromoScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Promo" };

export default function Page() {
  return <PromoScreen />;
}
