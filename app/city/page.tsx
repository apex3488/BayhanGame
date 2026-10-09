import type { Metadata } from "next";
import { CityHubScreen } from "@/components/city/city-hub-screen";

export const metadata: Metadata = { title: "City" };

export default function Page() {
  return <CityHubScreen />;
}
