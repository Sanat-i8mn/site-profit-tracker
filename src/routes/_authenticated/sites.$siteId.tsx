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
import { Plus, ArrowLeft, Download, Trash2, Pencil, ArrowUpRight, ArrowDownRight, FileText, Fuel, Wrench, Users } from "lucide-react";
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

  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [editType, setEditType] = useState<"credit" | "debit">("debit");
  const [editForm, setEditForm] = useState({
    entry_date: "",
    particular: "",
    amount: "",
    category: "Other / अन्य",
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

  const updateEntry = useMutation({
    mutationFn: async () => {
      if (!editEntry) return;
      const amount = parseFloat(editForm.amount);
      if (!amount || amount <= 0) throw new Error("Amount required");
      const { error } = await supabase.from("entries").update({
        entry_date: editForm.entry_date,
        particular: editForm.particular,
        category: editForm.category,
        credit: editType === "credit" ? amount : 0,
        debit: editType === "debit" ? amount : 0,
      }).eq("id", editEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry updated");
      setEditOpen(false);
      setEditEntry(null);
      qc.invalidateQueries({ queryKey: ["entries", siteId] });
      qc.invalidateQueries({ queryKey: ["entries-all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(e: any) {
    const isCredit = Number(e.credit) > 0;
    setEditType(isCredit ? "credit" : "debit");
    setEditForm({
      entry_date: e.entry_date,
      particular: e.particular || "",
      amount: String(isCredit ? e.credit : e.debit),
      category: e.category,
    });
    setEditEntry(e);
    setEditOpen(true);
  }

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

  // PDF helpers — strip Hindi text & replace ₹ (unsupported in helvetica)
  function pdfAmt(n: number) {
    return formatINR(n).replace(/₹\s?/, "Rs.");
  }
  function pdfDate(d: string) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}-${m}-${y}`;
  }
  function pdfText(s: string) {
    if (!s) return "—";
    // Keep only the English part before " / "
    const eng = s.split(" / ")[0].trim();
    // Remove any remaining non-ASCII characters
    return eng.replace(/[^\x00-\x7F]/g, "").trim() || eng.replace(/[^\u0020-\u007E]/g, "").trim() || "—";
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const siteName = site?.name || "Site";
    const siteLocation = site?.location || "";
    const dateFrom = ledger[0]?.entry_date || "";
    const dateTo = ledger[ledger.length - 1]?.entry_date || "";
    const generatedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const ML = 14, MR = 14;
    const contentW = pageW - ML - MR;

    // ── Colour palette ──────────────────────────────────────────
    const NAVY  : [number,number,number] = [15,  37,  71];
    const TEAL  : [number,number,number] = [2,  132, 119];
    const GREEN : [number,number,number] = [21, 128,  61];
    const RED   : [number,number,number] = [185,  28,  28];
    const SLATE : [number,number,number] = [71,  85, 105];
    const LIGHT : [number,number,number] = [241, 245, 249];
    const WHITE : [number,number,number] = [255, 255, 255];
    const BORDER: [number,number,number] = [203, 213, 225];

    // ── Helper ──────────────────────────────────────────────────
    function addPageFooter(pageNum: number, totalPages: number) {
      const y = pageH - 8;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.line(ML, y - 3, pageW - MR, y - 3);
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${generatedOn}`, ML, y);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - MR, y, { align: "right" });
    }

    // ══════════════════════════════════════════════════════════════
    // PAGE 1 — COVER + SUMMARY
    // ══════════════════════════════════════════════════════════════

    // Top accent bar
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, pageW, 3, "F");

    // Header block
    doc.setFillColor(...NAVY);
    doc.rect(0, 3, pageW, 44, "F");

    // Watermark text — large faint
    doc.setTextColor(255, 255, 255, 0.04 as any);
    doc.setFontSize(52);
    doc.setFont("helvetica", "bold");
    doc.text("SITKHATA", pageW / 2, 35, { align: "center" });

    // Company name top-left
    doc.setTextColor(...TEAL);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SITEKHATA", ML, 13);
    doc.setTextColor(180, 200, 220);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Contractor Cash Book", ML, 17.5);

    // Report label top-right
    doc.setTextColor(...TEAL);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CASH REPORT", pageW - MR, 13, { align: "right" });
    doc.setTextColor(180, 200, 220);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(generatedOn, pageW - MR, 17.5, { align: "right" });

    // Site name — big centred
    doc.setTextColor(...WHITE);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(siteName.toUpperCase(), pageW / 2, 32, { align: "center" });

    // Location + period — small under site name
    const periodStr = dateFrom && dateTo
      ? `${pdfDate(dateFrom)}  to  ${pdfDate(dateTo)}`
      : "All entries";
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 220);
    const subLine = siteLocation ? `${siteLocation}   |   ${periodStr}` : periodStr;
    doc.text(subLine, pageW / 2, 39, { align: "center" });

    // Bottom teal stripe under header
    doc.setFillColor(...TEAL);
    doc.rect(0, 47, pageW, 1.5, "F");

    // ── Summary KPI cards (4 boxes) ──────────────────────────────
    const cardY = 55;
    const cardH = 22;
    const gap   = 4;
    const cardW = (contentW - gap * 3) / 4;

    const kpis = [
      { label: "TOTAL RECEIVED",  value: pdfAmt(totalCredit), color: GREEN,  bg: [240, 253, 244] as [number,number,number] },
      { label: "TOTAL SPENT",     value: pdfAmt(totalDebit),  color: RED,    bg: [254, 242, 242] as [number,number,number] },
      { label: "NET BALANCE",     value: pdfAmt(balance),     color: NAVY,   bg: LIGHT },
      { label: "TOTAL ENTRIES",   value: String(entries.length), color: TEAL,   bg: [240, 253, 250] as [number,number,number] },
    ];

    kpis.forEach((k, i) => {
      const x = ML + i * (cardW + gap);
      // Card background
      doc.setFillColor(...k.bg);
      doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "F");
      // Left accent bar
      doc.setFillColor(...k.color);
      doc.roundedRect(x, cardY, 2.5, cardH, 1, 1, "F");
      // Label
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE);
      doc.text(k.label, x + 6, cardY + 7);
      // Value
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...k.color);
      doc.text(k.value, x + 6, cardY + 16);
    });

    // ── Category breakdown mini-table ────────────────────────────
    let curY = cardY + cardH + 8;

    if (byCategory.length > 0) {
      // Section header
      doc.setFillColor(...NAVY);
      doc.rect(ML, curY, contentW, 7, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("EXPENSE BREAKDOWN BY CATEGORY", ML + 4, curY + 4.8);
      curY += 7;

      const catRows = byCategory.map((c, i) => [
        String(i + 1),
        pdfText(c.name),
        pdfAmt(c.value as number),
        `${totalDebit > 0 ? ((c.value as number / totalDebit) * 100).toFixed(1) : "0"}%`,
      ]);

      autoTable(doc, {
        startY: curY,
        head: [["#", "Category", "Amount", "Share"]],
        body: catRows,
        margin: { left: ML, right: MR },
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, font: "helvetica" },
        headStyles: { fillColor: SLATE, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { cellWidth: 90 },
          2: { halign: "right", cellWidth: 38, textColor: RED },
          3: { halign: "right", cellWidth: 22, textColor: SLATE },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (d) => {
          if (d.row.index === catRows.length - 1 && d.section === "body") {
            d.cell.styles.fontStyle = "bold";
          }
        },
      });
      curY = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Advance summary on page 1 ────────────────────────────────
    if (advanceEntries.length > 0) {
      const remH = pageH - curY - 20;
      if (remH > 30) {
        doc.setFillColor(...NAVY);
        doc.rect(ML, curY, contentW, 7, "F");
        doc.setTextColor(...WHITE);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("ADVANCE TRACKER", ML + 4, curY + 4.8);
        curY += 7;

        const advRows = advanceEntries.map((e: any) => [
          pdfDate(e.entry_date),
          pdfText(e.particular || ""),
          pdfText(e.category),
          pdfAmt(Number(e.debit)),
        ]);
        advRows.push(["", "", "TOTAL ADVANCE", pdfAmt(totalAdvance)]);

        autoTable(doc, {
          startY: curY,
          head: [["Date", "Particular", "Category", "Amount"]],
          body: advRows,
          margin: { left: ML, right: MR },
          styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
          headStyles: { fillColor: SLATE, textColor: WHITE, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 70 },
            2: { cellWidth: 50 },
            3: { halign: "right", cellWidth: 26, textColor: RED, fontStyle: "bold" },
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          didParseCell: (d) => {
            if (d.row.index === advRows.length - 1 && d.section === "body") {
              d.cell.styles.fontStyle = "bold";
              d.cell.styles.fillColor = LIGHT;
            }
          },
        });
      }
    }

    // ══════════════════════════════════════════════════════════════
    // PAGE 2+ — FULL CASH LEDGER
    // ══════════════════════════════════════════════════════════════
    doc.addPage();

    // Page 2 header band
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 16, "F");
    doc.setFillColor(...TEAL);
    doc.rect(0, 16, pageW, 1.2, "F");

    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CASH LEDGER", ML, 10);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 220);
    doc.text(siteName, pageW / 2, 10, { align: "center" });
    doc.text(`Entries: ${entries.length}   |   Period: ${pdfDate(dateFrom)} to ${pdfDate(dateTo)}`, pageW - MR, 10, { align: "right" });

    // Ledger rows — oldest first (day → month → year order)
    const sortedLedger = [...ledger].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    const ledgerRows = sortedLedger.map((e: any, idx: number) => [
      String(idx + 1),
      pdfDate(e.entry_date),
      pdfText(e.particular || ""),
      pdfText(e.category),
      Number(e.credit) > 0 ? pdfAmt(Number(e.credit)) : "",
      Number(e.debit)  > 0 ? pdfAmt(Number(e.debit))  : "",
      pdfAmt(e.balance),
    ]);

    // Grand total row
    ledgerRows.push(["", "", "GRAND TOTAL", "", pdfAmt(totalCredit), pdfAmt(totalDebit), pdfAmt(balance)]);

    autoTable(doc, {
      startY: 20,
      head: [["#", "Date", "Particular", "Category", "Credit (Rs.)", "Debit (Rs.)", "Balance (Rs.)"]],
      body: ledgerRows,
      margin: { left: ML, right: MR },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        font: "helvetica",
        lineColor: BORDER,
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8,  textColor: SLATE },
        1: { cellWidth: 20 },
        2: { cellWidth: 58 },
        3: { cellWidth: 36 },
        4: { halign: "right", cellWidth: 24, textColor: GREEN, fontStyle: "bold" },
        5: { halign: "right", cellWidth: 24, textColor: RED,   fontStyle: "bold" },
        6: { halign: "right", cellWidth: 24, textColor: NAVY,  fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        const isTotal = data.row.index === ledgerRows.length - 1 && data.section === "body";
        if (isTotal) {
          data.cell.styles.fillColor = NAVY;
          data.cell.styles.textColor = WHITE;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize  = 8;
        }
        // Credit cell green, debit cell red for body rows
        if (data.section === "body" && !isTotal) {
          if (data.column.index === 4 && data.cell.text[0]) data.cell.styles.textColor = GREEN;
          if (data.column.index === 5 && data.cell.text[0]) data.cell.styles.textColor = RED;
          if (data.column.index === 6) {
            const bal = sortedLedger[data.row.index]?.balance ?? 0;
            data.cell.styles.textColor = bal >= 0 ? NAVY : RED;
          }
        }
      },
      didDrawPage: () => {
        // Re-draw top band on every new page
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pageW, 16, "F");
        doc.setFillColor(...TEAL);
        doc.rect(0, 16, pageW, 1.2, "F");
        doc.setTextColor(...WHITE);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("CASH LEDGER", ML, 10);
      },
    });

    // ── Page footers on ALL pages ────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(i, totalPages);
    }

    doc.save(`${siteName.replace(/\s+/g, "-")}-Cash-Report.pdf`);
    toast.success("Professional PDF downloaded!");
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
                <th className="w-20"></th>
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(e.id); }}>
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Edit Entry Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) { setEditOpen(false); setEditEntry(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Entry Edit Karo</DialogTitle></DialogHeader>
          <Tabs value={editType} onValueChange={(v) => setEditType(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="debit" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
                <ArrowUpRight className="size-4" /> Debit (Spent)
              </TabsTrigger>
              <TabsTrigger value="credit" className="data-[state=active]:bg-success/10 data-[state=active]:text-success">
                <ArrowDownRight className="size-4" /> Credit (Received)
              </TabsTrigger>
            </TabsList>
            <TabsContent value={editType} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editForm.entry_date} onChange={e => setEditForm({ ...editForm, entry_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount ₹</Label>
                  <Input type="number" inputMode="decimal" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Particular / विवरण</Label>
                <Textarea value={editForm.particular} onChange={e => setEditForm({ ...editForm, particular: e.target.value })} rows={3} />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateEntry.mutate()} disabled={updateEntry.isPending} className="bg-primary">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
