import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DocSearchModal, useDocSearchKeyboardEvents } from "@docsearch/react";
import "@docsearch/css";
import { DOCSEARCH, docsearchConfigured } from "../lib/docsearch";

/**
 * DocSearch-backed replacement for CommandPalette, wired to the SAME triggers:
 * the global ⌘K / Ctrl+K hotkey and every `[data-open-search]` button in the
 * NavBar. We drive the modal's open state ourselves (composable API) instead
 * of rendering DocSearch's own <DocSearchButton>, so the existing navbar search
 * buttons keep working unchanged.
 *
 * Mounted by PageLayout only when flags.search === "docsearch". If the public
 * credentials are missing it renders nothing and the triggers become no-ops —
 * a misconfigured flag degrades gracefully rather than crashing the island.
 */
export default function DocSearchPalette() {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  // ⌘K / Ctrl+K to open, Esc to close — DocSearch's own keyboard handling.
  // Ask AI (v4's LLM feature) is intentionally disabled: we pass the required
  // props inert and never set the `askAi` prop on the modal.
  useDocSearchKeyboardEvents({
    isOpen: open,
    onOpen,
    onClose,
    isAskAiActive: false,
    onAskAiToggle: () => {},
  });

  // Wire the NavBar's [data-open-search] buttons to open the modal, mirroring
  // CommandPalette's trigger wiring so NavBar.astro needs no changes.
  useEffect(() => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-open-search]"),
    );
    triggers.forEach((t) => t.addEventListener("click", onOpen));
    return () => triggers.forEach((t) => t.removeEventListener("click", onOpen));
  }, [onOpen]);

  if (!open || !docsearchConfigured) return null;

  return createPortal(
    <DocSearchModal
      appId={DOCSEARCH.appId}
      apiKey={DOCSEARCH.apiKey}
      indices={[DOCSEARCH.indexName]}
      initialScrollY={window.scrollY}
      onClose={onClose}
      isAskAiActive={false}
      onAskAiToggle={() => {}}
      // Same-origin client navigation for in-site results.
      navigator={{
        navigate({ itemUrl }) {
          window.location.assign(itemUrl);
        },
      }}
    />,
    document.body,
  );
}
