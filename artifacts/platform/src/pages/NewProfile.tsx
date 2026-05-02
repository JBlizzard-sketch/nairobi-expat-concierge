import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateProfile, useCreateRelocation } from "@workspace/api-client-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  nationality: z.string().min(2, "Nationality is required"),
  employer: z.string().min(2, "Employer is required"),
  employerType: z.enum(["un", "ngo", "corporate", "embassy", "individual"]),
  arrivalDate: z.string().optional(),
  familySize: z.coerce.number().min(1, "Family size must be at least 1"),
  schoolAgeChildren: z.coerce.number().min(0),
  budgetUsd: z.coerce.number().optional(),
  neighbourhoodPreferences: z.string().optional(),
  specificNeeds: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function NewProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProfile = useCreateProfile();
  const createRelocation = useCreateRelocation();
  
  const [createdProfileId, setCreatedProfileId] = useState<number | null>(null);
  const [showRelocationDialog, setShowRelocationDialog] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      nationality: "",
      employer: "",
      employerType: "corporate",
      arrivalDate: "",
      familySize: 1,
      schoolAgeChildren: 0,
      budgetUsd: undefined,
      neighbourhoodPreferences: "",
      specificNeeds: "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    // Format date properly if provided
    const formattedData = {
      ...data,
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate).toISOString() : null,
      budgetUsd: data.budgetUsd || null,
    };

    createProfile.mutate({ data: formattedData }, {
      onSuccess: (profile) => {
        toast({
          title: "Profile Created",
          description: `${profile.fullName}'s profile has been successfully recorded.`,
        });
        setCreatedProfileId(profile.id);
        setShowRelocationDialog(true);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to create profile. Please check the form data.",
          variant: "destructive"
        });
      }
    });
  };

  const handleCreateRelocation = () => {
    if (!createdProfileId) return;

    createRelocation.mutate({
      data: {
        profileId: createdProfileId,
        status: "intake",
        stage: "profile_complete",
        packageTier: "corporate_standard"
      }
    }, {
      onSuccess: (relocation) => {
        toast({
          title: "Relocation Case Started",
          description: "A new relocation case has been initialized.",
        });
        setLocation(`/relocations/${relocation.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to start relocation case.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/profiles">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">New Profile</h1>
          <p className="text-muted-foreground mt-1">Create an intake profile for a new expatriate.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expat Information</CardTitle>
          <CardDescription>Enter the personal and logistical details for the incoming expat.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Canadian" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Arrival Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Employment</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="employer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer / Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. United Nations" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="un">United Nations</SelectItem>
                            <SelectItem value="ngo">NGO</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                            <SelectItem value="embassy">Embassy / Diplomatic</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Family & Requirements</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="familySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Size</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolAgeChildren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School-Age Children</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budgetUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Housing Budget (USD/mo)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} placeholder="e.g. 3000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="neighbourhoodPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neighbourhood Preferences</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Gigiri, Runda, Westlands" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of preferred areas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specificNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Needs & Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g. Needs a pet-friendly house, requires high-speed fiber internet immediately upon arrival..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={createProfile.isPending}>
                  {createProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showRelocationDialog} onOpenChange={setShowRelocationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profile Created Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to start a new relocation case for this profile now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocation("/profiles")}>Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateRelocation} disabled={createRelocation.isPending}>
              {createRelocation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Relocation Case
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
