import {
  LayoutGrid,
  Settings,
  Monitor,
  FileText,
  PencilRuler,
} from "lucide-react";
import { LeftNav, type NavItem } from "@nicecxone/lyra-ui";

const navItems: NavItem[] = [
  { icon: <Monitor className="h-4 w-4" strokeWidth={1.5} />, label: "Monitor" },
  { icon: <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />, label: "Dashboard" },
  {
    icon: <Settings className="h-4 w-4" strokeWidth={1.5} />,
    label: "Configure",
    expandable: true,
    defaultOpen: false,
  },
  {
    icon: <PencilRuler className="h-4 w-4" strokeWidth={1.5} />,
    label: "Designer",
    active: true,
  },
  { icon: <FileText className="h-4 w-4" strokeWidth={1.5} />, label: "Examples" },
  { icon: <FileText className="h-4 w-4" strokeWidth={1.5} />, label: "Product Mockups" },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  /** Narrow-viewport hover-to-open overlay mode — same behavior as the
   *  Desk page's LeftNav (see AgentNextGenPage.tsx's `isNavNarrow`). */
  overlay?: boolean;
}

export function Sidebar({ open, onToggle, overlay }: SidebarProps) {
  return <LeftNav items={navItems} open={open} onToggle={onToggle} overlay={overlay} />;
}
