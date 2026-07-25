"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CATEGORIES, COLORS, LOCATIONS, SIZES } from "@/lib/constants";
import { api } from "@/lib/api";
import { fileToThumbnailDataUrl } from "@/lib/image";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  MapPin,
  Sparkles,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TicketForm({ initialType = "LOST" }: { initialType?: "LOST" | "FOUND" }) {
  const setView = useAppStore((s) => s.setView);
  const bumpTickets = useAppStore((s) => s.bumpTickets);
  const setHomeTab = useAppStore((s) => s.setHomeTab);

  const [type, setType] = useState<"LOST" | "FOUND">(initialType);
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = category && color && brand.trim() && size && location && date;

  // "Did you check here?" — only for LOST tickets, fetched when category or location changes.
  const suggestionsQ = useQuery({
    queryKey: ["suggestions", category, location],
    queryFn: () => api.suggestions.get({ category, location }),
    enabled: type === "LOST" && !!category,
  });
  const suggestions = suggestionsQ.data?.locations || [];
  const showSuggestions = type === "LOST" && suggestions.length > 0;

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Resize + compress client-side; embed the result as a JPEG data URL.
      // Vercel's serverless FS is read-only, so we don't upload files — the
      // thumbnail lives inline in the ticket's `imageUrl` field.
      const dataUrl = await fileToThumbnailDataUrl(file);
      setImageUrl(dataUrl);
      toast.success("Image attached");
    } catch (err: any) {
      toast.error(err.message || "Could not process image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const { newMatches } = await api.tickets.create({
        type,
        category,
        color,
        brand: brand.trim(),
        size,
        location,
        date: new Date(date).toISOString(),
        imageUrl: imageUrl || undefined,
        description: description.trim() || undefined,
      });
      bumpTickets();
      if (newMatches > 0) {
        toast.success(`Posted! ${newMatches} potential ${newMatches === 1 ? "match" : "matches"} found instantly.`);
        setHomeTab("matches");
      } else {
        toast.success("Posted! We'll notify you the moment a matching item appears.");
        setHomeTab(type === "LOST" ? "lost" : "found");
      }
      setView({ name: "home" });
    } catch (err: any) {
      toast.error(err.message || "Could not post ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Post an item</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setType("LOST")}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              type === "LOST"
                ? "bg-rose-500 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            🤔 I lost something
          </button>
          <button
            type="button"
            onClick={() => setType("FOUND")}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              type === "FOUND"
                ? "bg-emerald-500 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ✨ I found something
          </button>
        </div>

        {/* "Did you check here?" — only for LOST */}
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <Card className="border-amber-300/50 bg-amber-50/60 p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Did you check here?
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/70">
                    Based on where {suggestionsQ.data?.hasHistory ? "similar items were recovered" : "items usually turn up"}, try:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setLocation(s.name)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                          location === s.name
                            ? "bg-amber-500 text-white ring-amber-500"
                            : "bg-white text-amber-800 ring-amber-300 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700"
                        )}
                      >
                        <MapPin className="h-3 w-3" />
                        {s.name}
                        {s.count > 0 && <span className="opacity-70">· {s.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <Card className="space-y-3.5 p-4">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue placeholder="What kind of item?" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Color *</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Size" /></SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand / identifying detail *</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Samsung, FastTrack, black leather, water bottle…"
            />
            <p className="text-[11px] text-muted-foreground">Brand, model, or any distinctive detail. The engine matches on these keywords.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{type === "LOST" ? "Where lost *" : "Where found *"}</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{type === "LOST" ? "When lost *" : "When found *"}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-3">
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/40 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : imageUrl ? (
                   
                  <img src={imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span>Add</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                  Remove
                </Button>
              )}
              <p className="flex-1 text-[11px] text-muted-foreground">
                A photo dramatically improves match recognition. Images are resized to a small thumbnail.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Additional description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any scratches, stickers, contents, or other details that could help identify the item…"
              rows={3}
            />
          </div>
        </Card>

        {/* Safety note */}
        <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Your name and roll number are <strong>not</strong> shown publicly. They&rsquo;re revealed only inside a private chat after both sides open one. Final ownership is verified by Faculty / Security / Lost &amp; Found desk — not by you.
          </p>
        </div>

        <Button
          type="submit"
          disabled={!valid || submitting}
          size="lg"
          className="w-full rounded-full text-base font-semibold shadow-md shadow-primary/30"
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Post {type === "LOST" ? "lost" : "found"} item</>
          )}
        </Button>
      </form>
    </div>
  );
}
