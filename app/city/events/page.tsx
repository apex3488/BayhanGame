import type { Metadata } from "next";
import { EventsScreen } from "@/components/city/lifestyle-screens";

export const metadata: Metadata = { title: "Events" };

export default function Page() {
  return <EventsScreen />;
}
