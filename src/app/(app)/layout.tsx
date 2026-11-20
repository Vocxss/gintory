"use client";
import { AppSidebar } from "@/components/appSidebar";
import { Blobatar } from "@/components/ui/blobatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  CheckIcon,
  ChevronDownIcon,
  Moon02Icon,
  NotificationIcon,
  PaletteIcon,
  SunIcon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import "blobatar/motion.css";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  const themes = [
    {
      name: "light",
      label: "Terang",
      isActive: resolvedTheme === "light",
      icon: <HugeiconsIcon icon={SunIcon} />,
    },
    {
      name: "dark",
      label: "Gelap",
      isActive: resolvedTheme === "dark",
      icon: <HugeiconsIcon icon={Moon02Icon} />,
    },
  ] as const;

  useEffect(() => {
    if (!resolvedTheme) return;

    document.documentElement.classList.toggle(
      "dark",
      resolvedTheme === "dark",
    );
  }, [resolvedTheme]);

  const changeTheme = (themeName: "light" | "dark") => {
    setTheme(themeName);
    document.documentElement.classList.toggle("dark", themeName === "dark");
  };

  if (!session) {
    return;
  }

  return (
    <SidebarProvider>
      <AppSidebar sessionRole={session?.user?.role ?? "staff"} />
      <SidebarInset>
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            <Button variant="outline" size={"icon-sm"}>
              <Link
                href={`/notifications/${session?.user?.id}`}
                className="text-sm font-bold"
              >
                <HugeiconsIcon icon={NotificationIcon} />
              </Link>
            </Button>
            <div className="flex items-center gap-2 p-2 pr-4 border border-border bg-card rounded-full">
              <Blobatar name={"kasper"} />
              <div className="flex flex-col">
                <p className="text-xs text-primary">{session?.user?.role}</p>
                <p className="text-sm font-bold">{session?.user?.name}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size={"icon-sm"}>
                      <HugeiconsIcon icon={ChevronDownIcon} />
                    </Button>
                  }
                ></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Link
                        href={`/profile/${session.user.id}`}
                        className="flex items-center gap-2"
                      >
                        <HugeiconsIcon icon={User02Icon} />
                        <p>Profile</p>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger><HugeiconsIcon icon={PaletteIcon}/> Tema</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {themes.map((theme) => (
                            <DropdownMenuItem
                              key={theme.name}
                              onClick={() => changeTheme(theme.name)}
                            >
                              {theme.icon}
                              <span className="ml-2">{theme.label}</span>
                              {theme.isActive && (
                                <HugeiconsIcon icon={CheckIcon} className="ml-auto" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
