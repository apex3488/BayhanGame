import type { Metadata } from "next";
import { UpDownGame } from "@/components/games/updown/updown-game";

export const metadata: Metadata = { title: "Up / Down" };

export default function UpDownPage() {
  return <UpDownGame />;
}
