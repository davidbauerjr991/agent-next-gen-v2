import { useState } from "react";
import {
  RefreshCw,
  Pencil,
  Copy,
  Trash2,
  CircleCheck,
  Plus,
  Minus,
} from "lucide-react";

import {
  Button,
  AiIcon,
  AdminShell,
  Checkbox,
  TabList,
  Tab,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortableTableHead,
  TableToolbar,
  TableFooter,
  ColumnToggle,
  useColumnReorder,
  KebabMenuButton,
} from "@nicecxone/lyra-ui";
import type { SortDirection, ColumnToggleItem, TreeMenuItem } from "@nicecxone/lyra-ui";

/* ── Navigation items ── */
const panelItems: TreeMenuItem[] = [
  { label: "Desktop Library", active: true },
  { label: "Forms" },
  { label: "Scripter" },
  { label: "Call Details" },
  { label: "Functions" },
  { label: "Themes" },
  { label: "Images" },
  { label: "AI Tasks" },
];

/* ── Mock data ── */
interface DesktopRecord {
  id: number;
  name: string;
  published: boolean;
  customerCard: string;
  description: string;
  createdBy: string;
  createdDate: string;
  modifiedDate: string;
  version: number;
}

const records: DesktopRecord[] = [
  { id: 1, name: "Agent Desktop #1", published: true, customerCard: "—", description: "Back office", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 2, name: "Agent Desktop #2", published: true, customerCard: "—", description: "Custom", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 3, name: "Agent Desktop #3", published: true, customerCard: "—", description: "Knowledge Worker", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 4, name: "Agent Desktop #4", published: true, customerCard: "—", description: "BPO", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 5, name: "Agent Desktop #5", published: true, customerCard: "—", description: "Collections", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 6, name: "Agent Desktop #6", published: true, customerCard: "—", description: "Collections - Finan...", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 7, name: "Agent Desktop #7", published: true, customerCard: "—", description: "Retail Agents", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 8, name: "Agent Desktop #8", published: true, customerCard: "—", description: "Beverages", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 9, name: "Agent Desktop #9", published: true, customerCard: "—", description: "Customer Service 1", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 10, name: "Agent Desktop #10", published: true, customerCard: "—", description: "Customer Service 2", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 11, name: "Agent Desktop #11", published: true, customerCard: "—", description: "Front Office", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 12, name: "Agent Desktop #12", published: true, customerCard: "—", description: "Payments", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 13, name: "Agent Desktop #13", published: true, customerCard: "—", description: "Air Travel", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 14, name: "Agent Desktop #14", published: true, customerCard: "—", description: "Healthcare", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 15, name: "Agent Desktop #15", published: true, customerCard: "—", description: "Insurance", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
  { id: 16, name: "Agent Desktop #16", published: true, customerCard: "—", description: "Utilities", createdBy: "Jim Smith", createdDate: "02/23/2025 02:32...", modifiedDate: "02/23/2025 02:32...", version: 27 },
];

export function DesktopDesignsPage({ showBadge = false, onAiPanelToggle }: { showBadge?: boolean; onAiPanelToggle?: () => void }) {

  /* ── Interior panel (Toolbar toggle) — controlled here since it's opened
     from inside the table toolbar, which lives in AdminShell's children. ── */
  const [interiorPanelOpen, setInteriorPanelOpen] = useState(false);

  /* ── Table state ── */
  const [activeTab, setActiveTab] = useState<"library" | "templates">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  type ColKey = "name" | "published" | "customerCard" | "description" | "createdBy" | "createdDate" | "modifiedDate" | "version";
  type SortKey = Exclude<ColKey, "published" | "customerCard">;

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const columnConfig: Record<ColKey, { label: string; flex: string; sortable: boolean }> = {
    name:         { label: "Name",          flex: "flex-[2] min-w-[140px]",  sortable: true },
    published:    { label: "Published",     flex: "flex-1 min-w-[80px]",     sortable: false },
    customerCard: { label: "Customer Card", flex: "flex-[1.3] min-w-[100px]", sortable: false },
    description:  { label: "Description",   flex: "flex-[2] min-w-[140px]",  sortable: true },
    createdBy:    { label: "Created By",    flex: "flex-[1.3] min-w-[100px]", sortable: true },
    createdDate:  { label: "Created Date",  flex: "flex-[2] min-w-[140px]",  sortable: true },
    modifiedDate: { label: "Modified Date", flex: "flex-[2] min-w-[140px]",  sortable: true },
    version:      { label: "Version",       flex: "flex-1 min-w-[60px]",     sortable: true },
  };

  const allColumnDefs: ColumnToggleItem[] = (Object.keys(columnConfig) as ColKey[]).map((key) => ({
    key, label: columnConfig[key].label,
  }));

  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(Object.keys(columnConfig) as ColKey[]));

  const { columnOrder: allColumnOrder, dragOverKey, dragHandlers } = useColumnReorder<ColKey>(Object.keys(columnConfig) as ColKey[]);
  const columnOrder = allColumnOrder.filter((k) => visibleCols.has(k));

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      const next: SortDirection = sortDir === null ? "asc" : sortDir === "asc" ? "desc" : null;
      setSortDir(next);
      if (next === null) setSortKey(null);
    } else { setSortKey(key); setSortDir("asc"); }
  }

  function dirFor(key: SortKey): SortDirection { return sortKey === key ? sortDir : null; }

  const filteredRecords = records.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = String(a[sortKey]).toLowerCase();
    const bVal = String(b[sortKey]).toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + rowsPerPage);
  const displayStart = sortedRecords.length > 0 ? startIndex + 1 : 0;
  const displayEnd = Math.min(startIndex + rowsPerPage, sortedRecords.length);

  const allSelected = paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.has(r.id));
  const someSelected = !allSelected && paginatedRecords.some((r) => selectedIds.has(r.id));

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds((prev) => { const next = new Set(prev); paginatedRecords.forEach((r) => next.add(r.id)); return next; });
    else setSelectedIds((prev) => { const next = new Set(prev); paginatedRecords.forEach((r) => next.delete(r.id)); return next; });
  }

  function toggleRow(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return (
    <AdminShell
      storageKeyPrefix="lyra"
      navTitle="Designer"
      navItems={panelItems}
      showPageHeader
      pageTitle="Desktop Library"
      pageBadge={showBadge ? "Active" : undefined}
      pageActions={
        <>
          <Button variant="outline">Secondary</Button>
          <Button>
            <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
            New Desktop
          </Button>
          <div className="mx-1 h-6 w-px bg-lyra-border-subtle" />
          <Button variant="outline" onClick={onAiPanelToggle}>
            <AiIcon className="h-4 w-4" />
            Ask AI
          </Button>
        </>
      }
      interiorPanelOpen={interiorPanelOpen}
      onInteriorPanelClose={() => setInteriorPanelOpen(false)}
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
      {/* ════ Tabs ════ */}
      <TabList overflowMenu className="px-6">
        <Tab active={activeTab === "library"} onClick={() => setActiveTab("library")}>Custom Desktops</Tab>
        <Tab active={activeTab === "templates"} onClick={() => setActiveTab("templates")}>Templates</Tab>
      </TabList>

      {/* ════ Toolbar ════ */}
      <TableToolbar
        className="px-6"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Quick Search"
        actionDefs={[
          { key: "refresh", label: "Refresh", icon: <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> },
          { key: "edit", label: "Edit", icon: <Pencil className="h-4 w-4" strokeWidth={1.5} />, disabled: selectedIds.size === 0 },
          { key: "copy", label: "Copy", icon: <Copy className="h-4 w-4" strokeWidth={1.5} />, disabled: selectedIds.size === 0 },
          { key: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" strokeWidth={1.5} />, disabled: selectedIds.size === 0 },
        ]}
        actions={
          <ColumnToggle
            columns={allColumnDefs}
            visibleColumns={visibleCols}
            onVisibilityChange={setVisibleCols}
          />
        }
        toolbarPanelToggle="right"
        onRightPanelToggle={() => setInteriorPanelOpen((v) => !v)}
      />

      {/* ════ Data Table ════ */}
      <div className="flex-1 overflow-hidden px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px] shrink-0">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
              </TableHead>
              {columnOrder.map((key) => {
                const col = columnConfig[key];
                if (col.sortable) {
                  return (
                    <SortableTableHead
                      key={key}
                      className={col.flex}
                      sortDirection={dirFor(key as SortKey)}
                      onSort={() => handleSort(key as SortKey)}
                      columnKey={key}
                      dragHandlers={dragHandlers}
                      isDragOver={dragOverKey === key}
                    >
                      {col.label}
                    </SortableTableHead>
                  );
                }
                return (
                  <TableHead
                    key={key}
                    className={col.flex}
                    draggable
                    onDragStart={(e) => dragHandlers.onDragStart(e, key)}
                    onDragOver={(e) => dragHandlers.onDragOver(e, key)}
                    onDrop={(e) => dragHandlers.onDrop(e, key)}
                    onDragEnd={dragHandlers.onDragEnd}
                    onDragLeave={dragHandlers.onDragLeave}
                    style={dragOverKey === key ? { backgroundColor: "var(--lyra-color-bg-active-moderate)" } : undefined}
                  >
                    {col.label}
                  </TableHead>
                );
              })}
              <TableHead className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecords.map((record) => (
              <TableRow key={record.id} data-state={selectedIds.has(record.id) ? "selected" : undefined}>
                <TableCell className="w-[40px] shrink-0">
                  <Checkbox checked={selectedIds.has(record.id)} onCheckedChange={() => toggleRow(record.id)} />
                </TableCell>
                {columnOrder.map((key) => {
                  const col = columnConfig[key];
                  if (key === "published") {
                    return (
                      <TableCell key={key} className={col.flex}>
                        {record.published
                          ? <CircleCheck className="h-5 w-5 text-lyra-status-success-strong" strokeWidth={1.5} />
                          : <Minus className="h-5 w-5 text-lyra-fg-disabled" strokeWidth={1.5} />}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={key} className={`${col.flex}${key === "name" ? " text-lyra-fg-link cursor-pointer hover:underline" : ""}`}>
                      {String(record[key as keyof DesktopRecord])}
                    </TableCell>
                  );
                })}
                <TableCell className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base">
                  {/* Shared `KebabMenuButton` (composes `MenuRadix`), not a
                      hand-rolled `<button>` — same per-row actions as the
                      toolbar's own bulk Edit/Copy/Delete above, scoped to
                      just this record. */}
                  <KebabMenuButton
                    ariaLabel={`More options for ${record.name}`}
                    items={[
                      { id: "edit", label: "Edit", icon: <Pencil className="h-4 w-4" strokeWidth={1.5} /> },
                      { id: "copy", label: "Copy", icon: <Copy className="h-4 w-4" strokeWidth={1.5} /> },
                      { id: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" strokeWidth={1.5} />, destructive: true },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ════ Footer ════ */}
      <TableFooter
        className="px-6 shrink-0"
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
        totalRecords={sortedRecords.length}
        displayStart={displayStart}
        displayEnd={displayEnd}
      />
    </AdminShell>
  );
}
