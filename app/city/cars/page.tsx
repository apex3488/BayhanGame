import type { Metadata } from "next";
import { CarsScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Cars" };

export default function Page() {
  return <CarsScreen />;
}
