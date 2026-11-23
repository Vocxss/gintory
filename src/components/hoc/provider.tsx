"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "../ui/toast";

export function Provider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      themes={["light", "dark"]}
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider refetchInterval={5 * 60}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </QueryClientProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}
