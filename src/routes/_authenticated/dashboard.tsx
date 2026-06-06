import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/constants";
import { ArrowDownRight, ArrowUpRight, Building2, IndianRupee, Wallet, Fuel, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — SiteKhata" }] }),
});

const ADVANCE_CATS = ["Advance / एडवांस", "Labour Advance / मजदूर एडवांस", "Equipment Advance / मशीन एडवांस"];
const DIESEL_CAT = "Diesel / डीजल";
const FUND_CAT = "Fund Received / नकद प्राप्त";
const EQUIP_CATS = ["Equipment Hire / मशीन भाड़ा", "Equipment Advance / मशीन एडवांस"];

function Dashboard() {
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entries").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);
  const totalDebit  = entries.reduce((s, e) => s + Number(e.debit), 0);
  const balance     = totalCredit - totalDebit;

  // Fund installments — all "Fund Received" credit entries across sites
  const fundInstallments = entries
    .filter(e => e.category === FUND_CAT && Number(e.credit) > 0)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  // Total advances outstanding across all sites
  const totalAdvances = entries
    .filter(e => ADVANCE_CATS.includes(e.category) && Number(e.debit) > 0)
    .reduce((s, e) => s + Number(e.debit), 0);

  // Total diesel spend across all sites
  const totalDiesel = entries
    .filter(e => e.category === DIESEL_CAT && Number(e.debit) > 0)
    .reduce((s, e) => s + Number(e.debit), 0);

  // Total equipment cost across all sites
  const totalEquipment = entries
    .filter(e => EQUIP_CATS.includes(e.category) && Number(e.debit) > 0)
    .reduce((s, e) => s + Number(e.debit), 0);

  const siteStats = sites.map((s) => {
    const es = entries.filter((e) => e.site_id === s.id);
    const credit    = es.reduce((sum, e) => sum + Number(e.credit), 0);
    const debit     = es.reduce((sum, e) => sum + Number(e.debit), 0);
    const advances  = es.filter(e => ADVANCE_CATS.includes(e.category)).reduce((sum, e) => sum + Number(e.debit), 0);
    const diesel    = es.filter(e => e.category === DIESEL_CAT).reduce((sum, e) => sum + Number(e.debit), 0);
    const funds     = es.filter(e => e.category === FUND_CAT && Number(e.credit) > 0).length;
    return { ...s, credit, debit, balance: credit - debit, count: es.length, advances, diesel, funds };
  });

  const chartData = siteStats.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    Received: s.credit,
    Spent: s.debit,
  }));

  const stats = [
    { label: "Total Sites",      value: sites.length,         icon: Building2,     hint: `${entries.length} entries` },
    { label: "Funds Received",   value: formatINR(totalCredit), icon: ArrowDownRight, tone: "text-success" },
    { label: "Total Spent",      value: formatINR(totalDebit),  icon: ArrowUpRight,   tone: "text-destructive" },
    { label: "Cash in Hand",     value: formatINR(balance),     icon: Wallet,         tone: balance >= 0 ? "text-foreground" : "text-destructive" },
    { label: "Total Diesel",     value: formatINR(totalDiesel), icon: Fuel,           tone: "text-amber-500" },
    { label: "Equipment Cost",   value: formatINR(totalEquipment), icon: Building2,  tone: "text-blue-500" },
    { label: "Advances Given",   value: formatINR(totalAdvances),  icon: AlertCircle, tone: "text-orange-500" },
    { label: "Fund Installments", value: fundInstallments.length,  icon: ArrowDownRight, hint: "across all sites" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold">Owner Dashboard</h1>
            <p className="text-muted-foreground mt-1">Sab sites ka real-time hisaab</p>
          </div>
          <Badge variant="outline" className="text-xs">Live</Badge>
        </div>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
                  <Icon className={`size-4 ${s.tone ?? "text-muted-foreground"}`} />
                </div>
                <div className={`mt-3 num text-2xl font-bold ${s.tone ?? ""}`}>{s.value}</div>
                {s.hint && <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fund Installments */}
      {fundInstallments.length > 0 && (
        <Card className="shadow-card border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <div className="font-display font-bold">Fund Installments</div>
              <p className="text-xs text-muted-foreground mt-0.5">Sab sites pe aaye funds ka record</p>
            </div>
            <div className="num font-bold text-success text-lg">{formatINR(totalCredit)}</div>
          </div>
          <div className="divide-y">
            {fundInstallments.map((e) => {
              const siteName = sites.find(s => s.id === e.site_id)?.name ?? "—";
              return (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.particular || "Fund received"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{siteName} · {e.entry_date}</div>
                  </div>
                  <div className="num font-bold text-success shrink-0">{formatINR(Number(e.credit))}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">Site-wise Cash Flow</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                  formatter={(v: number) => formatINR(v)}
                />
                <Bar dataKey="Received" fill="var(--chart-3)" radius={[6,6,0,0]} />
                <Bar dataKey="Spent" fill="var(--chart-4)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sites list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Sites</h2>
          <Link to="/sites" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {siteStats.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-10 text-center text-muted-foreground">
              <Building2 className="size-10 mx-auto mb-3 opacity-40" />
              No sites yet. <Link to="/sites" className="text-primary font-medium">Add your first site →</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {siteStats.map((s) => (
              <Link key={s.id} to="/sites/$siteId" params={{ siteId: s.id }} className="block group">
                <Card className="shadow-card hover:shadow-elevated transition-shadow border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-display font-bold truncate group-hover:text-primary transition-colors">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.location || "—"}</div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{s.count} entries</Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Received</div>
                        <div className="num font-semibold text-success">{formatINR(s.credit)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Spent</div>
                        <div className="num font-semibold text-destructive">{formatINR(s.debit)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><Fuel className="size-3" /> Diesel</div>
                        <div className="num font-semibold text-amber-500">{formatINR(s.diesel)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><AlertCircle className="size-3" /> Advances</div>
                        <div className="num font-semibold text-orange-500">{formatINR(s.advances)}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <IndianRupee className="size-3" /> Balance
                      </span>
                      <span className={`num font-bold ${s.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                        {formatINR(s.balance)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
