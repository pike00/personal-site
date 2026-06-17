import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchDoc, SearchDocType } from "../lib/search";

interface Props {
  index: SearchDoc[];
}

const TYPE_BADGE: Record<SearchDocType, string> = {
  Note: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/20 dark:text-violet-300",
  Project: "bg-zinc-500/10 text-zinc-600 dark:bg-white/10 dark:text-zinc-200",
  Publication:
    "bg-violet-100/70 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Print:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300",
};

const MAX_RESULTS = 40;

export default function CommandPalette({ index }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: [
          { name: "title", weight: 2 },
          { name: "description", weight: 1 },
          { name: "tags", weight: 1 },
          { name: "type", weight: 0.5 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [index],
  );

  const results = useMemo(() => {
    if (!query.trim()) return index.slice(0, MAX_RESULTS);
    return fuse
      .search(query)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [query, fuse, index]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback((doc: SearchDoc | undefined) => {
    if (doc) window.location.href = doc.url;
  }, []);

  // Global hotkey (⌘K / Ctrl+K) and wiring of every [data-open-search] trigger.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);

    const openPalette = () => setOpen(true);
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>("[data-open-search]"),
    );
    triggers.forEach((t) => t.addEventListener("click", openPalette));

    return () => {
      window.removeEventListener("keydown", onKey);
      triggers.forEach((t) => t.removeEventListener("click", openPalette));
    };
  }, []);

  // Reset selection when the result set changes; focus the input on open.
  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-700">
          <svg
            className="h-5 w-5 shrink-0 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, projects, publications, and prints..."
            className="flex-1 bg-transparent py-3.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />
          <kbd className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-600">
            Esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-zinc-400">
              No results for “{query}”
            </li>
          )}
          {results.map((doc, i) => (
            <li key={`${doc.type}-${doc.url}`}>
              <a
                href={doc.url}
                onMouseEnter={() => setActive(i)}
                className={`flex items-start gap-3 px-4 py-2.5 ${
                  i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_BADGE[doc.type]}`}
                >
                  {doc.type}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {doc.title}
                  </span>
                  {doc.description && (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {doc.description}
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-700">
          <span><kbd className="font-sans">↑↓</kbd> navigate</span>
          <span><kbd className="font-sans">↵</kbd> open</span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
