"use client";
import { AppSidebar } from "@/components/appSidebar";
import { Blobatar } from "@/components/ui/blobatar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import "blobatar/motion.css";
import { useSession } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  return (
    <SidebarProvider>
      <AppSidebar sessionRole={session?.user?.role ?? "gintory_staff"} />
      <SidebarInset>
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          <div className="flex items-center gap-2 p-2 pr-4 border border-border bg-card rounded-full">
            <Blobatar
              name={"kasper"}
            />
            <div className="flex flex-col">
              <p className="text-xs text-primary">{session?.user?.role}</p>
              <p className="font-bold">{session?.user?.name}</p>
            </div>
          </div>
        </div>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
