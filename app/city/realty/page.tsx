import type { Metadata } from "next";
import { RealtyScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Realty" };

export default function Page() {
  return <RealtyScreen />;
}
