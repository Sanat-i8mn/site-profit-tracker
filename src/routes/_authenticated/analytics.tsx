import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsOwner } from "@/lib/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatINR, LABOUR_CATEGORIES, LABOUR_ROLES } from "@/lib/constants";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Target, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Analytics — SiteKhata" }] }),
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.6 0.15 200)", "oklch(0.65 0.18 340)"];
const ADVANCE_CATS = ["Advance / एडवांस", "Labour Advance / मजदूर एडवांस", "Equipment Advance / मशीन एडवांस"];

function Analytics() {
  const { user } = useAuth();
  const isOwner = useIsOwner(user?.id);
  const qc = useQueryClient();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetSite, setBudgetSite] = useState("");
  const [budgetAmt, setBudgetAmt] = useState("");

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => (await supabase.from("sites").select("*")).data ?? [],
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["entries-all"],
    queryFn: async () => (await supabase.from("entries").select("*")).data ?? [],
  });

  // ── Core numbers ──────────────────────────────────────────────
  const totalCredit       = entries.reduce((s, e) => s + Number(e.credit), 0);
  const totalDebit        = entries.reduce((s, e) => s + Number(e.debit), 0);
  const cashInHand        = totalCredit - totalDebit;
  const uniqueDays        = new Set(entries.map(e => e.entry_date)).size;
  const avgDailySpend     = uniqueDays > 0 ? totalDebit / uniqueDays : 0;
  const projectedMonth    = avgDailySpend * 30;
  const daysRunway        = avgDailySpend > 0 ? Math.floor(cashInHand / avgDailySpend) : 0;

  // ── Monthly trend ─────────────────────────────────────────────
  const monthly = Object.entries(
    entries.reduce((acc: Record<string, { credit: number; debit: number }>, e) => {
      const m = e.entry_date.slice(0, 7);
      acc[m] = acc[m] || { credit: 0, debit: 0 };
      acc[m].credit += Number(e.credit);
      acc[m].debit  += Number(e.debit);
      return acc;
    }, {})
  ).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));

  // ── Category breakdown ────────────────────────────────────────
  const byCategory = Object.entries(
    entries.filter(e => Number(e.debit) > 0).reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.debit);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ── Labour payment tracking ───────────────────────────────────
  const labourEntries = entries.filter(e =>
    LABOUR_CATEGORIES.includes(e.category as any) && Number(e.debit) > 0
  );

  // Group by role (from particular prefix [Role])
  const labourByRole = Object.entries(
    labourEntries.reduce((acc: Record<string, number>, e) => {
      const match = e.particular?.match(/^\[(.+?)\]/);
      const role  = match ? match[1] : "Other / अन्य";
      acc[role]   = (acc[role] || 0) + Number(e.debit);
      return acc;
    }, {})
  ).map(([role, amount]) => ({ role, amount })).sort((a, b) => b.amount - a.amount);

  // Group labour by site
  const labourBySite = sites.map(s => {
    const amt = labourEntries
      .filter(e => e.site_id === s.id)
      .reduce((sum, e) => sum + Number(e.debit), 0);
    return { name: s.name.length > 16 ? s.name.slice(0, 14) + "…" : s.name, amount: amt };
  }).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);

  const totalLabour = labourEntries.reduce((s, e) => s + Number(e.debit), 0);

  // ── Multi-site comparison ─────────────────────────────────────
  const siteComparison = sites.map(s => {
    const es       = entries.filter(e => e.site_id === s.id);
    const credit   = es.reduce((sum, e) => sum + Number(e.credit), 0);
    const debit    = es.reduce((sum, e) => sum + Number(e.debit), 0);
    const labour   = es.filter(e => LABOUR_CATEGORIES.includes(e.category as any)).reduce((sum, e) => sum + Number(e.debit), 0);
    const diesel   = es.filter(e => e.category === "Diesel / डीजल").reduce((sum, e) => sum + Number(e.debit), 0);
    const advances = es.filter(e => ADVANCE_CATS.includes(e.category)).reduce((sum, e) => sum + Number(e.debit), 0);
    const budget   = Number((s as any).budget || 0);
    return {
      id: s.id,
      name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
      fullName: s.name,
      credit, debit, labour, diesel, advances,
      balance: credit - debit,
      budget,
      budgetUsed: budget > 0 ? Math.round((debit / budget) * 100) : null,
    };
  });

  // Radar data — top 5 sites by spend
  const radarSites = [...siteComparison].sort((a, b) => b.debit - a.debit).slice(0, 5);
  const radarMax   = Math.max(...radarSites.map(s => s.debit), 1);
  const radarData  = [
    { metric: "Spent",    ...Object.fromEntries(radarSites.map(s => [s.name, Math.round((s.debit / radarMax) * 100)])) },
    { metric: "Labour",   ...Object.fromEntries(radarSites.map(s => [s.name, Math.round((s.labour / radarMax) * 100)])) },
    { metric: "Diesel",   ...Object.fromEntries(radarSites.map(s => [s.name, Math.round((s.diesel / radarMax) * 100)])) },
    { metric: "Advances", ...Object.fromEntries(radarSites.map(s => [s.name, Math.round((s.advances / radarMax) * 100)])) },
  ];

  // ── Budget update ─────────────────────────────────────────────
  const updateBudget = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(budgetAmt);
      if (!budgetSite || !amt || amt <= 0) throw new Error("Site aur amount required hai");
      const { error } = await supabase.from("sites").update({ budget: amt } as any).eq("id", budgetSite);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget set kar diya!");
      setBudgetOpen(false);
      setBudgetSite(""); setBudgetAmt("");
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["sites-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics & Forecast</h1>
          <p className="text-muted-foreground mt-1">Labour tracking, site comparison, budget vs actual</p>
        </div>
        {isOwner && (
          <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Target className="size-4" /> Set Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Site Budget Set Karo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Site</Label>
                  <Select value={budgetSite} onValueChange={setBudgetSite}>
                    <SelectTrigger><SelectValue placeholder="Site chunno" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Budget Amount ₹</Label>
                  <Input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} placeholder="e.g. 5000000" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBudgetOpen(false)}>Cancel</Button>
                <Button onClick={() => updateBudget.mutate()} disabled={updateBudget.isPending} className="bg-primary">Save Budget</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* ── Forecast KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Daily Spend",   val: formatINR(avgDailySpend),    sub: "Burn rate",          icon: TrendingDown, tone: "" },
          { label: "Projected (30d)",   val: formatINR(projectedMonth),   sub: "at current rate",    icon: TrendingDown, tone: "text-destructive" },
          { label: "Cash Runway",       val: `${daysRunway} days`,         sub: "till cash runs out", icon: TrendingUp,   tone: "text-accent" },
          { label: "Net Position",      val: formatINR(cashInHand),        sub: "Available",          icon: TrendingUp,   tone: cashInHand >= 0 ? "text-success" : "text-destructive" },
        ].map(k => (
          <Card key={k.label} className="shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <k.icon className="size-4 text-muted-foreground" />
              </div>
              <div className={`num text-2xl font-bold mt-2 ${k.tone}`}>{k.val}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Monthly Cash Flow ── */}
      <Card className="shadow-card border-border/60">
        <CardContent className="p-5">
          <div className="font-display font-bold mb-4">Monthly Cash Flow</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="credit" name="Received" fill="var(--chart-3)" radius={[6,6,0,0]} />
                <Bar dataKey="debit"  name="Spent"    fill="var(--chart-4)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Labour Payment Tracking ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Labour Payment Tracking</h2>
          <Badge variant="secondary">{formatINR(totalLabour)} total</Badge>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {/* By role */}
          <Card className="shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="font-semibold mb-4 text-sm">Payment by Role</div>
              {labourByRole.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">
                  Koi labour entry nahi. Site pe entry karo aur role select karo.
                </div>
              ) : (
                <div className="space-y-2">
                  {labourByRole.map((r, i) => {
                    const pct = totalLabour > 0 ? (r.amount / totalLabour) * 100 : 0;
                    return (
                      <div key={r.role}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium truncate">{r.role}</span>
                          <span className="num text-muted-foreground">{formatINR(r.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* By site */}
          <Card className="shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="font-semibold mb-4 text-sm">Labour Cost by Site</div>
              {labourBySite.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">No data yet.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={labourBySite} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={90} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                      <Bar dataKey="amount" name="Labour" fill="var(--chart-2)" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Multi-site Comparison ── */}
      <div>
        <h2 className="font-display text-xl font-bold mb-3">Multi-site Comparison</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Table */}
          <Card className="shadow-card border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Site</th>
                    <th className="text-right px-4 py-3">Received</th>
                    <th className="text-right px-4 py-3">Spent</th>
                    <th className="text-right px-4 py-3">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {siteComparison.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to="/sites/$siteId" params={{ siteId: s.id }} className="font-medium hover:text-primary truncate block max-w-[120px]">{s.fullName}</Link>
                      </td>
                      <td className="px-4 py-3 text-right num text-success">{formatINR(s.credit)}</td>
                      <td className="px-4 py-3 text-right num text-destructive">{formatINR(s.debit)}</td>
                      <td className={`px-4 py-3 text-right num font-bold ${s.balance >= 0 ? "" : "text-destructive"}`}>{formatINR(s.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Radar */}
          <Card className="shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="font-semibold text-sm mb-3">Site Cost Profile (top 5)</div>
              {radarSites.length < 2 ? (
                <div className="text-muted-foreground text-sm text-center py-8">2+ sites chahiye radar ke liye.</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      {radarSites.map((s, i) => (
                        <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Budget vs Actual ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Budget vs Actual</h2>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={() => setBudgetOpen(true)} className="gap-1 text-muted-foreground">
              <Pencil className="size-3.5" /> Edit budgets
            </Button>
          )}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {siteComparison.map(s => {
            const hasBudget = s.budget > 0;
            const pct       = hasBudget ? Math.min(Math.round((s.debit / s.budget) * 100), 100) : 0;
            const over      = hasBudget && s.debit > s.budget;
            return (
              <Card key={s.id} className="shadow-card border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="font-display font-bold truncate">{s.fullName}</div>
                    {over && <Badge variant="destructive" className="text-[10px] shrink-0">Over Budget</Badge>}
                    {hasBudget && !over && <Badge variant="secondary" className="text-[10px] shrink-0">{pct}%</Badge>}
                  </div>
                  {hasBudget ? (
                    <>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: over ? "var(--destructive)" : pct > 80 ? "oklch(0.75 0.18 60)" : "var(--chart-3)" }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Budget</div>
                          <div className="num font-semibold">{formatINR(s.budget)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Spent</div>
                          <div className={`num font-semibold ${over ? "text-destructive" : ""}`}>{formatINR(s.debit)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className={`num font-semibold ${over ? "text-destructive" : "text-success"}`}>
                            {over ? `−${formatINR(s.debit - s.budget)}` : formatINR(s.budget - s.debit)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Used</div>
                          <div className="num font-semibold">{pct}%</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Budget set nahi hai.{" "}
                      {isOwner && (
                        <button onClick={() => { setBudgetSite(s.id); setBudgetOpen(true); }} className="text-primary hover:underline">
                          Set karo →
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-card border-border/60">
          <CardContent className="p-5">
            <div className="font-display font-bold mb-4">Expense Categories</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              {byCategory.slice(0, 8).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="size-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="num">{formatINR(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/60">
          <CardContent className="p-5">
            <div className="font-display font-bold mb-4">Spend by Site</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteComparison} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={90} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="debit" name="Spent" fill="var(--chart-1)" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
