import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGlobalSearch } from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, Plane, Briefcase, Home, GraduationCap,
  ArrowRight, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

const GROUP_CONFIG = {
  profiles:    { label: "Clients",    icon: Users,          color: "text-blue-600",   bg: "bg-blue-50"   },
  relocations: { label: "Cases",      icon: Plane,          color: "text-violet-600", bg: "bg-violet-50" },
  vendors:     { label: "Vendors",    icon: Briefcase,      color: "text-amber-600",  bg: "bg-amber-50"  },
  housing:     { label: "Housing",    icon: Home,           color: "text-emerald-600",bg: "bg-emerald-50"},
  schools:     { label: "Schools",    icon: GraduationCap,  color: "text-rose-600",   bg: "bg-rose-50"   },
} as const;

type GroupKey = keyof typeof GROUP_CONFIG;

type ResultItem = { id: number; type: string; title: string; subtitle: string; href: string };

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, isError } = useGlobalSearch(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length >= 2, queryKey: ["search", debouncedQuery] } }
  );

  const allResults: ResultItem[] = data
    ? (["profiles","relocations","vendors","housing","schools"] as GroupKey[]).flatMap(
        k => (data[k] ?? []) as ResultItem[]
      )
    : [];

  const navigate_to = useCallback((href: string) => {
    navigate(href);
    onOpenChange(false);
    setQuery("");
  }, [navigate, onOpenChange]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[activeIndex]) {
      navigate_to(allResults[activeIndex].href);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const renderGroups = () => {
    if (!data) return null;
    let offset = 0;
    const groups: React.ReactElement[] = [];

    (["profiles","relocations","vendors","housing","schools"] as GroupKey[]).forEach(key => {
      const items = data[key] as ResultItem[];
      if (!items || items.length === 0) { return; }
      const cfg = GROUP_CONFIG[key];
      const Icon = cfg.icon;
      const groupStart = offset;

      groups.push(
        <div key={key} className="mb-1">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className={cn("p-1 rounded", cfg.bg)}>
              <Icon className={cn("h-3 w-3", cfg.color)} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {cfg.label}
            </span>
            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-400">
              {items.length}
            </Badge>
          </div>
          {items.map((item, i) => {
            const idx = groupStart + i;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors group",
                  idx === activeIndex ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-700"
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => navigate_to(item.href)}
              >
                <div className={cn(
                  "p-1.5 rounded flex-shrink-0",
                  idx === activeIndex ? "bg-primary/10" : cfg.bg
                )}>
                  <Icon className={cn("h-3.5 w-3.5", idx === activeIndex ? "text-primary" : cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>
                <ArrowRight className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 transition-opacity",
                  idx === activeIndex ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50"
                )} />
              </button>
            );
          })}
        </div>
      );
      offset += items.length;
    });
    return groups;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-xl overflow-hidden rounded-xl shadow-2xl border-0"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {isFetching
            ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
            : <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          }
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, cases, vendors, housing, schools…"
            className="border-0 shadow-none focus-visible:ring-0 h-auto text-sm px-0 placeholder:text-slate-400"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-400 text-[10px] rounded font-mono border border-slate-200 flex-shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {!query && (
            <div className="py-12 text-center">
              <Search className="h-8 w-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Start typing to search across all records</p>
              <p className="text-xs text-slate-300 mt-1">Clients · Cases · Vendors · Housing · Schools</p>
            </div>
          )}
          {query && query.length < 2 && (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">Type at least 2 characters…</p>
            </div>
          )}
          {debouncedQuery.length >= 2 && !isFetching && data && data.total === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-500">No results for "{debouncedQuery}"</p>
              <p className="text-xs text-slate-400 mt-1">Try a different name, category, or neighbourhood</p>
            </div>
          )}
          {isError && (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-red-500">Search failed — please try again</p>
            </div>
          )}
          {data && data.total > 0 && renderGroups()}
        </div>

        {/* Footer */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/60">
            <p className="text-[11px] text-slate-400">
              {data.total} result{data.total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↵</kbd> open
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
