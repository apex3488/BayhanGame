import type { Metadata } from "next";
import { AssetsScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Assets" };

export default function Page() {
  return <AssetsScreen />;
}
