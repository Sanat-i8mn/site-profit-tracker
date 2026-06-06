import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — SiteKhata" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. Welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-accent flex items-center justify-center">
            <HardHat className="size-5 text-accent-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">SiteKhata</div>
            <div className="text-xs text-primary-foreground/60 uppercase tracking-wider">Contractor Cash Book</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Har site ka <span className="text-accent">hisaab</span>, ek jagah.
          </h1>
          <p className="text-primary-foreground/75 text-lg">
            Multi-site cash management for contractors. Supervisors enter every rupee, owner sees profit & loss in real time.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li>• Site-wise credit / debit ledger with auto running balance</li>
            <li>• Category-wise expense analytics & monthly trends</li>
            <li>• Owner dashboard for all sites at a glance</li>
            <li>• Role-based access: Owner vs Site Supervisor</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/40">© SiteKhata</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="p-8">
            <div className="md:hidden flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                <HardHat className="size-5 text-accent-foreground" />
              </div>
              <div className="font-display font-bold text-lg">SiteKhata</div>
            </div>
            <h2 className="font-display text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Sign in to continue managing your sites" : "First account becomes the Owner"}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Rajesh Dubey" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 h-11">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-sm text-muted-foreground text-center">
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                {mode === "signin" ? "Create account" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
