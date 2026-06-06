import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsOwner } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
  head: () => ({ meta: [{ title: "Team — SiteKhata" }] }),
});

function TeamPage() {
  const { user } = useAuth();
  const isOwner = useIsOwner(user?.id);
  const qc = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("*")).data ?? [],
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["roles-all"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });
  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => (await supabase.from("sites").select("*")).data ?? [],
  });
  const { data: members = [] } = useQuery({
    queryKey: ["site-members-all"],
    queryFn: async () => (await supabase.from("site_members").select("*")).data ?? [],
  });

  const [assign, setAssign] = useState<{ user: string; site: string }>({ user: "", site: "" });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!assign.user || !assign.site) throw new Error("Pick a supervisor and site");
      const { error } = await supabase.from("site_members").insert({ user_id: assign.user, site_id: assign.site });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assigned"); qc.invalidateQueries({ queryKey: ["site-members-all"] }); setAssign({ user: "", site: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["site-members-all"] }); },
  });

  if (!isOwner) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <Card><CardContent className="p-10 text-center">
          <Shield className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Only owners can manage the team.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Team & Access</h1>
        <p className="text-muted-foreground mt-1">Manage supervisors and site assignments</p>
      </header>

      <Card className="shadow-card border-border/60">
        <CardContent className="p-5">
          <div className="font-display font-bold mb-3 flex items-center gap-2"><Users className="size-4" /> Members</div>
          <div className="divide-y">
            {profiles.map(p => {
              const role = roles.find(r => r.user_id === p.id)?.role ?? "supervisor";
              const memberOf = members.filter(m => m.user_id === p.id).map(m => sites.find(s => s.id === m.site_id)?.name).filter(Boolean);
              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">{p.full_name || "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {memberOf.length ? memberOf.join(", ") : "No sites assigned"}
                    </div>
                  </div>
                  <Badge variant={role === "owner" ? "default" : "secondary"} className={role === "owner" ? "bg-accent text-accent-foreground" : ""}>
                    {role}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/60">
        <CardContent className="p-5">
          <div className="font-display font-bold mb-3">Assign Supervisor to Site</div>
          <div className="grid md:grid-cols-3 gap-3">
            <Select value={assign.user} onValueChange={(v) => setAssign({ ...assign, user: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a user" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assign.site} onValueChange={(v) => setAssign({ ...assign, site: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
              <SelectContent>
                {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => addMember.mutate()} className="bg-primary" disabled={addMember.isPending}>Assign</Button>
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current assignments</div>
            {members.length === 0 && <div className="text-sm text-muted-foreground">None yet.</div>}
            {members.map(m => {
              const p = profiles.find(x => x.id === m.user_id);
              const s = sites.find(x => x.id === m.site_id);
              return (
                <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
                  <span><span className="font-medium">{p?.full_name || "—"}</span> → {s?.name || "—"}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.id)}><X className="size-4" /></Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
