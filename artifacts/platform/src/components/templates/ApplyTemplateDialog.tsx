import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTemplateSets,
  useGetTemplateSetDetail,
  useApplyTemplateSet,
} from "@workspace/api-client-react";
import { getGetRelocationTasksQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Layers, CheckCircle2, ChevronRight, Loader2, Sparkles,
  Clock, Tag,
} from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  individual: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-violet-50 text-violet-700 border-violet-200",
  corporate_premium: "bg-amber-50 text-amber-700 border-amber-200",
  any: "bg-slate-50 text-slate-600 border-slate-200",
};

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relocationId: number;
}

export function ApplyTemplateDialog({ open, onOpenChange, relocationId }: ApplyTemplateDialogProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sets, isLoading: loadingSets } = useGetTemplateSets({
    query: { enabled: open, queryKey: ["template-sets"] }
  });

  const { data: detail, isLoading: loadingDetail } = useGetTemplateSetDetail(
    selectedSetId ?? "",
    { query: { enabled: !!selectedSetId, queryKey: ["template-set", selectedSetId] } }
  );

  const applyMutation = useApplyTemplateSet({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Template applied!",
          description: `${data.tasksCreated} tasks created from "${data.setName}"${data.skipped > 0 ? `, ${data.skipped} skipped (already exist)` : ""}.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetRelocationTasksQueryKey(relocationId) });
        onOpenChange(false);
        setSelectedSetId(null);
      },
      onError: () => {
        toast({ title: "Failed to apply template", variant: "destructive" });
      },
    },
  });

  const handleApply = () => {
    if (!selectedSetId) return;
    applyMutation.mutate({ id: relocationId, data: { setId: selectedSetId, skipExisting: true } });
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedSetId(null);
  };

  const tasksByCategory = detail?.tasks.reduce<Record<string, typeof detail.tasks>>((acc, t) => {
    acc[t.category] = [...(acc[t.category] ?? []), t];
    return acc;
  }, {}) ?? {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Apply Task Template Set
          </DialogTitle>
          <DialogDescription>
            Bulk-create a standard task checklist from a pre-built Nairobi relocation template. Existing tasks with matching names are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Template picker */}
          <div className="w-72 flex-shrink-0 border-r overflow-y-auto p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Select Template</p>
            {loadingSets ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <RadioGroup value={selectedSetId ?? ""} onValueChange={setSelectedSetId}>
                {(sets ?? []).map(set => (
                  <div key={set.id}>
                    <RadioGroupItem value={set.id} id={`set-${set.id}`} className="sr-only" />
                    <Label
                      htmlFor={`set-${set.id}`}
                      className={cn(
                        "block cursor-pointer rounded-lg border p-3 transition-all",
                        selectedSetId === set.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-tight">{set.name}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TIER_COLORS[set.tier] ?? TIER_COLORS.any)}>
                              {set.tier.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> {set.taskCount} tasks
                            </span>
                          </div>
                        </div>
                        {selectedSetId === set.id && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">{set.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Right: Task preview */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedSetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Layers className="h-10 w-10 text-slate-200 mb-4" />
                <p className="text-sm text-slate-400 font-medium">Select a template to preview its tasks</p>
                <p className="text-xs text-slate-300 mt-1">Due dates are calculated from the client's arrival date</p>
              </div>
            ) : loadingDetail ? (
              <div className="p-4 space-y-2 flex-1">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : detail ? (
              <ScrollArea className="flex-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  {detail.tasks.length} tasks across {Object.keys(tasksByCategory).length} categories
                </p>
                <div className="space-y-4">
                  {Object.entries(tasksByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, tasks]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-3 w-3 text-primary" />
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{category}</p>
                        <span className="text-[10px] text-slate-400">{tasks.length}</span>
                      </div>
                      <div className="space-y-1 pl-4 border-l-2 border-primary/20">
                        {tasks.map((t, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 py-1">
                            <p className="text-xs text-slate-700 flex-1">{t.title}</p>
                            <span className={cn(
                              "text-[10px] flex items-center gap-0.5 flex-shrink-0",
                              t.daysFromArrival < 0 ? "text-amber-600" : "text-emerald-600"
                            )}>
                              <Clock className="h-2.5 w-2.5" />
                              {t.daysFromArrival < 0
                                ? `${Math.abs(t.daysFromArrival)}d before`
                                : t.daysFromArrival === 0
                                  ? "Arrival day"
                                  : `+${t.daysFromArrival}d`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : null}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/60">
          <Button variant="outline" onClick={handleClose} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedSetId || applyMutation.isPending}
            className="min-w-[140px]"
          >
            {applyMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-1.5" /> Apply Template</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
