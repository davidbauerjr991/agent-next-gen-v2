// Search panel content (the "Search" `EmbeddablePanelContent` shown in the
// right-docked panel rail) — shared between `AgentNextGenPage.tsx` (Agent
// Workspace 2.0) and `AgentWorkspace2WithDeskPage.tsx` (Agent Workspace 2.0
// With Desk), per explicit request. Previously this lived inline in
// `AgentNextGenPage.tsx` only, with the two pages' Search panels having
// drifted into two different shapes (this one's real Interactions/
// Messages/Customers/Threads sub-tabs vs. With Desk's older standalone-
// `SearchInput` version) — extracted here so both pages render the exact
// same underlying tab/content system, just configured with a different
// `tabs` list each.
//
// `useSearchPanelContent` mirrors the same "self-contained hook returning
// a ready `EmbeddablePanelContent`" shape `useScheduleContent`
// (SchedulePanel.tsx) already uses for its own panel — own the
// tab-switching state internally, take whatever data/handlers the
// INCLUDED tabs need as params. "Customers" needs a fairly large bag of
// lifted state (`SearchPanelCustomersProps` below) since — per the
// original inline version's own doc comment — it reuses the EXACT SAME
// state the Desk dashboard's own "Customers" tab uses, not a second,
// independent copy; that lifting has to stay in the page itself (the
// common ancestor of both places Customers is reachable from), so this
// hook just accepts it as a prop bag rather than owning it.
import { useState } from "react";
import {
  TabList,
  Tab,
  type EmbeddablePanelContent,
  type ChannelType,
  type CreateNewOutboundContact,
  type SortDirection,
  type ToastItem,
} from "@nicecxone/lyra-ui";
import {
  InteractionsListView,
  type InteractionHistoryRecord,
} from "@/components/agent-next-gen-interactions-table";
import {
  CustomersListView,
  type CustomerListRecord,
  type CustomerColKey,
} from "@/components/agent-next-gen-customers-table";
import {
  CustomerRowInfoPanel,
  AGENT_WORKSPACE_CUSTOMER_PANEL_TABS,
} from "@/components/agent-next-gen-customer-info-panel";

export type SearchPanelTabKey = "interactions" | "messages" | "customers" | "threads";

export const SEARCH_PANEL_TAB_LABELS: Record<SearchPanelTabKey, string> = {
  interactions: "Interactions",
  messages: "Messages",
  customers: "Customers",
  threads: "Threads",
};

/** Everything the "Customers" sub-tab needs — all lifted state/handlers,
 *  same shape `<CustomersListView>`/`<CustomerRowInfoPanel>` already take
 *  directly (see agent-next-gen-customers-table.tsx /
 *  agent-next-gen-customer-info-panel.tsx), just gathered into one bag so
 *  `useSearchPanelContent` below has a single optional param to accept
 *  instead of a dozen loose ones. Omit this prop entirely (and leave
 *  `"customers"` out of `tabs`) for a consumer with no Customers concept
 *  at all — see `AgentWorkspace2WithDeskPage.tsx`'s own usage. */
export interface SearchPanelCustomersProps {
  onStartInteraction: (
    contact: CreateNewOutboundContact,
    channel: ChannelType,
    phone: string,
    skillId: string
  ) => void;
  addedFilterKeys: string[];
  onAddedFilterKeysChange: (keys: string[]) => void;
  filterValues: Record<string, string[]>;
  onFilterValuesChange: (values: Record<string, string[]>) => void;
  onRowClick: (row: CustomerListRecord) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: CustomerColKey | null;
  sortDir: SortDirection;
  onSort: (key: CustomerColKey) => void;
  sortedRows: CustomerListRecord[];
  selectedRow: CustomerListRecord | null;
  onCloseRow: () => void;
  onPreviousRow: () => void;
  onNextRow: () => void;
  hasPreviousRow: boolean;
  hasNextRow: boolean;
}

export interface UseSearchPanelContentOptions {
  /** Which sub-tabs to show, in display order — the FIRST entry here is
   *  both the leftmost tab AND this hook's own default active tab (see
   *  `activeTab`'s own `useState` initializer below), so reordering this
   *  array is also how a consumer picks which tab is showing by default. */
  tabs: SearchPanelTabKey[];
  /** Required when `"interactions"` is included in `tabs` — forwarded
   *  straight through to `InteractionsListView`'s own `onAddToast`. */
  onAddToast?: (toast: Omit<ToastItem, "id">) => void;
  /** Used when `"interactions"` is included in `tabs` — forwarded straight
   *  through to `InteractionsListView`'s own `onOpenInteraction`. Per
   *  explicit request, clicking a row here opens it as a real, active
   *  assignment in the left nav; each consumer wires this to its own copy
   *  of the same "build an `ActiveInteraction` from this row and switch to
   *  it" handler `AgentNextGenPage.tsx`/`AgentWorkspace2WithDeskPage.tsx`
   *  already use for `handleOpenAssignmentFromNotification`. */
  onOpenInteraction?: (record: InteractionHistoryRecord) => void;
  /** Required when `"customers"` is included in `tabs`. */
  customers?: SearchPanelCustomersProps;
}

export function useSearchPanelContent({
  tabs,
  onAddToast,
  onOpenInteraction,
  customers,
}: UseSearchPanelContentOptions): EmbeddablePanelContent {
  const [activeTab, setActiveTab] = useState<SearchPanelTabKey>(tabs[0]);

  return {
    title: "Search",
    headerContent: (
      <TabList overflowMenu overflowBreakpoint="compact">
        {tabs.map((key) => (
          <Tab key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>
            {SEARCH_PANEL_TAB_LABELS[key]}
          </Tab>
        ))}
      </TabList>
    ),
    body:
      activeTab === "interactions" ? (
        <InteractionsListView onAddToast={onAddToast} onOpenInteraction={onOpenInteraction} />
      ) : activeTab === "customers" && customers ? (
        // `relative` here is load-bearing, not decorative — see this same
        // wrapper's doc comment at its original call site (AgentNextGenPage.tsx
        // git history / this file's own PR): without it, `CustomerRowInfoPanel`'s
        // full-screen/narrow state (which renders `position: absolute`) falls
        // through to whatever positioned ancestor is further up the tree and
        // ends up covering the tab row above too, not just this row.
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          <CustomersListView
            onStartInteraction={customers.onStartInteraction}
            addedFilterKeys={customers.addedFilterKeys}
            onAddedFilterKeysChange={customers.onAddedFilterKeysChange}
            filterValues={customers.filterValues}
            onFilterValuesChange={customers.onFilterValuesChange}
            onRowClick={customers.onRowClick}
            searchQuery={customers.searchQuery}
            onSearchChange={customers.onSearchChange}
            sortKey={customers.sortKey}
            sortDir={customers.sortDir}
            onSort={customers.onSort}
            sortedRows={customers.sortedRows}
            openRowId={customers.selectedRow?.contactNumber ?? null}
          />
          <CustomerRowInfoPanel
            row={customers.selectedRow}
            onClose={customers.onCloseRow}
            onPrevious={customers.onPreviousRow}
            onNext={customers.onNextRow}
            hasPrevious={customers.hasPreviousRow}
            hasNext={customers.hasNextRow}
            onStartInteraction={customers.onStartInteraction}
            // Only `AgentNextGenPage.tsx` (Agent Workspace 2.0) ever
            // configures `tabs` to include `"customers"` — With Desk's own
            // `tabs` list omits it entirely (see `WITH_DESK_SEARCH_PANEL_TABS`
            // at that page's own call site), so this branch never renders
            // there and hard-coding Workspace 2.0's own reduced tab set here
            // is safe rather than needing to also thread this through
            // `UseSearchPanelContentOptions`.
            tabs={AGENT_WORKSPACE_CUSTOMER_PANEL_TABS}
            onAddToast={onAddToast}
          />
        </div>
      ) : (
        <div
          key={activeTab}
          className="overflow-y-auto flex-1 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <p className="lyra-body-md text-lyra-fg-disabled text-center">Coming soon</p>
        </div>
      ),
  };
}
