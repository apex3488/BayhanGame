import type { ReactNode } from "react";

/** Re-mounted on every navigation, giving each screen a short enter transition. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
