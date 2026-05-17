import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  ArrowLeft,
  Watch,
  ShoppingBag,
  Car,
  Home,
  House,
  Gem,
  Cpu,
  Paintbrush,
  Sofa,
  Bike,
  Briefcase,
  Sparkles,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useAuthStubContext } from "@/context/AuthStubContext";

import {
  useListAssetTypes,
  useListRegions,
  useCreateEstimate,
  getListEstimatesQueryKey,
  getGetEstimateStatsQueryKey,
} from "@workspace/api-client-react";
import type { EstimateInput, AssetType } from "@workspace/api-client-react";
import { assetTypeAllowedForSellerTier } from "@workspace/asset-shelf-tier";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useProTier } from "@/hooks/use-pro-tier";
import { localizeField } from "@/lib/regional";
import { useToast } from "@/hooks/use-toast";
import { PhotoUploadCard } from "@/components/PhotoUploadCard";
import { AssetCategoriesLoadHint } from "@/lib/asset-categories-fetch-hint";

const PENDING_KEY = "valyoued.pendingEstimate";
/** Fallback type for items that do not match a predefined class (see assetTypes.ts). */
const GENERAL_ITEM_ASSET_TYPE_ID = "general-item";

/** Mirrors server `general-item` so the wizard can render if /api/asset-types is slow or unavailable. */
const GENERAL_ITEM_FALLBACK: AssetType = {
  id: GENERAL_ITEM_ASSET_TYPE_ID,
  name: "Anything Else",
  category: "Other",
  tagline: "Use this for any other item; describe it in detail",
  exampleAttributes:
    "Anything that helps a buyer understand what it is and why it has value",
  internationallyTradeable: true,
  fields: [
    { key: "brand", label: "Brand / maker (if any)", type: "text", required: false },
    {
      key: "model",
      label: "What is it?",
      type: "text",
      required: true,
      placeholder: "Vintage Polaroid SX-70 camera",
    },
    { key: "year", label: "Year", type: "number", required: false },
    {
      key: "condition",
      label: "Condition (1=poor, 10=mint)",
      type: "number",
      required: true,
      placeholder: "8",
    },
    {
      key: "purchasePrice",
      label: "Original purchase price",
      type: "number",
      required: false,
      help: "We will assume this is in your local currency.",
    },
    {
      key: "extraNotes",
      label: "Other relevant details",
      type: "textarea",
      required: false,
      placeholder: "Tell us everything: materials, history, why it's special",
      help: "Materials, history, accessories, why it's worth what you think",
    },
  ],
};

type PendingPayload = { input: EstimateInput; pro: boolean };

const baseSchema = z.object({
  assetTier: z.enum(["everyday", "luxury"]),
  assetTypeId: z.string().min(1, "Asset type is required"),
  title: z.string().min(1, "Title is required"),
  currentRegion: z.string().min(1, "Region is required"),
  condition: z.coerce.number().min(1).max(10),
  attributes: z.string().optional(),
});

// The form holds the schema fields above PLUS a dynamic set of asset-class
// specific fields (brand, model, year, purchasePrice, plus per-class extras).
// We type the form value as a permissive Record so dynamic FormField name
// strings don't blow up TypeScript while still keeping `assetTier` strict.
type FormValues = z.input<typeof baseSchema> & Record<string, string | number | undefined>;

const STANDARD_KEYS = new Set(["assetTypeId", "title", "currentRegion", "condition", "attributes", "brand", "model", "year", "purchasePrice"]);

function descriptorTitlePlaceholder(category: string | undefined): string {
  switch (category) {
    case "Real Estate":
      return "Example: 3-bed Victorian terrace, leafy street, York YO1";
    case "Vehicles":
      return "Example: 2019 BMW 330i M Sport, 42k miles, metallic grey";
    case "Watches & Jewelry":
      return "Example: Rolex Submariner Date 116610LN";
    default:
      return "Example: Brand, model, and details buyers would notice first";
  }
}

// Each top-level category gets a friendly icon for the picker grid.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Watches & Jewelry": Watch,
  "Bags & Fashion": ShoppingBag,
  "Vehicles": Car,
  "Real Estate": Home,
  "Electronics": Cpu,
  "Collectibles & Art": Paintbrush,
  "Home & Antiques": Sofa,
  "Sports & Outdoors": Bike,
  "Business": Briefcase,
  "Other": Sparkles,
};

function iconForCategory(cat: string): LucideIcon {
  return CATEGORY_ICONS[cat] ?? Sparkles;
}

function NewEstimatePageInner({
  authLoaded,
  isSignedIn,
}: {
  authLoaded: boolean;
  isSignedIn: boolean;
}) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isPro } = useProTier();
  const { toast } = useToast();

  const {
    data: assetTypes,
    isFetching: assetTypesFetching,
    isError: assetTypesError,
    error: assetTypesErr,
    refetch: refetchAssetTypes,
  } = useListAssetTypes();
  const { data: regions } = useListRegions();
  const createMutation = useCreateEstimate();

  // Auto-resume: if the user filled the form anonymously, signed up, and was
  // redirected back here; submit their pending payload immediately.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!authLoaded || !isSignedIn || resumedRef.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let pending: PendingPayload | null = null;
    try {
      pending = JSON.parse(raw) as PendingPayload;
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    resumedRef.current = true;
    sessionStorage.removeItem(PENDING_KEY);
    createMutation.mutate(
      { data: pending.input, params: { pro: pending.pro } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEstimateStatsQueryKey() });
          setLocation(`/estimates/${result.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Couldn't finish your valuation",
            description:
              err?.message ||
              "Something went wrong while finishing the valuation you started. Please try again from the form below.",
            variant: "destructive",
          });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn]);

  const [loadingMessage, setLoadingMessage] = useState("Initializing models...");

  useEffect(() => {
    if (!createMutation.isPending) return;
    const messages = [
      "Pulling comparable sales...",
      "Gathering price context...",
      "Scanning world events & news...",
      "Mapping international arbitrage...",
      "Synthesizing narrative...",
      "Finalizing report...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [createMutation.isPending]);

  const form = useForm<FormValues>({
    resolver: async (data) => {
      const baseResult = baseSchema.safeParse(data);
      if (!baseResult.success) {
        return { values: {}, errors: baseResult.error.formErrors.fieldErrors as any };
      }
      const type = assetTypes?.find((t) => t.id === data.assetTypeId);
      if (!type) return { values: data, errors: {} };
      const errors: Record<string, any> = {};
      for (const field of type.fields) {
        if (field.required && (data[field.key] === undefined || data[field.key] === "")) {
          errors[field.key] = { type: "required", message: `${field.label} is required` };
        }
      }
      if (Object.keys(errors).length > 0) return { values: {}, errors };
      return { values: data, errors: {} };
    },
    defaultValues: {
      assetTier: undefined as unknown as "everyday" | "luxury",
      assetTypeId: "",
      title: "",
      currentRegion: "",
      condition: 7,
      attributes: "",
    },
    mode: "onChange",
  });

  const selectedTier = form.watch("assetTier");
  const selectedTypeId = form.watch("assetTypeId");
  const selectedType =
    assetTypes?.find((t) => t.id === selectedTypeId) ??
    (selectedTypeId === GENERAL_ITEM_ASSET_TYPE_ID ? GENERAL_ITEM_FALLBACK : undefined);

  const selectedRegionName = form.watch("currentRegion");
  const selectedRegion = useMemo(
    () => regions?.find((r) => r.name === selectedRegionName),
    [regions, selectedRegionName],
  );

  const tierFilteredAssetTypes = useMemo((): AssetType[] => {
    if (!assetTypes?.length || !selectedTier) return [];
    return assetTypes.filter((t) => assetTypeAllowedForSellerTier(t.id, selectedTier));
  }, [assetTypes, selectedTier]);

  const grouped = useMemo(() => {
    if (!tierFilteredAssetTypes.length) return [];
    const map = new Map<string, AssetType[]>();
    for (const t of tierFilteredAssetTypes) {
      const key = t.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [tierFilteredAssetTypes]);

  const assetTypesLoading = assetTypes === undefined && assetTypesFetching;
  const assetTypesErrMessage =
    assetTypesErr instanceof Error ? assetTypesErr.message : String(assetTypesErr ?? "Unknown error");

  // Two-step asset picker: pick a top-level category first, then pick the
  // specific asset class. Avoids the long, clipped dropdown.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(null);
  }, [selectedTier]);

  useEffect(() => {
    if (!selectedTier || !selectedTypeId || !assetTypes?.length) return;
    if (assetTypeAllowedForSellerTier(selectedTypeId, selectedTier)) return;
    const prev = assetTypes.find((t) => t.id === selectedTypeId);
    if (prev) {
      prev.fields.forEach((f) => {
        if (!STANDARD_KEYS.has(f.key)) form.setValue(f.key as any, undefined);
      });
    }
    form.setValue("assetTypeId", "");
    setSelectedCategory(null);
  }, [selectedTier, selectedTypeId, assetTypes, form]);

  // Auto-sync the category panel when an asset type is selected (such as via
  // pending payload resume) so the picker shows the right step.
  useEffect(() => {
    if (selectedType && selectedType.category && selectedType.category !== selectedCategory) {
      setSelectedCategory(selectedType.category);
    }
  }, [selectedType, selectedCategory]);

  const onSubmit = (data: any) => {
    if (!selectedType) {
      toast({ title: "Pick an asset class first", description: "Choose what you're valuing from the dropdown.", variant: "destructive" });
      return;
    }
    if (!selectedRegion) {
      toast({ title: "Pick a region", description: "We need to know where you're selling so we can value in your local currency.", variant: "destructive" });
      return;
    }

    const payload: EstimateInput = {
      assetTypeId: data.assetTypeId,
      title: data.title,
      currentRegion: data.currentRegion,
      currency: selectedRegion.currencyCode,
      condition: typeof data.condition === "number" ? data.condition : Number(data.condition) || 7,
    };
    // Prepend the tier hint into attributes so the model sees it. We don't
    // want to add a brand-new schema field server-side just for this; the
    // free-form notes already feed straight into the prompt.
    const tierLabel = data.assetTier === "luxury" ? "Luxury / Collectible" : "Everyday item";
    const tierLine = `Tier: ${tierLabel}.`;
    payload.attributes = data.attributes ? `${tierLine} ${data.attributes}` : tierLine;

    if (data.brand) payload.brand = data.brand;
    if (data.model) payload.model = data.model;
    if (data.year !== undefined && data.year !== "" && !Number.isNaN(Number(data.year))) payload.year = Number(data.year);
    if (data.purchasePrice !== undefined && data.purchasePrice !== "" && !Number.isNaN(Number(data.purchasePrice))) payload.purchasePrice = Number(data.purchasePrice);

    const extras: Record<string, string> = {};
    for (const f of selectedType.fields) {
      if (STANDARD_KEYS.has(f.key)) continue;
      const v = data[f.key];
      if (v !== undefined && v !== "" && v !== null) extras[f.key] = String(v);
    }
    if (Object.keys(extras).length > 0) payload.extraFields = extras;

    // Onboarding gate: anonymous users must create an account before their
    // valuation is generated. We treat "auth not loaded yet" the same as
    // "signed out"; better to stash + bounce through sign-up than to fire an
    // API call that 401s and loses the form payload.
    if (!isSignedIn) {
      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ input: payload, pro: isPro } satisfies PendingPayload),
        );
      } catch {
        /* sessionStorage may be unavailable; fall through and let the API 401 */
      }
      setLocation("/sign-up?redirect_url=/start");
      return;
    }

    createMutation.mutate(
      { data: payload, params: { pro: isPro } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEstimateStatsQueryKey() });
          setLocation(`/estimates/${result.id}`);
        },
        onError: (err: any) => {
          // Surface the real reason instead of leaving the user staring at a frozen form
          const raw = err?.message || err?.error || String(err);
          let friendly = "We couldn't generate the report. Please try again.";
          if (/timeout|timed out|ETIMEDOUT|aborted/i.test(raw)) {
            friendly = "The valuation took too long to come back. The AI service may be busy; please retry in a moment.";
          } else if (/currency|condition|required/i.test(raw)) {
            friendly = "Some required details are missing. Make sure you've picked an asset class, a region, and filled in the condition slider before submitting.";
          } else if (/network|fetch|Failed to fetch/i.test(raw)) {
            friendly = "Couldn't reach the valuation server. Check your connection and try again.";
          }
          toast({
            title: "Valuation failed",
            description: friendly,
            variant: "destructive",
          });
          // Also log the raw server message to the console for debugging
          console.error("[valuation] create failed:", raw);
        },
      },
    );
  };

  const onInvalidSubmit = (errors: Record<string, any>) => {
    const firstKey = Object.keys(errors)[0];
    const firstMsg = firstKey ? errors[firstKey]?.message : "Please fill in the required fields before submitting.";
    toast({
      title: "Some fields need attention",
      description: firstMsg || "Please fill in the required fields before submitting.",
      variant: "destructive",
    });
  };

  if (createMutation.isPending) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-accent">
            <BrainCircuit className="h-8 w-8" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-sans">Valuating Asset</h2>
          <p className="text-muted-foreground text-sm animate-pulse">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-sans font-bold text-foreground">New Estimate</h1>
        <p className="text-muted-foreground mt-2">
          Pick what you're selling, tell us where you are, and we'll value it in your local currency with global market context.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-8">
          <Card className="border-border/50 bg-card/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-sans">What kind of item is it?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="assetTier"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {[
                        {
                          value: "everyday",
                          label: "Everyday asset",
                          desc: "Cars, electronics, furniture, ordinary home goods. Usually depreciates over time.",
                          Icon: House,
                        },
                        {
                          value: "luxury",
                          label: "Luxury / Collectible",
                          desc: "Vintage watches, rare wines, classic Mini Coopers, designer bags, limited art. Often appreciates.",
                          Icon: Gem,
                        },
                      ].map((opt) => {
                        const active = field.value === opt.value;
                        const TierIcon = opt.Icon;
                        return (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => field.onChange(opt.value)}
                            data-testid={`tier-${opt.value}`}
                            className={`text-left rounded-lg border p-4 transition-all ${
                              active
                                ? "border-accent bg-accent/10 ring-2 ring-accent/40"
                                : "border-border bg-background hover:border-accent/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <TierIcon className="h-5 w-5 shrink-0 text-accent" />
                              <span className="font-medium">{opt.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {selectedTier && <Card className="border-border/50 bg-card/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-sans">
                Classification — {selectedTier === "luxury" ? "Luxury / collectible" : "Everyday"}
              </CardTitle>
              <CardDescription>
                Categories below are filtered for this track. Switch the choice above to see phones & TVs versus watches
                &amp; bags, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="assetTypeId"
                render={({ field }) => {
                  const currentList = selectedCategory
                    ? grouped.find(([c]) => c === selectedCategory)?.[1] ?? []
                    : [];
                  return (
                    <FormItem>
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {selectedCategory
                          ? `Pick the specific item type in ${selectedCategory}`
                          : "Step 1: pick a category"}
                      </p>

                      {/* Step 1: category grid */}
                      {!selectedCategory && (
                        <>
                        {assetTypesLoading && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1" aria-busy="true">
                            {Array.from({ length: 9 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-[4.25rem] rounded-lg bg-muted/55 animate-pulse border border-border/30"
                              />
                            ))}
                          </div>
                        )}
                        {assetTypesError && (
                          <Alert variant="destructive" className="mt-1">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Couldn&apos;t load asset categories</AlertTitle>
                            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-balance">
                                {assetTypesErrMessage}
                                <AssetCategoriesLoadHint error={assetTypesErr} />
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 border-destructive/40"
                                onClick={() => void refetchAssetTypes()}
                              >
                                Retry
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                        {!assetTypesLoading && !assetTypesError && grouped.length === 0 && (
                          <p className="text-sm text-muted-foreground pt-2">
                            The server returned no asset categories. Try again shortly or describe a custom item below.
                          </p>
                        )}
                        {!assetTypesLoading && !assetTypesError && grouped.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {grouped.map(([cat, list]) => {
                            const Icon = iconForCategory(cat);
                            return (
                              <button
                                type="button"
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                data-testid={`category-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-accent hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{cat}</div>
                                  <div className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? "type" : "types"}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        )}
                        {(!!assetTypes || assetTypesError) && (
                        <div className="mt-4 pt-3 border-t border-border/60">
                          <button
                            type="button"
                            data-testid="custom-asset-type"
                            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                            onClick={() => {
                              if (selectedType) {
                                selectedType.fields.forEach((f) => form.setValue(f.key as any, undefined));
                              }
                              setSelectedCategory("Other");
                              field.onChange(GENERAL_ITEM_ASSET_TYPE_ID);
                            }}
                          >
                            Item not listed? Use a custom description instead
                          </button>
                        </div>
                        )}
                        </>
                      )}

                      {/* Step 2: asset type grid within the chosen category */}
                      {selectedCategory && (
                        <div className="space-y-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedType) {
                                selectedType.fields.forEach((f) => form.setValue(f.key as any, undefined));
                              }
                              field.onChange("");
                              setSelectedCategory(null);
                            }}
                            data-testid="back-to-categories"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to categories
                          </button>
                          {currentList.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentList.map((type) => {
                              const active = field.value === type.id;
                              return (
                                <button
                                  type="button"
                                  key={type.id}
                                  onClick={() => {
                                    if (selectedType && selectedType.id !== type.id) {
                                      selectedType.fields.forEach((f) => form.setValue(f.key as any, undefined));
                                    }
                                    field.onChange(type.id);
                                  }}
                                  data-testid={`asset-type-${type.id}`}
                                  className={`text-left rounded-lg border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                    active
                                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                                      : "border-border bg-background hover:border-accent/50 hover:bg-accent/5"
                                  }`}
                                >
                                  <div className="text-sm font-medium">{type.name}</div>
                                  {type.tagline && (
                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {type.tagline}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          ) : field.value === GENERAL_ITEM_ASSET_TYPE_ID ? (
                            <div className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Anything Else</span> is selected. Fill in the asset
                              details below. You can continue without picking a sub-type.
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No types in this category matched the server response. Go back and pick another category or use a
                              custom description.
                            </p>
                          )}
                        </div>
                      )}

                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <AnimatePresence>
                {selectedType && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 text-sm text-muted-foreground italic border-l-2 border-accent/50 pl-4"
                  >
                    {selectedType.tagline}
                    {!selectedType.internationallyTradeable && (
                      <div className="mt-1 text-xs not-italic text-ui-meta uppercase tracking-wider text-muted-foreground/70">
                        Local-market asset · international arbitrage disabled
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>}

          {selectedType && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <PhotoUploadCard
                assetTypeId={selectedType.id}
                assetTypeName={selectedType.name}
                assetCategory={selectedType.category}
                onAutoFill={(extracted, suggestedTitle) => {
                  if (suggestedTitle && !form.getValues("title")) {
                    form.setValue("title", suggestedTitle, { shouldValidate: true });
                  }
                  for (const [key, value] of Object.entries(extracted)) {
                    const field = selectedType.fields.find((f) => f.key === key);
                    if (!field) continue;
                    if (field.type === "number") {
                      const n = Number(value);
                      if (!Number.isNaN(n)) {
                        form.setValue(key as any, n, { shouldValidate: true });
                      }
                    } else {
                      form.setValue(key as any, value, { shouldValidate: true });
                    }
                  }
                }}
              />

              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-sans">Asset Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descriptor / Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={descriptorTitlePlaceholder(selectedType.category)}
                              className="h-10 bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentRegion"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Where are you selling from?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-background">
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions?.map((r) => (
                                <SelectItem key={r.name} value={r.name}>
                                  {r.name}{" "}
                                  <span className="text-muted-foreground tabular-nums text-sm">({r.currencyCode})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            We'll value the asset in your local currency
                            {selectedRegion ? `: ${selectedRegion.currencyCode}` : ""}.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedType.fields.map((rawF) => {
                      const f = localizeField(rawF, selectedRegionName);
                      return (
                      <FormField
                        key={f.key}
                        control={form.control}
                        name={f.key as any}
                        render={({ field: formField }) => {
                          const isPrice = f.key === "purchasePrice";
                          const labelSuffix =
                            isPrice && selectedRegion
                              ? ` (${selectedRegion.currencyCode})`
                              : "";
                          return (
                            <FormItem className={f.type === "textarea" ? "md:col-span-2" : ""}>
                              <FormLabel>
                                {f.label}
                                {labelSuffix}
                                {f.required ? " *" : ""}
                              </FormLabel>
                              <FormControl>
                                {f.type === "textarea" ? (
                                  <Textarea
                                    placeholder={f.placeholder}
                                    className="resize-y min-h-[100px] bg-background"
                                    {...formField}
                                    value={formField.value ?? ""}
                                  />
                                ) : f.type === "select" ? (
                                  <Select onValueChange={formField.onChange} value={(formField.value ?? "") as string}>
                                    <SelectTrigger className="h-10 bg-background">
                                      <SelectValue placeholder={f.placeholder || "Select..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {f.options?.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : isPrice && selectedRegion ? (
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums">
                                      {selectedRegion.currencySymbol}
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder={f.placeholder}
                                      className="h-10 bg-background pl-10"
                                      {...formField}
                                      value={formField.value ?? ""}
                                    />
                                  </div>
                                ) : (
                                  <Input
                                    type={f.type === "number" ? "number" : "text"}
                                    placeholder={f.placeholder}
                                    className="h-10 bg-background"
                                    {...formField}
                                    value={formField.value ?? ""}
                                  />
                                )}
                              </FormControl>
                              {f.help && <FormDescription>{f.help}</FormDescription>}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      );
                    })}

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2 pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <FormLabel>Overall Condition</FormLabel>
                            <span className="text-sm font-semibold tabular-nums">{field.value} / 10</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent"
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Poor (1)</span>
                            <span>Mint / As new (10)</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="attributes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Anything else worth mentioning?</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Box & papers, provenance, defects, urgent reason for sale..."
                              className="resize-y min-h-[80px] bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold shadow-lg hover:-translate-y-0.5 transition-transform"
                >
                  Generate Valuer Report <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </Form>
    </div>
  );
}

function NewEstimateClerkGate() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  return <NewEstimatePageInner authLoaded={authLoaded} isSignedIn={!!isSignedIn} />;
}

export default function NewEstimatePage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <NewEstimatePageInner authLoaded isSignedIn />;
  }
  return <NewEstimateClerkGate />;
}
