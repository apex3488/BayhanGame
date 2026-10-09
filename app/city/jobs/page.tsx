import type { Metadata } from "next";
import { JobsScreen } from "@/components/city/jobs-screen";

export const metadata: Metadata = { title: "Jobs" };

export default function Page() {
  return <JobsScreen />;
}
