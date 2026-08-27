// EXPERIMENTAL, agent-next-gen-v2-ONLY fork of lyra-ui's `InteriorPanel`
// (lyra-ui/src/components/interior-panel.tsx) — per explicit request: "I'd
// like to test the absolute position happening at 1440px parent container
// width and remove the full screen breakpoint entirely - if I like it I will
// apply it to lyra-ui." Deliberately a LOCAL COPY, not an edit to the shared
// lyra-ui package: agent-next-gen-v2's `vite.config.ts` aliases
// `@nicecxone/lyra-ui` straight to lyra-ui's own `src/index.ts`, so editing
// the real component would have changed behavior for lyra-ui and every other
// consumer (agent-next-gen-v1 included) immediately, with no way to "try it
// first." This file exists ONLY so this app's own render sites can point at
// it instead (see each `InteriorPanel` import site — swapped from
// `@nicecxone/lyra-ui` to `./agent-next-gen-interior-panel-1440-test`); the
// real lyra-ui component is untouched. Delete this file and revert those
// imports if the experiment doesn't stick; port the two changes below into
// lyra-ui's own interior-panel.tsx (and delete this file) if it does.
//
// Exactly two behavioral changes from the original, both scoped to this
// copy only:
//   1. `isNarrow`'s absolute-overlay threshold: 1024px → 1440px.
//   2. `isAutoFullScreen` (the automatic <400px "no room for anything, just
//      go full-screen" breakpoint) removed entirely — every reference to it
//      below is gone too (`fullScreenToggle`'s visibility, `dragHandle`'s
//      visibility, `displayWidth`, and the absolute-vs-inline branch
//      condition). The user-triggered `allowFullScreen` toggle (the
//      Maximize2/Minimize2 button) is UNCHANGED — only the automatic,
//      width-triggered full-screen behavior was requested to be removed,
//      not the opt-in manual one.
//
// Everything else (props, JSX structure, drag-resize plumbing, close
// animation, full-screen toggle button) is an unmodified copy — including
// `usePanelDragResize`, inlined below since it's internal-only wiring not
// exported from lyra-ui's own `index.ts`.

import * as React from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { PanelHeader, PanelContent, PanelFooter, Tooltip, ActionIconButton, cn } from "@nicecxone/lyra-ui";

/* ── Cookie helpers (remembered resize width only) — copied verbatim from
   lyra-ui's interior-panel.tsx. ── */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}
function readNumberCookie(name: string): number | null {
  const val = getCookie(name);
  const num = val ? Number(val) : NaN;
  return Number.isFinite(num) ? num : null;
}

/* ── usePanelDragResize — inlined verbatim from lyra-ui's
   use-panel-drag-resize.ts (not exported from lyra-ui's own index.ts, so
   this experimental copy can't import it directly). Keep in sync with the
   original if that file changes while this experiment is still in flight. ── */
function usePanelDragResize(
  side: "left" | "right",
  initialWidth: number,
  min: number,
  max: number,
  onResizeStateChange?: (isResizing: boolean) => void,
  onWidthChange?: (width: number) => void
) {
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  useEffect(() => {
    setDragWidth(null);
  }, [initialWidth]);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = dragWidth ?? initialWidth;
      onResizeStateChange?.(true);

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = side === "right"
          ? startX.current - ev.clientX
          : ev.clientX - startX.current;
        const newW = Math.min(max, Math.max(min, startW.current + delta));
        setDragWidth(newW);
        onWidthChange?.(newW);
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onResizeStateChange?.(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [side, dragWidth, initialWidth, min, max, onResizeStateChange, onWidthChange]
  );

  return { width: dragWidth ?? initialWidth, onMouseDown };
}

export interface InteriorPanelTestProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right";
  open?: boolean;
  onClose?: () => void;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  onResizeStateChange?: (isResizing: boolean) => void;
  onWidthChange?: (width: number) => void;
  width?: number;
  storageKey?: string;
  headerTitle?: string;
  headerSubhead?: string;
  headerIcon?: React.ReactNode;
  headerTitleBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerTabs?: React.ReactNode;
  allowFullScreen?: boolean;
  exitFullScreenSignal?: number | string;
  footer?: React.ReactNode;
}

const InteriorPanel = React.forwardRef<HTMLDivElement, InteriorPanelTestProps>(
  (
    {
      className,
      side = "right",
      open = true,
      onClose,
      resizable = true,
      minWidth = 350,
      maxWidth = 425,
      onResizeStateChange,
      onWidthChange,
      width,
      storageKey,
      headerTitle,
      headerSubhead,
      headerIcon,
      headerTitleBadge,
      headerActions,
      headerTabs,
      allowFullScreen = false,
      exitFullScreenSignal,
      footer,
      children,
      ...props
    },
    ref
  ) => {
    const [initialWidth] = useState(() => {
      if (width !== undefined) return width;
      const stored = storageKey ? readNumberCookie(storageKey) : null;
      return stored ?? minWidth;
    });

    const [isResizing, setIsResizing] = useState(false);
    const handleResizeStateChange = useCallback((r: boolean) => {
      setIsResizing(r);
      onResizeStateChange?.(r);
    }, [onResizeStateChange]);
    const handleWidthChange = useCallback((w: number) => {
      if (storageKey) setCookie(storageKey, String(w));
      onWidthChange?.(w);
    }, [storageKey, onWidthChange]);
    const { width: currentWidth, onMouseDown } = usePanelDragResize(
      side, initialWidth, minWidth, maxWidth, handleResizeStateChange, handleWidthChange
    );
    const widthTransition = isResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)";

    const [isClosing, setIsClosing] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
      if (!open) {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => setIsClosing(false), 260);
      } else {
        clearTimeout(closeTimerRef.current);
        setIsClosing(false);
      }
      return () => clearTimeout(closeTimerRef.current);
    }, [open]);

    /* ── EXPERIMENT CHANGE #1: was `parentWidth < 1024`. ── */
    const outerRef = useRef<HTMLDivElement>(null);
    const [parentWidth, setParentWidth] = useState(9999);
    const isNarrow = parentWidth < 1440;

    /* ── EXPERIMENT CHANGE #2: `isAutoFullScreen` removed entirely — no
       automatic full-screen breakpoint in this copy. Every downstream
       reference below (`fullScreenToggle`, `dragHandle`, `displayWidth`, the
       absolute-vs-inline branch condition) had its `isAutoFullScreen` check
       dropped to match. ── */

    const stableOuterRef = useCallback((el: HTMLDivElement | null) => {
      (outerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLayoutEffect(() => {
      const el = outerRef.current?.parentElement;
      if (!el) return;
      setParentWidth(el.getBoundingClientRect().width);
      const ro = new ResizeObserver(([entry]) => setParentWidth(entry.contentRect.width));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const [isFullScreen, setIsFullScreen] = useState(false);

    const prevExitFullScreenSignalRef = useRef(exitFullScreenSignal);
    useEffect(() => {
      if (exitFullScreenSignal !== prevExitFullScreenSignalRef.current) {
        setIsFullScreen(false);
      }
      prevExitFullScreenSignalRef.current = exitFullScreenSignal;
    }, [exitFullScreenSignal]);

    // Uses lyra-ui's `ActionIconButton` rather than a hand-rolled `<button>`
    // (the original lyra-ui component's own version hand-rolls this, which
    // is fine there — but this file lives inside agent-next-gen-v2's own
    // linted `src/`, where CLAUDE.md's "Rule zero" no-hand-rolled-button
    // lint rule applies, and a straight verbatim copy tripped it) — visually
    // and behaviorally equivalent, just composed from the shared atom.
    const fullScreenToggle = allowFullScreen ? (
      <Tooltip content={isFullScreen ? "Exit full screen" : "Full screen"} placement="bottom" asLabel>
        <ActionIconButton
          aria-label={isFullScreen ? "Exit full screen" : "Full screen"}
          onClick={() => setIsFullScreen((v) => !v)}
          size="sm"
        >
          {isFullScreen ? (
            <Minimize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          )}
        </ActionIconButton>
      </Tooltip>
    ) : null;

    const dragHandle = resizable && open && !isFullScreen ? (
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 bottom-0 z-10 flex items-center justify-center group"
        style={{ [side === "right" ? "left" : "right"]: -4, width: 8, cursor: "col-resize" }}
        aria-hidden="true"
      >
        <div className="w-0.5 h-8 rounded-full bg-lyra-border-soft opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ) : null;

    const displayWidth: number | string = isFullScreen ? "100%" : currentWidth;

    const inner = (
      <div
        className="relative flex flex-col h-full"
        style={{ width: displayWidth, minWidth: displayWidth }}
      >
        {dragHandle}
        <div
          className="flex flex-col flex-1 min-h-0"
          style={{
            opacity: open ? 1 : 0,
            visibility: open ? "visible" : "hidden",
            transition: open ? "opacity 150ms ease 30ms" : "none",
          }}
        >
          {headerTitle && (
            <PanelHeader
              title={headerTitle}
              subhead={headerSubhead}
              icon={headerIcon}
              titleBadge={headerTitleBadge}
              actions={<>{headerActions}{fullScreenToggle}</>}
              tabs={headerTabs}
              onClose={onClose}
              bordered={false}
            />
          )}
          <PanelContent>{children}</PanelContent>
          {footer && <PanelFooter>{footer}</PanelFooter>}
        </div>
      </div>
    );

    const border = (open || isClosing)
      ? (side === "right" ? "border-l border-lyra-border-subtle" : "border-r border-lyra-border-subtle")
      : "";
    const interiorWidth: number | string = open ? displayWidth : 0;
    const pos = side === "right" ? "right-0" : "left-0";

    /* ── EXPERIMENT CHANGE #2 (cont'd): was
       `isNarrow || isFullScreen || isAutoFullScreen`. ── */
    if (isNarrow || isFullScreen) {
      return (
        <div
          ref={stableOuterRef}
          className={cn("absolute top-0 z-[5] h-full overflow-hidden bg-lyra-bg-surface-overlay shadow-lg", pos, border, className)}
          style={{ width: interiorWidth, transition: widthTransition }}
          {...props}
        >
          {inner}
        </div>
      );
    }

    return (
      <div
        ref={stableOuterRef}
        className={cn("relative flex flex-col h-full bg-lyra-bg-surface-overlay shrink-0", border, className)}
        style={{
          width: interiorWidth,
          minWidth: 0,
          overflow: "hidden",
          transition: widthTransition,
        }}
        {...props}
      >
        {side === "left"
          ? <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: displayWidth, minWidth: displayWidth }}>{inner}</div>
          : inner
        }
      </div>
    );
  }
);
InteriorPanel.displayName = "InteriorPanel";

export { InteriorPanel };
