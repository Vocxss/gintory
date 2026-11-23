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
} from "@/components/ui/dropdownMenu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  CheckIcon,
  ChevronDownIcon,
  LogOutIcon,
  Moon02Icon,
  PaletteIcon,
  SunIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import "blobatar/motion.css";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

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
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const changeTheme = (themeName: "light" | "dark") => {
    setTheme(themeName);
    document.documentElement.classList.toggle("dark", themeName === "dark");
  };

  if (!session) {
    return <main className="mx-2 mt-4">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AppSidebar sessionRole={session.user.role} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1 px-2">
              <Blobatar name={session.user.name ?? "gintory"} />
              <div className="flex flex-col">
                <p className="text-xs capitalize text-primary">
                  {session.user.role}
                </p>
                <p className="text-sm font-bold">{session.user.name}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-xs">
                      <HugeiconsIcon icon={ChevronDownIcon} />
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <HugeiconsIcon icon={PaletteIcon} /> Tema
                      </DropdownMenuSubTrigger>
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
                                <HugeiconsIcon
                                  icon={CheckIcon}
                                  className="ml-auto"
                                />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem
                      onClick={async () => {
                        await signOut({ redirect: false });
                        router.push("/login");
                      }}
                    >
                      <HugeiconsIcon icon={LogOutIcon} />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <main className="mx-2 mt-4 min-w-0 max-w-full overflow-x-hidden pb-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
