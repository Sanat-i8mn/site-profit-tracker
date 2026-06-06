import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ArrowLeft, Download, Trash2, ArrowUpRight, ArrowDownRight, FileText, Fuel, Wrench, Users } from "lucide-react";
import { CATEGORIES, EQUIPMENT_NAMES, EQUIPMENT_CATEGORIES, LABOUR_ROLES, LABOUR_CATEGORIES, formatINR, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/sites/$siteId")({
  component: SiteDetail,
  head: () => ({ meta: [{ title: "Site Ledger — SiteKhata" }] }),
});

function SiteDetail() {
  const { siteId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"credit" | "debit">("debit");
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    particular: "",
    amount: "",
    category: "Other / अन्य",
    equipment: "",
    labourRole: "",
  });

  const { data: site } = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", siteId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["entries", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries").select("*")
        .eq("site_id", siteId)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error("Amount required");
      const prefix = form.equipment
          ? `[${form.equipment}]`
          : form.labourRole
          ? `[${form.labourRole}]`
          : "";
      const { error } = await supabase.from("entries").insert({
        site_id: siteId,
        entry_date: form.entry_date,
        particular: prefix ? `${prefix} ${form.particular}`.trim() : form.particular,
        category: form.category,
        credit: type === "credit" ? amount : 0,
        debit: type === "debit" ? amount : 0,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry added");
      setOpen(false);
      setForm({ ...form, particular: "", amount: "", equipment: "", labourRole: "" });
      qc.invalidateQueries({ queryKey: ["entries", siteId] });
      qc.invalidateQueries({ queryKey: ["entries-all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["entries", siteId] });
      qc.invalidateQueries({ queryKey: ["entries-all"] });
    },
  });

  // Compute running balance
  const ledger = useMemo(() => {
    let bal = 0;
    return entries.map((e) => {
      bal += Number(e.credit) - Number(e.debit);
      return { ...e, balance: bal };
    });
  }, [entries]);

  const reversed = [...ledger].reverse();
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);
  const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0);
  const balance = totalCredit - totalDebit;

  // Category breakdown for debit
  const byCategory = Object.entries(
    entries.filter((e) => Number(e.debit) > 0).reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.debit);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Daily trend
  const daily = Object.entries(
    entries.reduce((acc: Record<string, { credit: number; debit: number }>, e) => {
      acc[e.entry_date] = acc[e.entry_date] || { credit: 0, debit: 0 };
      acc[e.entry_date].credit += Number(e.credit);
      acc[e.entry_date].debit += Number(e.debit);
      return acc;
    }, {})
  ).map(([date, v]) => ({ date: formatDate(date), ...v })).slice(-14);

  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  // Advance tracking — entries with advance categories
  const ADVANCE_CATEGORIES = ["Advance / एडवांस", "Labour Advance / मजदूर एडवांस", "Equipment Advance / मशीन एडवांस"];
  const advanceEntries = entries.filter(e => ADVANCE_CATEGORIES.includes(e.category) && Number(e.debit) > 0);
  const totalAdvance = advanceEntries.reduce((s, e) => s + Number(e.debit), 0);

  // Equipment log — entries where particular starts with [MachineName]
  const equipmentLog = useMemo(() => {
    const map: Record<string, { diesel: number; hire: number; repair: number; entries: typeof entries }> = {};
    entries.forEach(e => {
      if (!EQUIPMENT_CATEGORIES.includes(e.category as any)) return;
      const match = e.particular?.match(/^\[(.+?)\]/);
      const name = match ? match[1] : "Other";
      if (!map[name]) map[name] = { diesel: 0, hire: 0, repair: 0, entries: [] };
      if (e.category === "Diesel / डीजल") map[name].diesel += Number(e.debit);
      else if (e.category === "Equipment Hire / मशीन भाड़ा") map[name].hire += Number(e.debit);
      else if (e.category === "Equipment Advance / मशीन एडवांस") map[name].hire += Number(e.debit);
      else if (e.category === "Repair / मरम्मत") map[name].repair += Number(e.debit);
      map[name].entries.push(e);
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v, total: v.diesel + v.hire + v.repair })).sort((a,b) => b.total - a.total);
  }, [entries]);

  const isEquipmentCategory = EQUIPMENT_CATEGORIES.includes(form.category as any);
  const isLabourCategory    = LABOUR_CATEGORIES.includes(form.category as any);

  // Labour tracking
  const labourEntries = entries.filter(e => LABOUR_CATEGORIES.includes(e.category as any) && Number(e.debit) > 0);
  const labourByRole  = Object.entries(
    labourEntries.reduce((acc: Record<string, number>, e) => {
      const match = e.particular?.match(/^\[(.+?)\]/);
      const role  = match ? match[1] : "Other";
      acc[role]   = (acc[role] || 0) + Number(e.debit);
      return acc;
    }, {})
  ).map(([role, amount]) => ({ role, amount })).sort((a, b) => b.amount - a.amount);
  const totalLabour = labourEntries.reduce((s, e) => s + Number(e.debit), 0);

  function exportCSV() {
    const rows = [
      ["Date", "Particular", "Category", "Credit", "Debit", "Balance"],
      ...ledger.map(e => [e.entry_date, e.particular, e.category, e.credit, e.debit, e.balance]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${site?.name || "site"}-cash-report.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const siteName = site?.name || "Site";
    const dateFrom = ledger[ledger.length - 1] ? ledger[0].entry_date : "—";
    const dateTo = ledger[ledger.length - 1]?.entry_date || "—";

    // Header background
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 28, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CASH REPORT", pageW / 2, 10, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(siteName.toUpperCase(), pageW / 2, 17, { align: "center" });

    doc.setFontSize(9);
    doc.text(`From: ${dateFrom}   To: ${dateTo}`, pageW / 2, 24, { align: "center" });

    // Summary boxes
    const boxY = 34;
    const boxH = 18;
    const boxW = (pageW - 30) / 3;
    const boxes = [
      { label: "Total Received", value: formatINR(totalCredit), color: [22, 163, 74] as [number,number,number] },
      { label: "Total Spent", value: formatINR(totalDebit), color: [220, 38, 38] as [number,number,number] },
      { label: "Closing Balance", value: formatINR(balance), color: [30, 41, 59] as [number,number,number] },
    ];
    boxes.forEach((b, i) => {
      const x = 10 + i * (boxW + 5);
      doc.setFillColor(...b.color);
      doc.roundedRect(x, boxY, boxW, boxH, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(b.label.toUpperCase(), x + boxW / 2, boxY + 5.5, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(b.value, x + boxW / 2, boxY + 13, { align: "center" });
    });

    // Ledger table
    const tableRows = ledger.map((e, idx) => [
      String(idx + 1),
      e.entry_date,
      e.particular || "—",
      e.category,
      Number(e.credit) > 0 ? formatINR(Number(e.credit)) : "",
      Number(e.debit) > 0 ? formatINR(Number(e.debit)) : "",
      formatINR(e.balance),
    ]);

    // Total row
    tableRows.push([
      "", "",
      "TOTAL",
      "",
      formatINR(totalCredit),
      formatINR(totalDebit),
      formatINR(balance),
    ]);

    autoTable(doc, {
      startY: boxY + boxH + 6,
      head: [["#", "Date", "Particular", "Category", "Credit", "Debit", "Balance"]],
      body: tableRows,
      styles: { fontSize: 7.5, cellPadding: 2.5, font: "helvetica", overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
        4: { halign: "right", cellWidth: 22, textColor: [22, 163, 74] },
        5: { halign: "right", cellWidth: 22, textColor: [220, 38, 38] },
        6: { halign: "right", cellWidth: 22, fontStyle: "bold" },
      },
      didParseCell: (data) => {
        // Total row styling
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249];
        }
        // Alternate row color
        if (data.row.index % 2 === 0 && data.row.index !== tableRows.length - 1) {
          data.cell.styles.fillColor = [248, 250, 252];
        }
      },
      margin: { left: 10, right: 10 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated by SiteKhata  |  ${new Date().toLocaleDateString("en-IN")}`, pageW / 2, finalY, { align: "center" });

    // Page numbers
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: "right" });
    }

    doc.save(`${siteName}-Cash-Report.pdf`);
    toast.success("PDF report downloaded!");
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <Link to="/sites" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> All sites
        </Link>
        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold">{site?.name ?? "Loading…"}</h1>
            <p className="text-muted-foreground mt-1">{site?.location}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}><Download className="size-4" /> CSV</Button>
            <Button variant="outline" onClick={exportPDF} className="border-primary/40 text-primary hover:bg-primary/10"><FileText className="size-4" /> PDF Report</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90"><Plus className="size-4" /> Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New entry / नई एंट्री</DialogTitle></DialogHeader>
                <Tabs value={type} onValueChange={(v) => setType(v as any)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="debit" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
                      <ArrowUpRight className="size-4" /> Debit (Spent)
                    </TabsTrigger>
                    <TabsTrigger value="credit" className="data-[state=active]:bg-success/10 data-[state=active]:text-success">
                      <ArrowDownRight className="size-4" /> Credit (Received)
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={type} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input type="date" value={form.entry_date} onChange={(e) => setForm({...form, entry_date: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Amount ₹</Label>
                        <Input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({...form, category: v, equipment: ""})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {isEquipmentCategory && (
                      <div className="space-y-1.5">
                        <Label>Equipment / Machine</Label>
                        <Select value={form.equipment} onValueChange={(v) => setForm({...form, equipment: v})}>
                          <SelectTrigger><SelectValue placeholder="Select machine (optional)" /></SelectTrigger>
                          <SelectContent>
                            {EQUIPMENT_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {isLabourCategory && (
                      <div className="space-y-1.5">
                        <Label>Labour Role</Label>
                        <Select value={form.labourRole} onValueChange={(v) => setForm({...form, labourRole: v})}>
                          <SelectTrigger><SelectValue placeholder="Role chunno (optional)" /></SelectTrigger>
                          <SelectContent>
                            {LABOUR_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Particular / विवरण</Label>
                      <Textarea value={form.particular} onChange={(e) => setForm({...form, particular: e.target.value})} placeholder="रुपया डीजल फॉर्चूनर..." rows={3} />
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="bg-primary">Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card border-border/60">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Received</div>
            <div className="num text-2xl font-bold text-success mt-2">{formatINR(totalCredit)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/60">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Spent</div>
            <div className="num text-2xl font-bold text-destructive mt-2">{formatINR(totalDebit)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/60 bg-gradient-hero text-primary-foreground">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-primary-foreground/70">Balance</div>
            <div className="num text-2xl font-bold mt-2 text-accent">{formatINR(balance)}</div>
          </CardContent>
        </Card>
      </div>

      {entries.length > 0 && (
        <div className="grid lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="text-sm font-semibold mb-3">Daily flow (last 14 days)</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                    <Line type="monotone" dataKey="credit" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="debit" stroke="var(--chart-4)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 shadow-card border-border/60">
            <CardContent className="p-5">
              <div className="text-sm font-semibold mb-3">Top expense categories</div>
              <div className="h-56 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory.slice(0,5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {byCategory.slice(0,5).map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2">
                {byCategory.slice(0,5).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full shrink-0" style={{ background: pieColors[i] }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="num font-medium">{formatINR(c.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {labourEntries.length > 0 && (
        <Card className="shadow-card border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <div>
                <h2 className="font-display font-bold">Labour Payments</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Role-wise payment breakdown</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Labour</div>
              <div className="num font-bold text-primary">{formatINR(totalLabour)}</div>
            </div>
          </div>
          <div className="divide-y">
            {labourByRole.map((r, i) => {
              const pct = totalLabour > 0 ? Math.round((r.amount / totalLabour) * 100) : 0;
              return (
                <div key={r.role} className="px-5 py-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{r.role}</span>
                    <span className="num text-muted-foreground">{formatINR(r.amount)} <span className="text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--chart-${(i % 5) + 1})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {equipmentLog.length > 0 && (
        <Card className="shadow-card border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Fuel className="size-4 text-amber-500" />
            <div>
              <h2 className="font-display font-bold">Equipment / Machine Log</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Har machine ka diesel + hire + repair kharch</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Machine</th>
                  <th className="text-right px-5 py-3 font-medium">Diesel</th>
                  <th className="text-right px-5 py-3 font-medium">Hire / Advance</th>
                  <th className="text-right px-5 py-3 font-medium">Repair</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {equipmentLog.map(eq => (
                  <tr key={eq.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium flex items-center gap-2">
                      <Wrench className="size-3.5 text-muted-foreground" />{eq.name}
                    </td>
                    <td className="px-5 py-3 text-right num text-amber-600">{eq.diesel > 0 ? formatINR(eq.diesel) : <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-5 py-3 text-right num text-blue-600">{eq.hire > 0 ? formatINR(eq.hire) : <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-5 py-3 text-right num text-orange-600">{eq.repair > 0 ? formatINR(eq.repair) : <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-5 py-3 text-right num font-bold">{formatINR(eq.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td className="px-5 py-3 font-bold text-xs uppercase">Total</td>
                  <td className="px-5 py-3 text-right num font-bold text-amber-600">{formatINR(equipmentLog.reduce((s,e) => s+e.diesel,0))}</td>
                  <td className="px-5 py-3 text-right num font-bold text-blue-600">{formatINR(equipmentLog.reduce((s,e) => s+e.hire,0))}</td>
                  <td className="px-5 py-3 text-right num font-bold text-orange-600">{formatINR(equipmentLog.reduce((s,e) => s+e.repair,0))}</td>
                  <td className="px-5 py-3 text-right num font-bold">{formatINR(equipmentLog.reduce((s,e) => s+e.total,0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {advanceEntries.length > 0 && (
        <Card className="shadow-card border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold">Advance Tracker</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Diye gaye advance — settle hone tak track karo</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Advance</div>
              <div className="num font-bold text-destructive">{formatINR(totalAdvance)}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Particular</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {advanceEntries.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 num text-xs whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td className="px-5 py-3">{e.particular}</td>
                    <td className="px-5 py-3"><Badge variant="outline" className="text-[10px] font-normal border-amber-400/50 text-amber-600">{e.category}</Badge></td>
                    <td className="px-5 py-3 text-right num font-semibold text-destructive">{formatINR(Number(e.debit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="shadow-card border-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-display font-bold">Cash Ledger</h2>
          <Badge variant="secondary">{entries.length} entries</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Particular</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-right px-5 py-3 font-medium">Credit</th>
                <th className="text-right px-5 py-3 font-medium">Debit</th>
                <th className="text-right px-5 py-3 font-medium">Balance</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && reversed.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                  No entries yet. Click <strong>Add Entry</strong> to begin.
                </td></tr>
              )}
              {reversed.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 num text-xs whitespace-nowrap">{formatDate(e.entry_date)}</td>
                  <td className="px-5 py-3 max-w-md">{e.particular}</td>
                  <td className="px-5 py-3"><Badge variant="outline" className="text-[10px] font-normal">{e.category}</Badge></td>
                  <td className="px-5 py-3 text-right num">{Number(e.credit) > 0 ? <span className="text-success font-semibold">{formatINR(Number(e.credit))}</span> : <span className="text-muted-foreground/30">—</span>}</td>
                  <td className="px-5 py-3 text-right num">{Number(e.debit) > 0 ? <span className="text-destructive font-semibold">{formatINR(Number(e.debit))}</span> : <span className="text-muted-foreground/30">—</span>}</td>
                  <td className="px-5 py-3 text-right num font-bold">{formatINR(e.balance)}</td>
                  <td className="px-2">
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(e.id); }}>
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
