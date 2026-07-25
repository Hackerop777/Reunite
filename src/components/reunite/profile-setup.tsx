"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, YEARS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Compass, Sparkles } from "lucide-react";

export function ProfileSetup() {
  const setUser = useAppStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = name.trim() && rollNumber.trim() && department && year;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const { user } = await api.auth.createProfile({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        department,
        year,
      });
      setUser(user);
      toast.success(`Welcome, ${user.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Could not create profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-700/20" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-700/10" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Compass className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reunite</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The smart campus lost &amp; found. We match — you reconnect.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roll">Roll number</Label>
            <Input
              id="roll"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. CSE21045"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">This identifies you. Use your college roll number.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="dept" className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year" className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!valid || loading}
            className="w-full rounded-full text-base font-semibold shadow-md shadow-primary/30"
            size="lg"
          >
            {loading ? "Creating profile…" : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Continue
              </>
            )}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            No password. No phone number. Your profile is created instantly and stays on this device.
            Final ownership verification is always done by Faculty / Security / Lost &amp; Found desk.
          </p>
        </motion.form>
      </div>
    </div>
  );
}
