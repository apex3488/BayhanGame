import type { Metadata } from "next";
import { ShopScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Shop" };

export default function Page() {
  return <ShopScreen />;
}
