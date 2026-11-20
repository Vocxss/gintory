"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserRole } from "@/lib/types/database";
import {
  BoxIcon,
  ChevronRightIcon,
  DashboardSquare01Icon,
  Invoice01Icon,
  LogOutIcon,
  PackageMoving01Icon,
  UsersRoundIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={DashboardSquare01Icon} />,
    isActive: false,
    roles: ["admin", "manager", "staff", "supplier"],
  },
  {
    title: "Daftar Pengguna",
    url: "/users",
    icon: <HugeiconsIcon icon={UsersRoundIcon} />,
    roles: ["admin"],
    items: [
      {
        title: "Manajer",
        url: "/users/managers",
        isActive: false,
      },
      {
        title: "Staf",
        url: "/users/staff",
        isActive: false,
      },
      {
        title: "Supplier",
        url: "/users/supplier",
        isActive: false,
      },
    ],
    isActive: false,
  },
  {
    title: "Daftar Produk",
    url: "/products",
    icon: <HugeiconsIcon icon={BoxIcon} />,
    roles: ["admin", "manager", "staff"],
    isActive: false,
    items: [
      {
        title: "Aksesoris",
        url: "/products/accessories",
        isActive: false,
      },
      {
        title: "Dekorasi",
        url: "/products/decorations",
        isActive: false,
      },
      {
        title: "Perabotan",
        url: "/products/furniture",
        isActive: false,
      },
    ],
  },
  {
    title: "Pesanan Restock",
    url: "/restock-orders",
    icon: <HugeiconsIcon icon={PackageMoving01Icon} />,
    roles: ["admin", "manager", "staff", "supplier"],
    isActive: false,
  },
  {
    title: "Transaksi",
    url: "/transactions",
    icon: <HugeiconsIcon icon={Invoice01Icon} />,
    roles: ["admin", "manager", "staff"],
    isActive: false,
  },
];

const roleBasePaths: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  staff: "/staf",
  supplier: "/supplier",
  gintory_manager: "/manager",
  gintory_staff: "/staf",
};

export function AppSidebar({ sessionRole }: { sessionRole: UserRole }) {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenItems((current) =>
      navItems.reduce<Record<string, boolean>>((next, item) => {
        if (item.items) {
          const basePath = roleBasePaths[sessionRole];
          next[item.title] =
            item.items.some(
              (subItem) => pathname === `${basePath}${subItem.url}`,
            ) ||
            (current[item.title] ?? false);
        }
        return next;
      }, {}),
    );
  }, [pathname, sessionRole]);

  const filteredNavItems = navItems
    .filter((item) => {
      return item.roles.includes(sessionRole.toLowerCase() as UserRole);
    })
    .map((item) => {
      const basePath = roleBasePaths[sessionRole];
      const itemUrl = `${basePath}${item.url}`;
      return {
        ...item,
        url: itemUrl,
        isActive: pathname === itemUrl,
        items: item.items?.map((subItem) => {
          const subItemUrl = `${basePath}${subItem.url}`;
          return {
            ...subItem,
            url: subItemUrl,
            isActive: pathname === subItemUrl,
          };
        }),
      };
    });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-4">
          <Image
            loading="eager"
            src={"/logotypo.webp"}
            width={300}
            height={300}
            alt="Gintory Logo"
            className={`w-24 object-cover ${open ? "block" : "hidden"}`}
          />
          <Image
            src={"/logo.webp"}
            width={300}
            height={300}
            alt="Gintory Logo"
            className={`w-6 object-cover ${open ? "hidden" : "block"}`}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-4">
          {filteredNavItems.map((item) =>
            item.items ? (
              <SidebarMenuItem key={item.title}>
                <Collapsible
                  open={openItems[item.title] ?? false}
                  onOpenChange={(open) =>
                    setOpenItems((current) => ({
                      ...current,
                      [item.title]: open,
                    }))
                  }
                  className="group/collapsible"
                >
                  <div className="flex items-center gap-1">
                    <SidebarMenuButton
                      className="flex-1"
                      isActive={item.isActive}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    <CollapsibleTrigger
                      aria-label={`Buka submenu ${item.title}`}
                      className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
                    >
                      <HugeiconsIcon
                        icon={ChevronRightIcon}
                        className={`size-4 transition-transform duration-200 ${openItems[item.title] ? "rotate-90" : ""}`}
                      />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className={"mt-2"}>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={subItem.isActive}
                            render={<Link href={subItem.url} />}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  render={<Link href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              tooltip="Logout"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <HugeiconsIcon icon={LogOutIcon} />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
