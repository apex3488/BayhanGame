import type { Metadata } from "next";
import { MinesGame } from "@/components/games/mines/mines-game";

export const metadata: Metadata = { title: "Mines" };

export default function MinesPage() {
  return <MinesGame />;
}
