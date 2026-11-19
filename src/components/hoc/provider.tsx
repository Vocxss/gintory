"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "../ui/toast";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster/>
    </SessionProvider>
  );
}
