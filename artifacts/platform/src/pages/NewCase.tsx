import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useCreateProfile, useCreateRelocation, useApplyTemplateSet,
  useGetTemplateSets, getGetTemplateSetsQueryKey,
} from "@workspace/api-client-react";
import type { TemplateSet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListRelocationsQueryKey } from "@workspace/api-client-react";
import {
  User, Briefcase, Calendar, Home, MapPin, Layers, CheckCircle2,
  ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCheck,
  Users, GraduationCap, DollarSign, Building2, Star, FileText,
} from "lucide-react";

/* ──────────────────────────────────────────────────────── types */

interface WizardState {
  // Step 1: Client
  fullName: string;
  email: string;
  nationality: string;
  phone: string;
  // Step 2: Employment
  employer: string;
  employerType: string;
  corporateAccount: string;
  // Step 3: Relocation
  arrivalDate: string;
  familySize: string;
  schoolAgeChildren: string;
  budgetUsd: string;
  packageTier: string;
  // Step 4: Preferences
  neighbourhoods: string[];
  specificNeeds: string;
  // Step 5: Case Setup
  assignedTo: string;
  caseNotes: string;
  templateSetId: string;
}

const INITIAL: WizardState = {
  fullName: "", email: "", nationality: "", phone: "",
  employer: "", employerType: "corporate", corporateAccount: "",
  arrivalDate: "", familySize: "1", schoolAgeChildren: "0", budgetUsd: "", packageTier: "individual",
  neighbourhoods: [], specificNeeds: "",
  assignedTo: "", caseNotes: "", templateSetId: "none",
};

const NAIROBI_HOODS = [
  "Gigiri", "Runda", "Westlands", "Karen", "Lavington",
  "Kilimani", "Spring Valley", "Muthaiga", "Riverside", "Parklands",
  "Loresho", "Lower Kabete",
];

const EMPLOYER_TYPES: Record<string, string> = {
  un: "United Nations",
  ngo: "NGO",
  corporate: "Corporate",
  embassy: "Embassy / Diplomatic",
  individual: "Individual / Self-Employed",
};

const PACKAGE_TIERS: Record<string, { label: string; price: string; description: string; color: string }> = {
  individual:          { label: "Individual",          price: "$2,500", description: "Solo professional relocation", color: "border-slate-200" },
  premium:             { label: "Premium",             price: "$5,000", description: "Family with full support", color: "border-indigo-300" },
  corporate_standard: { label: "Corporate Standard",  price: "$8,000", description: "Corporate-sponsored package", color: "border-amber-300" },
  corporate_premium:  { label: "Corporate Premium",   price: "$15,000", description: "Executive white-glove service", color: "border-emerald-400" },
};

const STEPS = [
  { id: 1, title: "Client",      icon: User,         desc: "Personal details" },
  { id: 2, title: "Employment",  icon: Briefcase,    desc: "Employer info" },
  { id: 3, title: "Relocation",  icon: Calendar,     desc: "Dates & budget" },
  { id: 4, title: "Preferences", icon: MapPin,       desc: "Neighbourhoods" },
  { id: 5, title: "Setup",       icon: Layers,       desc: "Template & team" },
  { id: 6, title: "Review",      icon: CheckCheck,   desc: "Confirm & create" },
];

/* ──────────────────────────────────────────────────────── validators */

function validateStep(step: number, s: WizardState): string[] {
  const errs: string[] = [];
  if (step === 1) {
    if (s.fullName.trim().length < 2) errs.push("Full name is required (min 2 chars)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errs.push("Valid email is required");
    if (s.nationality.trim().length < 2) errs.push("Nationality is required");
  }
  if (step === 2) {
    if (s.employer.trim().length < 2) errs.push("Employer name is required");
  }
  if (step === 3) {
    if (!s.arrivalDate) errs.push("Arrival date is required");
    if (parseInt(s.familySize) < 1) errs.push("Family size must be at least 1");
  }
  return errs;
}

/* ──────────────────────────────────────────────────────── component */

export default function NewCase() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const templateSetsQ = useGetTemplateSets({ query: { queryKey: getGetTemplateSetsQueryKey() } });
  const templateSets = (templateSetsQ.data ?? []) as TemplateSet[];

  const createProfile = useCreateProfile();
  const createRelocation = useCreateRelocation();
  const applyTemplate = useApplyTemplateSet();

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  function set<K extends keyof WizardState>(key: K, val: WizardState[K]) {
    setState(prev => ({ ...prev, [key]: val }));
  }

  function toggleHood(hood: string) {
    setState(prev => ({
      ...prev,
      neighbourhoods: prev.neighbourhoods.includes(hood)
        ? prev.neighbourhoods.filter(h => h !== hood)
        : [...prev.neighbourhoods, hood],
    }));
  }

  function next() {
    const errs = validateStep(step, state);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep(s => Math.min(s + 1, STEPS.length));
  }

  function back() {
    setErrors([]);
    setStep(s => Math.max(s - 1, 1));
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      // 1. Create profile
      const profile = await createProfile.mutateAsync({
        data: {
          fullName: state.fullName.trim(),
          email: state.email.trim(),
          nationality: state.nationality.trim(),
          employer: state.employer.trim(),
          employerType: state.employerType,
          arrivalDate: new Date(state.arrivalDate).toISOString(),
          familySize: parseInt(state.familySize),
          schoolAgeChildren: parseInt(state.schoolAgeChildren),
          budgetUsd: state.budgetUsd ? parseInt(state.budgetUsd) : null,
          neighbourhoodPreferences: state.neighbourhoods.join(", ") || undefined,
          specificNeeds: state.specificNeeds.trim() || null,
        }
      });

      // 2. Create relocation
      const relocation = await createRelocation.mutateAsync({
        data: {
          profileId: profile.id,
          status: "intake",
          stage: "profile_complete",
          packageTier: state.packageTier,
          assignedTo: state.assignedTo.trim() || null,
          corporateAccount: state.corporateAccount.trim() || null,
          notes: state.caseNotes.trim() || null,
        }
      });

      // 3. Optionally apply template
      if (state.templateSetId && state.templateSetId !== "none") {
        await applyTemplate.mutateAsync({
          id: relocation.id,
          data: { setId: state.templateSetId }
        });
      }

      qc.invalidateQueries({ queryKey: getListRelocationsQueryKey() });

      toast({
        title: "Case created successfully!",
        description: `${profile.fullName}'s relocation case is ready.`,
      });

      navigate(`/relocations/${relocation.id}`);
    } catch {
      toast({
        title: "Creation failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  const selectedTemplate = useMemo(
    () => templateSets.find(t => t.id === state.templateSetId),
    [templateSets, state.templateSetId]
  );

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Top nav */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate("/relocations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Relocation Case</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Guided intake — create profile, case, and task checklist in one flow</p>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <button
                key={s.id}
                className={`flex flex-col items-center gap-1 group transition-opacity ${step < s.id ? "opacity-40" : "opacity-100"}`}
                onClick={() => { if (s.id < step) { setErrors([]); setStep(s.id); } }}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done    ? "bg-emerald-500 border-emerald-500 text-white" :
                  active  ? "bg-primary border-primary text-primary-foreground" :
                            "bg-white border-slate-200 text-slate-400"
                }`}>
                  {done ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-primary" : done ? "text-emerald-600" : "text-slate-400"}`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
        <Progress value={pct} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1.5 text-right">Step {step} of {STEPS.length}</p>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700">• {e}</p>
          ))}
        </div>
      )}

      {/* ── Step 1: Client ─────────────────────────────────── */}
      {step === 1 && (
        <StepCard title="Client Details" icon={User} desc="Who is relocating to Nairobi?">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full Name *">
              <Input value={state.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Email *">
              <Input type="email" value={state.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" />
            </Field>
            <Field label="Nationality *">
              <Input value={state.nationality} onChange={e => set("nationality", e.target.value)} placeholder="e.g. Canadian" />
            </Field>
            <Field label="Phone (optional)">
              <Input value={state.phone} onChange={e => set("phone", e.target.value)} placeholder="+254 700 000 000" />
            </Field>
          </div>
        </StepCard>
      )}

      {/* ── Step 2: Employment ─────────────────────────────── */}
      {step === 2 && (
        <StepCard title="Employment Details" icon={Briefcase} desc="Employer and organisation information">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Employer / Organisation *" className="sm:col-span-2">
              <Input value={state.employer} onChange={e => set("employer", e.target.value)} placeholder="e.g. United Nations UNOPS" />
            </Field>
            <Field label="Employer Type">
              <Select value={state.employerType} onValueChange={v => set("employerType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYER_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Corporate Account (optional)">
              <Input value={state.corporateAccount} onChange={e => set("corporateAccount", e.target.value)} placeholder="e.g. USAID Kenya 2026" />
            </Field>
          </div>
        </StepCard>
      )}

      {/* ── Step 3: Relocation ─────────────────────────────── */}
      {step === 3 && (
        <StepCard title="Relocation Details" icon={Calendar} desc="Arrival timeline and family requirements">
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="Expected Arrival *" className="sm:col-span-1">
                <Input type="date" value={state.arrivalDate} onChange={e => set("arrivalDate", e.target.value)} />
              </Field>
              <Field label="Family Size *">
                <Input type="number" min={1} value={state.familySize} onChange={e => set("familySize", e.target.value)} />
              </Field>
              <Field label="School-Age Children">
                <Input type="number" min={0} value={state.schoolAgeChildren} onChange={e => set("schoolAgeChildren", e.target.value)} />
              </Field>
            </div>

            <Field label="Monthly Housing Budget (USD)">
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="number" min={0} className="pl-8" placeholder="e.g. 4000" value={state.budgetUsd} onChange={e => set("budgetUsd", e.target.value)} />
              </div>
            </Field>

            <div>
              <p className="text-sm font-medium mb-3">Service Package *</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(PACKAGE_TIERS).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("packageTier", k)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      state.packageTier === k
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : `${v.color} hover:border-slate-300`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{v.label}</span>
                      <span className="text-xs font-bold text-primary">{v.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                    {state.packageTier === k && (
                      <div className="mt-2 flex items-center gap-1 text-primary text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </StepCard>
      )}

      {/* ── Step 4: Preferences ────────────────────────────── */}
      {step === 4 && (
        <StepCard title="Location Preferences" icon={MapPin} desc="Preferred Nairobi neighbourhoods and any specific requirements">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">
                Preferred Neighbourhoods
                {state.neighbourhoods.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">({state.neighbourhoods.length} selected)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {NAIROBI_HOODS.map(hood => {
                  const selected = state.neighbourhoods.includes(hood);
                  return (
                    <button
                      key={hood}
                      type="button"
                      onClick={() => toggleHood(hood)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {hood}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Specific Needs & Notes">
              <Textarea
                rows={4}
                value={state.specificNeeds}
                onChange={e => set("specificNeeds", e.target.value)}
                placeholder="e.g. Pet-friendly housing required, needs strong fibre internet, prefers a gated community with 24/7 security, spouse seeking employment support..."
                className="resize-none"
              />
            </Field>
          </div>
        </StepCard>
      )}

      {/* ── Step 5: Case Setup ─────────────────────────────── */}
      {step === 5 && (
        <StepCard title="Case Setup" icon={Layers} desc="Assign a coordinator, add notes, and optionally apply a task template">
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Assigned Coordinator">
                <Input value={state.assignedTo} onChange={e => set("assignedTo", e.target.value)} placeholder="e.g. Sarah Njoroge" />
              </Field>
              <Field label="Initial Case Notes">
                <Input value={state.caseNotes} onChange={e => set("caseNotes", e.target.value)} placeholder="e.g. VIP client, urgent timeline" />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Task Template (optional)
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Apply a pre-built checklist to auto-populate the task list based on this client's package tier.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => set("templateSetId", "none")}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    state.templateSetId === "none"
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">No template — start with blank checklist</p>
                    <p className="text-xs text-muted-foreground">Add tasks manually from the case page</p>
                  </div>
                  {state.templateSetId === "none" && <CheckCircle2 className="h-4 w-4 text-slate-500 ml-auto flex-shrink-0" />}
                </button>

                {templateSets.map(tmpl => {
                  const active = state.templateSetId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => set("templateSetId", tmpl.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-slate-200 hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-primary text-white" : "bg-indigo-50"}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tmpl.name}</p>
                          <TierBadge tier={tmpl.tier} />
                        </div>
                        <p className="text-xs text-muted-foreground">{tmpl.taskCount} tasks · {tmpl.description}</p>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 text-primary ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </StepCard>
      )}

      {/* ── Step 6: Review ─────────────────────────────────── */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{state.fullName || "—"}</h2>
                <p className="text-sm text-muted-foreground">{state.email}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs">
                {PACKAGE_TIERS[state.packageTier]?.label}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <ReviewSection title="Client" icon={User}>
                <ReviewRow label="Nationality" value={state.nationality} />
                <ReviewRow label="Phone" value={state.phone || "—"} />
              </ReviewSection>
              <ReviewSection title="Employment" icon={Briefcase}>
                <ReviewRow label="Employer" value={state.employer} />
                <ReviewRow label="Type" value={EMPLOYER_TYPES[state.employerType] ?? state.employerType} />
                {state.corporateAccount && <ReviewRow label="Account" value={state.corporateAccount} />}
              </ReviewSection>
              <ReviewSection title="Relocation" icon={Calendar}>
                <ReviewRow label="Arrival" value={state.arrivalDate} />
                <ReviewRow label="Family" value={`${state.familySize} people${parseInt(state.schoolAgeChildren) > 0 ? ` · ${state.schoolAgeChildren} school-age` : ""}`} />
                <ReviewRow label="Budget" value={state.budgetUsd ? `$${parseInt(state.budgetUsd).toLocaleString()}/mo` : "—"} />
              </ReviewSection>
              <ReviewSection title="Preferences" icon={MapPin}>
                <ReviewRow
                  label="Neighbourhoods"
                  value={state.neighbourhoods.length > 0 ? state.neighbourhoods.join(", ") : "None selected"}
                />
              </ReviewSection>
              <ReviewSection title="Case Setup" icon={Layers} className="sm:col-span-2">
                <ReviewRow label="Coordinator" value={state.assignedTo || "Unassigned"} />
                <ReviewRow label="Task Template" value={
                  state.templateSetId === "none"
                    ? "None — blank checklist"
                    : selectedTemplate?.name ?? state.templateSetId
                } />
                {state.caseNotes && <ReviewRow label="Notes" value={state.caseNotes} />}
              </ReviewSection>
            </div>

            {state.specificNeeds && (
              <div className="rounded-xl bg-slate-50 border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Specific Needs</p>
                <p className="text-sm text-slate-700">{state.specificNeeds}</p>
              </div>
            )}
          </div>

          {selectedTemplate && selectedTemplate.id !== "none" && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  "{selectedTemplate.name}" will be applied — {selectedTemplate.taskCount} tasks auto-created with due dates
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">Tasks that already exist by name are automatically skipped</p>
              </div>
            </div>
          )}

          <Button
            className="w-full h-12 text-base gap-2"
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Creating case…</>
            ) : (
              <><CheckCheck className="h-5 w-5" /> Create Relocation Case</>
            )}
          </Button>
        </div>
      )}

      {/* Nav buttons */}
      {step < 6 && (
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={back} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={next} className="min-w-32">
            {step === 5 ? "Review" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
      {step === 6 && (
        <div className="mt-4 flex justify-start">
          <Button variant="ghost" onClick={back} disabled={submitting}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Edit Details
          </Button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── helpers */

function StepCard({ title, icon: Icon, desc, children }: {
  title: string; icon: React.ElementType; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="px-6 py-5 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ReviewSection({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border p-4 space-y-2 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="font-medium text-sm text-right">{value}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    any: "bg-slate-100 text-slate-600",
    individual: "bg-slate-100 text-slate-600",
    premium: "bg-indigo-100 text-indigo-700",
    corporate_premium: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[tier] ?? colors["any"]}`}>
      {tier === "any" ? "All Tiers" : tier.replace(/_/g, " ")}
    </span>
  );
}
