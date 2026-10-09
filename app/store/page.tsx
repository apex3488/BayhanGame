import type { Metadata } from "next";
import { StoreScreen } from "@/components/store/store-screen";

export const metadata: Metadata = { title: "BAYHAN STORE" };

export default function StorePage() {
  return <StoreScreen />;
}
