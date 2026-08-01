import { useState, useRef, useEffect } from "react";
import { CircleHelp, Bell } from "lucide-react";
import appIcon from "@/assets/app-icon.svg";
import {
  AppHeader,
  AppName,
  ActionIconButton,
  ProfileMenu,
  defaultProfileMenuGroups,
  DashboardIcon,
  AppMenu,
  CXoneLogo,
  type AppMenuGroup,
} from "@nicecxone/lyra-ui";

type Page = "agent-workspace" | "agent" | "outbound" | "login";

interface HeaderProps {
  onNavigate?: (page: Page) => void;
  currentPage?: Page;
}

export function Header({ onNavigate, currentPage = "agent-workspace" }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const navigate = (page: Page) => {
    setMenuOpen(false);
    onNavigate?.(page);
  };

  const appMenuGroups: AppMenuGroup[] = [
    {
      items: [
        { label: "Agent Next Gen", onClick: () => navigate("agent") },
        { label: "Agent Workspace Premium", active: currentPage === "agent-workspace", onClick: () => navigate("agent-workspace") },
        { label: "Outbound Engagement", active: currentPage === "outbound", onClick: () => navigate("outbound") },
        { label: "Login", active: currentPage === "login", onClick: () => navigate("login") },
      ],
    },
  ];

  /* Close on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  return (
    <AppHeader
      appName={
        <div className="relative">
          <AppName
            ref={triggerRef}
            icon={<img src={appIcon} alt="Desk" className="h-6 w-6" />}
            name={currentPage === "outbound" ? "Outbound Engagement" : "Agent Workspace Premium"}
            onClick={() => setMenuOpen((v) => !v)}
          />
          {menuOpen && (
            <div ref={menuRef} className="absolute left-0 top-full z-50 mt-1">
              <AppMenu groups={appMenuGroups} footer={<CXoneLogo />} />
            </div>
          )}
        </div>
      }
      actions={
        <>
          <ActionIconButton size="xl" title="Help">
            <CircleHelp className="h-5 w-5" strokeWidth={1.5} />
          </ActionIconButton>
          <ActionIconButton size="xl" title="Dashboards">
            <DashboardIcon className="text-lyra-fg-default" />
          </ActionIconButton>
          <ActionIconButton size="xl" title="Notifications">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </ActionIconButton>
          <ProfileMenu initials="JS" avatarColor="#5d6a79" groups={defaultProfileMenuGroups} showThemeToggle className="ml-1" />
        </>
      }
    />
  );
}
