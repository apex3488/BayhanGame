import type { Metadata } from "next";
import { BankScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Bank" };

export default function Page() {
  return <BankScreen />;
}
