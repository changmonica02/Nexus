"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import NexusApp from "./NexusApp";
import { trashReturn } from "../lib/workspaceReturn";
/** Keep one workspace (and one drawer) mounted across private and dictionary routes. */
export default function WorkspaceRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  useEffect(() => {
    if (pathname === "/study")
      window.dispatchEvent(new Event("nexus-open-study"));
  }, [pathname]);
  const external =
    pathname !== "/" && pathname !== "/study" && pathname !== "/trash";
  return (
    <NexusApp
      initialFeature={pathname === "/study" ? "study" : "home"}
      externalContent={external ? children : undefined}
      onLeaveExternal={
        external || pathname === "/trash" ? () => router.push("/") : undefined
      }
      trashRoute={pathname === "/trash"}
      onOpenTrash={() =>
        router.push(
          "/trash?from=" +
            encodeURIComponent(
              window.location.pathname +
                window.location.search +
                window.location.hash,
            ),
        )
      }
      onLeaveTrash={() => {
        const from = new URLSearchParams(window.location.search).get("from");
        router.push(trashReturn(from));
      }}
      onOpenDictionary={() => router.push("/dictionary")}
    />
  );
}
