"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download, FileText, FileType, type LucideIcon } from "lucide-react";
import { useId } from "react";

import { buttonClasses, type ButtonSize } from "@/components/ui/button";
import { docxHref, pdfHref } from "@/lib/brief-api";
import { cn } from "@/lib/cn";

interface ExportMenuProps {
  briefId: string;
  /** True while an update is running: the brief is about to be replaced. */
  disabled: boolean;
  size: ButtonSize;
  /** The pinned bar's form: the trigger keeps its own width instead of filling a phone's row. */
  compact: boolean;
}

interface ExportItemProps {
  href: string;
  icon: LucideIcon;
  children: string;
}

const MENU_SURFACE =
  "z-50 min-w-[max(var(--radix-dropdown-menu-trigger-width),248px)] origin-[var(--radix-dropdown-menu-content-transform-origin)] " +
  "rounded-2xl border border-line bg-surface p-1.5 shadow-lift " +
  "data-[state=open]:animate-[menu-in_150ms_var(--ease-out)] " +
  "data-[state=closed]:animate-[menu-out_100ms_var(--ease-in)_forwards]";

// The global focus ring (accent, 2px, offset 2px) shows on the item when the keyboard moved to it; the
// highlight is the hover state and also marks the keyboard's place.
const ITEM =
  "group flex h-12 cursor-pointer select-none items-center gap-3 rounded-[10px] px-2 text-[15px] font-medium text-ink " +
  "transition-[background-color,transform] duration-fast ease-out " +
  "data-[highlighted]:bg-ink/5 active:scale-[0.98] active:bg-ink/10";

const ITEM_ICON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent " +
  "transition-colors duration-fast ease-out group-data-[highlighted]:bg-accent group-data-[highlighted]:text-white";

/**
 * A real link to the file, not a button that fetches it: the browser downloads it with the session
 * cookie, and an expired session lands on sign-in instead of saving an HTML page as a PDF or a Word file.
 */
function ExportItem({ href, icon: Icon, children }: ExportItemProps) {
  return (
    <Menu.Item asChild>
      <a href={href} className={ITEM}>
        <span className={ITEM_ICON} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        {children}
      </a>
    </Menu.Item>
  );
}

/** The Export button of a brief that carries a document, and the menu of files it can be downloaded as. */
export function ExportMenu({ briefId, disabled, size, compact }: ExportMenuProps) {
  const labelId = useId();

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        className={cn(buttonClasses("primary", size), "group data-[state=open]:bg-accent-strong", !compact && "basis-full sm:basis-auto")}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
        <ChevronDown
          className="-mr-1 h-4 w-4 transition-transform duration-fast ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={8} collisionPadding={16} loop className={MENU_SURFACE}>
          <Menu.Group aria-labelledby={labelId}>
            <Menu.Label id={labelId} className="micro-label px-2 pb-2 pt-2.5">
              Download as
            </Menu.Label>
            <ExportItem href={pdfHref(briefId)} icon={FileText}>
              PDF
            </ExportItem>
            <ExportItem href={docxHref(briefId)} icon={FileType}>
              Word (.docx)
            </ExportItem>
          </Menu.Group>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
