"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "../ui/toast";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      themes={["light", "dark"]}
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider refetchInterval={5 * 60}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </SessionProvider>
    </NextThemesProvider>
  );
}
