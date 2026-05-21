import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X, Wand2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useExtractFromPhoto } from "@workspace/api-client-react";
import type { VisionExtractResult, VisionExtractInputMimeType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  assetTypeId: string | undefined;
  assetTypeName: string | undefined;
  /** Top-level category from asset type (e.g. "Real Estate"). Adjusts instructional copy. */
  assetCategory?: string;
  onAutoFill: (extracted: Record<string, string>, suggestedTitle?: string) => void;
}

const ALLOWED_TYPES: VisionExtractInputMimeType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB raw file (becomes ~6.7MB base64)

export function PhotoUploadCard({
  assetTypeId,
  assetTypeName,
  assetCategory,
  onAutoFill,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<VisionExtractInputMimeType | null>(null);
  const [result, setResult] = useState<VisionExtractResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const extract = useExtractFromPhoto();
  const realEstate = assetCategory === "Real Estate";

  // Bumped on each new file or asset-type change so we can drop stale responses.
  const requestTokenRef = useRef(0);
  useEffect(() => {
    requestTokenRef.current += 1;
    setResult(null);
  }, [assetTypeId]);

  // We auto-fire extraction once the file is decoded, but only when the user
  // has already chosen an asset class, since the photo extractor needs to know
  // which fields to populate. If they pick a class later we don't auto-fire
  // (they can press the button manually) to avoid surprise API spend.
  const autoTriggerRef = useRef(false);
  useEffect(() => {
    if (!autoTriggerRef.current) return;
    if (!base64 || !mimeType || !assetTypeId) return;
    if (extract.isPending) return;
    autoTriggerRef.current = false;
    runExtract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64, mimeType, assetTypeId]);

  const handleFile = async (file: File) => {
    requestTokenRef.current += 1;
    if (!ALLOWED_TYPES.includes(file.type as VisionExtractInputMimeType)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a JPG, PNG, WebP or GIF photo.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "Photo is too large",
        description: "Please upload an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setFilename(file.name);
    setMimeType(file.type as VisionExtractInputMimeType);
    setResult(null);
    // Mark this upload as eligible for auto-extraction. The effect will pick it
    // up once base64 + assetTypeId are both ready.
    autoTriggerRef.current = true;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPreview(dataUrl);
      // Strip the data URL prefix to get pure base64
      const idx = dataUrl.indexOf(",");
      setBase64(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const reset = () => {
    requestTokenRef.current += 1;
    setPreview(null);
    setFilename(null);
    setBase64(null);
    setMimeType(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const runExtract = () => {
    if (!assetTypeId) {
      toast({
        title: "Pick an asset class first",
        description: realEstate
          ? "Choose a property type first so we know which details to look for in the photo."
          : "We need to know what kind of item this is before analysing the photo.",
        variant: "destructive",
      });
      return;
    }
    if (!base64 || !mimeType) return;

    const token = requestTokenRef.current;
    const requestAssetTypeId = assetTypeId;

    extract.mutate(
      { data: { assetTypeId: requestAssetTypeId, imageBase64: base64, mimeType } },
      {
        onSuccess: (data) => {
          // Drop the response if the user changed photo or asset class while we were waiting.
          if (token !== requestTokenRef.current || requestAssetTypeId !== assetTypeId) {
            return;
          }
          setResult(data);
          const filledCount = Object.keys(data.extracted).length;
          if (filledCount === 0) {
            toast({
              title: "Couldn't read much from this photo",
              description:
                data.notes ||
                (realEstate
                  ? "Try a clear exterior shot, main living space, or kitchen. You can also fill in the form manually."
                  : "Try a sharper, well-lit image showing the front of the item, or fill in the form manually."),
            });
          } else {
            onAutoFill(data.extracted, data.suggestedTitle);
            toast({
              title: `Auto-filled ${filledCount} field${filledCount === 1 ? "" : "s"}`,
              description:
                data.notes ||
                (realEstate
                  ? "Review what was detected and add the rest (bedrooms, tenure, year built, price, and so on)."
                  : "Review what was detected and fill in the rest (year of purchase, mileage, original price, etc.)."),
            });
          }
        },
        onError: (err: any) => {
          if (token !== requestTokenRef.current) return;
          const msg = err?.message || "Photo analysis failed.";
          toast({
            title: "Couldn't analyse the photo",
            description: msg.length > 140 ? "Please try again or fill the form manually." : msg,
            variant: "destructive",
          });
        },
      },
    );
  };

  const confidence = result?.confidence ?? 0;
  const confidenceLabel =
    confidence >= 0.8 ? "High confidence" : confidence >= 0.5 ? "Some confidence" : "Low confidence";
  const confidenceTone =
    confidence >= 0.8 ? "text-green-600" : confidence >= 0.5 ? "text-amber-600" : "text-muted-foreground";

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-card/60 to-card/40 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Camera className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sans text-lg leading-tight">
                {realEstate ? "Add a property photo" : "Snap or upload a photo"}
              </h3>
              <Badge variant="outline" className="inline-flex items-center gap-1 text-ui-caps tracking-normal border-accent/40 text-accent">
                <Wand2 className="h-2.5 w-2.5" /> Photo auto-fill
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {realEstate ? (
                <>
                  We read cues like layout, property style, finishes, and visible condition from
                  exterior or interior shots. You will still enter beds or size, tenure, year built,
                  and price in the form.
                </>
              ) : (
                <>
                  We detect brand, model, color, materials, and condition hints from the image. You
                  will still enter year of purchase, mileage, and price yourself.
                </>
              )}
            </p>
          </div>
        </div>

        {!preview ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed transition-all p-8 text-center ${
              dragOver
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/60 hover:bg-accent/5"
            }`}
            data-testid="photo-dropzone"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP up to 5MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={onPick}
              className="hidden"
              data-testid="photo-file-input"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
              <img
                src={preview}
                alt={realEstate ? "Property photo preview" : "Item preview"}
                className="w-full max-h-64 object-contain"
              />
              <button
                type="button"
                onClick={reset}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background border border-border shadow-sm"
                aria-label="Remove photo"
                data-testid="photo-remove"
              >
                <X className="h-4 w-4" />
              </button>
              {filename && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs px-3 py-2 font-sans truncate">
                  {filename}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={runExtract}
                disabled={extract.isPending || !assetTypeId}
                className="flex-1"
                data-testid="photo-extract-btn"
              >
                {extract.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing photo
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto-fill from photo
                    {assetTypeName ? ` · ${assetTypeName}` : ""}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                Change
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={onPick}
                className="hidden"
              />
            </div>

            {result && (
              <div className="rounded-md border border-border bg-background/50 p-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  {Object.keys(result.extracted).length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="font-medium">
                    {Object.keys(result.extracted).length} field
                    {Object.keys(result.extracted).length === 1 ? "" : "s"} auto-filled
                  </span>
                  <span className={`ml-auto text-ui-meta uppercase tracking-wider ${confidenceTone}`}>
                    {confidenceLabel} · {Math.round(confidence * 100)}%
                  </span>
                </div>
                {Object.keys(result.extracted).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(result.extracted).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-[10px] font-medium">
                        {k}: {String(v).slice(0, 22)}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.notes && (
                  <p className="text-muted-foreground italic leading-relaxed">"{result.notes}"</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
