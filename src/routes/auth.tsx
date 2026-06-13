import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Entry Gate — SiteKhata" }] }),
});

function AuthPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === "345rrt") {
      localStorage.setItem("auth", "true");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Galat password!");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-hero">
      <Card className="w-full max-w-md shadow-elevated border-border/50">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="size-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <HardHat className="size-5 text-accent-foreground" />
            </div>
            <div className="font-display font-bold text-lg">SiteKhata</div>
          </div>
          <h2 className="font-display text-2xl font-bold text-center">Entry Gate</h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">Password daalkar andar aayein</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11">
              Kholo
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
