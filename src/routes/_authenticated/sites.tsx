import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsOwner } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatINR } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/sites")({
  component: SitesPage,
  head: () => ({ meta: [{ title: "Sites — SiteKhata" }] }),
});

type SiteForm = { name: string; location: string; description: string };
const EMPTY: SiteForm = { name: "", location: "", description: "" };

function SitesPage() {
  const routerState = useRouterState();
  const isDetail = routerState.location.pathname.match(/^\/sites\/[^/]+/);

  const { user } = useAuth();
  const isOwner = useIsOwner(user?.id);
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editSite, setEditSite] = useState<{ id: string } & SiteForm | null>(null);
  const [form, setForm] = useState<SiteForm>(EMPTY);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entries").select("site_id,credit,debit");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sites"] });
    qc.invalidateQueries({ queryKey: ["sites-dashboard"] });
  };

  const createSite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sites").insert({
        name: form.name, location: form.location, description: form.description,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Site added"); setAddOpen(false); setForm(EMPTY); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSite = useMutation({
    mutationFn: async () => {
      if (!editSite) return;
      const { error } = await supabase.from("sites").update({
        name: editSite.name, location: editSite.location, description: editSite.description,
      }).eq("id", editSite.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Site updated"); setEditSite(null); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Site deleted"); invalidate(); qc.invalidateQueries({ queryKey: ["entries-all"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Sites</h1>
          <p className="text-muted-foreground mt-1">Har site ka cash book alag</p>
        </div>
        {isOwner && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90"><Plus className="size-4" /> New Site</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add new site</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Site name</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sagar Side NH-146" />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Sagar, MP" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Highway project details…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={() => createSite.mutate()} disabled={!form.name || createSite.isPending} className="bg-primary">Add Site</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Edit dialog */}
      <Dialog open={!!editSite} onOpenChange={v => !v && setEditSite(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Site</DialogTitle></DialogHeader>
          {editSite && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Site name</Label>
                <Input value={editSite.name} onChange={e => setEditSite({ ...editSite, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={editSite.location} onChange={e => setEditSite({ ...editSite, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={editSite.description} onChange={e => setEditSite({ ...editSite, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSite(null)}>Cancel</Button>
            <Button onClick={() => updateSite.mutate()} disabled={!editSite?.name || updateSite.isPending} className="bg-primary">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="size-12 mx-auto mb-3 opacity-40" />
            <p>No sites yet.</p>
            {!isOwner && <p className="text-xs mt-2">Ask the owner to add you to a site.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((s) => {
            const es      = entries.filter(e => e.site_id === s.id);
            const credit  = es.reduce((sum, e) => sum + Number(e.credit), 0);
            const debit   = es.reduce((sum, e) => sum + Number(e.debit), 0);
            const balance = credit - debit;
            return (
              <div key={s.id} className="relative group">
                <Link to="/sites/$siteId" params={{ siteId: s.id }}>
                  <Card className="shadow-card hover:shadow-elevated transition-all border-border/60 h-full hover:border-primary/40 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                          <Building2 className="size-5 text-primary-foreground" />
                        </div>
                        <div className="min-w-0 flex-1 pr-8">
                          <div className="font-display font-bold truncate">{s.name}</div>
                          {s.location && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3" /> {s.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-success/10">
                          <div className="text-[10px] text-muted-foreground uppercase">In</div>
                          <div className="num text-xs font-bold text-success mt-0.5">{formatINR(credit)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <div className="text-[10px] text-muted-foreground uppercase">Out</div>
                          <div className="num text-xs font-bold text-destructive mt-0.5">{formatINR(debit)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary">
                          <div className="text-[10px] text-muted-foreground uppercase">Bal</div>
                          <div className="num text-xs font-bold mt-0.5">{formatINR(balance)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Edit/Delete — owner only, on top of card */}
                {isOwner && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      size="sm" variant="ghost"
                      className="size-7 p-0 bg-background/80 hover:bg-muted shadow-sm"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditSite({ id: s.id, name: s.name, location: s.location ?? "", description: s.description ?? "" });
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="size-7 p-0 bg-background/80 hover:bg-destructive/10 hover:text-destructive shadow-sm"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`"${s.name}" delete karna chahte ho? Sari entries bhi delete ho jaayengi.`))
                          deleteSite.mutate(s.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
