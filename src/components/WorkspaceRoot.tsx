"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import NexusApp from "./NexusApp";
/** Keep one workspace (and one drawer) mounted across private and dictionary routes. */
export default function WorkspaceRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  useEffect(() => {
    if (pathname === "/study")
      window.dispatchEvent(new Event("nexus-open-study"));
  }, [pathname]);
  const external = pathname !== "/" && pathname !== "/study";
  return (
    <NexusApp
      initialFeature={pathname === "/study" ? "study" : "home"}
      externalContent={external ? children : undefined}
      onLeaveExternal={external ? () => router.push("/") : undefined}
      onOpenDictionary={() => router.push("/dictionary")}
    />
  );
}
