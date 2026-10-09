import type { Metadata } from "next";
import { SlotsGame } from "@/components/games/slots/slots-game";

export const metadata: Metadata = { title: "Slots" };

export default function SlotsPage() {
  return <SlotsGame />;
}
