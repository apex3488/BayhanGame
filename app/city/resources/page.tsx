import type { Metadata } from "next";
import { ResourcesScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Resources" };

export default function Page() {
  return <ResourcesScreen />;
}
