import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { SearchDialog } from "@/components/search/SearchDialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(open => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur border-b border-border/60">
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-slate-500 text-xs h-8 pl-3 pr-2 rounded-lg border-slate-200 shadow-sm hover:border-slate-300 hover:text-slate-700 transition-colors min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search everything…
            </span>
            <kbd className="flex items-center gap-0.5 text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </kbd>
          </Button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </div>
      </main>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
