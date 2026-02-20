"use client";

import * as React from "react";
import {
  Music,
  Home,
  FileDown,
  Play,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/studio", icon: Home, badge: undefined },
  { label: "Generate AI", path: "/generate", icon: Sparkles, badge: undefined },
  { label: "My Pieces", path: "/pieces", icon: LayoutTemplate, badge: undefined },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNav = (path: string) => {
    router.push(path);
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      {/* ── Header ─────────────────────────────────────────────── */}
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]">
            <Music className="h-5 w-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-none tracking-tight">
              NoteForge
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              AI Sheet Music
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, path, icon: Icon, badge }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton
                    onClick={() => handleNav(path)}
                    isActive={pathname === path}
                    className="cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5 py-0"
                      >
                        {badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">My Account</span>
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
