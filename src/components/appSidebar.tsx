"use client";

import {
  DashboardSquare01Icon,
  DeliveryBox02Icon,
  DeliveryReturn02Icon,
  Invoice01Icon,
  LogOutIcon,
  NotificationIcon,
  Store01Icon,
  TagsIcon,
  UsersRoundIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/types/database";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={DashboardSquare01Icon} />,
    roles: ["admin", "manager", "staff", "supplier"],
  },
  {
    title: "Kelola Produk",
    url: "/products",
    icon: <HugeiconsIcon icon={DeliveryBox02Icon} />,
    roles: ["admin", "manager"],
  },
  {
    title: "Kelola Kategori",
    url: "/categories",
    icon: <HugeiconsIcon icon={TagsIcon} />,
    roles: ["admin", "manager"],
  },
  {
    title: "Verifikasi Supplier",
    url: "/suppliers",
    icon: <HugeiconsIcon icon={Store01Icon} />,
    roles: ["admin"],
  },
  {
    title: "Kelola Pengguna",
    url: "/users",
    icon: <HugeiconsIcon icon={UsersRoundIcon} />,
    roles: ["admin"],
  },
  {
    title: "Pesanan Restock",
    url: "/restock-orders",
    icon: <HugeiconsIcon icon={DeliveryReturn02Icon} />,
    roles: ["manager", "staff", "supplier"],
  },
  {
    title: "Transaksi",
    url: "/transactions",
    icon: <HugeiconsIcon icon={Invoice01Icon} />,
    roles: ["admin", "manager", "staff", "supplier"],
  },
  {
    title: "Notifikasi",
    url: "/notifications",
    icon: <HugeiconsIcon icon={NotificationIcon} />,
    roles: ["admin", "manager", "staff", "supplier"],
  },
];

const roleBasePaths = {
  admin: "/admin",
  manager: "/manager",
  staff: "/staff",
  supplier: "/supplier",
};

export function AppSidebar({ sessionRole }: { sessionRole: UserRole }) {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = roleBasePaths[sessionRole];

  const filteredNavItems = navItems
    .filter((item) => item.roles.includes(sessionRole))
    .map((item) => {
      const itemUrl = `${basePath}${item.url}`;
      const isActive =
        pathname === itemUrl || pathname.startsWith(`${itemUrl}/`);
      return {
        ...item,
        url: itemUrl,
        isActive,
      };
    });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-4">
          <Image
            loading="eager"
            src="/logotypo.webp"
            width={300}
            height={300}
            alt="Gintory Logo"
            className={`w-24 object-cover ${open ? "block" : "hidden"}`}
          />
          <Image
            src="/logo.webp"
            width={300}
            height={300}
            alt="Gintory Logo"
            className={`w-6 object-cover ${open ? "hidden" : "block"}`}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-2">
          {filteredNavItems.map((item) => (
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
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              tooltip="Logout"
              onClick={async () => {
                await signOut({ redirect: false });
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
