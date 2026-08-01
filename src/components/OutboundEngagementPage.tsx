import { Plus } from "lucide-react";

import {
  Button,
  AiIcon,
  AdminShell,
  type TreeMenuItem,
} from "@nicecxone/lyra-ui";

/* ── Navigation items ── */
const panelItems: TreeMenuItem[] = [
  { label: "Campaigns", active: true },
  { label: "Contact Lists" },
  { label: "Do Not Call" },
  { label: "Call Results" },
  { label: "Scripts" },
  { label: "Schedules" },
  { label: "Reports" },
  { label: "Settings" },
];

export function OutboundEngagementPage({
  showBadge = false,
  onAiPanelToggle,
}: {
  showBadge?: boolean;
  onAiPanelToggle?: () => void;
}) {
  return (
    <AdminShell
      storageKeyPrefix="lyra_outbound"
      navTitle="Outbound"
      navItems={panelItems}
      defaultLeftPinned
      showPageHeader
      pageTitle="Campaigns"
      pageBadge={showBadge ? "Active" : undefined}
      pageActions={
        <>
          <Button variant="outline">Secondary</Button>
          <Button>
            <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
            New Campaign
          </Button>
          <div className="mx-1 h-6 w-px bg-lyra-border-subtle" />
          <Button variant="outline" onClick={onAiPanelToggle}>
            <AiIcon className="h-4 w-4" />
            Ask AI
          </Button>
        </>
      }
      interiorPanelOpen={false}
      interiorPanelContent={
        <div className="p-4">
          <p className="lyra-body-md text-lyra-fg-secondary">Panel content goes here.</p>
        </div>
      }
      rightPanelContent={
        <div className="p-4">
          <p className="lyra-body-md text-lyra-fg-secondary">Side panel content.</p>
        </div>
      }
    >
      <div className="flex-1" />
    </AdminShell>
  );
}
