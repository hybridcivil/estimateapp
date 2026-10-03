import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../types";
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Settings2,
  Sliders,
  Eye,
  FileText,
  Building,
  Calendar,
  CheckCircle,
  HelpCircle,
  Layers,
} from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

type MarginPreset = "compact" | "normal" | "spacious" | "custom";
type PaddingPreset = "compact" | "normal" | "spacious";
type PageSizeOption = "A4 portrait" | "Letter portrait";

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  // Margin and Padding configuration states
  const [marginPreset, setMarginPreset] = useState<MarginPreset>("normal");
  const [customMarginMm, setCustomMarginMm] = useState<number>(14);
  const [paddingPreset, setPaddingPreset] = useState<PaddingPreset>("normal");
  const [pageSize, setPageSize] = useState<PageSizeOption>("A4 portrait");
  const [fontSizePt, setFontSizePt] = useState<number>(11);
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [isPaperPreview, setIsPaperPreview] = useState<boolean>(false);
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>("all");

  // Determine active margin in mm
  const effectiveMarginMm =
    marginPreset === "compact"
      ? 8
      : marginPreset === "normal"
      ? 14
      : marginPreset === "spacious"
      ? 20
      : customMarginMm;

  // Determine active table cell padding
  const effectiveCellPadding =
    paddingPreset === "compact"
      ? "4px 6px"
      : paddingPreset === "normal"
      ? "6px 10px"
      : "10px 14px";

  // Determine vertical section gap
  const sectionSpacingClass =
    paddingPreset === "compact"
      ? "space-y-2.5"
      : paddingPreset === "normal"
      ? "space-y-4"
      : "space-y-6";

  // Apply print CSS variables to root
  const applyPrintVariables = () => {
    document.documentElement.style.setProperty(
      "--pdf-page-margin",
      `${effectiveMarginMm}mm`
    );
    document.documentElement.style.setProperty(
      "--pdf-cell-padding",
      effectiveCellPadding
    );
    document.documentElement.style.setProperty(
      "--pdf-page-size",
      pageSize
    );
    document.documentElement.style.setProperty(
      "--pdf-base-font-size",
      `${fontSizePt}px`
    );
  };

  useEffect(() => {
    applyPrintVariables();
  }, [effectiveMarginMm, effectiveCellPadding, pageSize, fontSizePt]);

  if (!isOpen || !project) return null;

  const allEstimates = project.estimates || [];
  const estimates =
    selectedSheetFilter === "all"
      ? allEstimates
      : allEstimates.filter((e) => e.id === selectedSheetFilter);

  // Aggregated totals
  let totalCementBags = 0;
  let totalSandCft = 0;
  let totalAggCft = 0;
  let totalSteelKg = 0;
  let totalBricks = 0;
  let totalTiles = 0;

  estimates.forEach((e) => {
    const s = e.summary || {};
    if (s.cementBags) totalCementBags += s.cementBags;
    if (s.totalCementBags) totalCementBags += s.totalCementBags;

    if (s.sandVolume) totalSandCft += s.sandVolume;
    if (s.sandVol) totalSandCft += s.sandVol;
    if (s.totalSand) totalSandCft += s.totalSand;
    if (s.totalSandCft) totalSandCft += s.totalSandCft;

    if (s.aggregateVolume) totalAggCft += s.aggregateVolume;
    if (s.aggregateVol) totalAggCft += s.aggregateVol;
    if (s.totalAggCft) totalAggCft += s.totalAggCft;

    if (s.totalSteel) totalSteelKg += s.totalSteel;
    if (s.totalSteelKg) totalSteelKg += s.totalSteelKg;

    if (s.totalBricks) totalBricks += s.totalBricks;
    if (s.brickQty) totalBricks += s.brickQty;

    if (s.tiles) totalTiles += s.tiles;
  });

  const grandTotalCost = estimates.reduce((sum, e) => sum + (e.totalCost || 0), 0);

  const handlePrint = () => {
    applyPrintVariables();
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-report");
    }, 1000);
  };

  const handleExportCSV = () => {
    let csv = `ASHRAF CIVIL STUDIO - BILL OF QUANTITIES REPORT\n`;
    csv += `Project:,"${project.name}"\n`;
    csv += `Client:,"${project.client || "N/A"}"\n`;
    csv += `Location:,"${project.location || "N/A"}"\n`;
    csv += `Engineer:,"${project.engineer || "Engr. Ashraf"}"\n`;
    csv += `Date:,"${new Date().toLocaleDateString()}"\n`;
    csv += `Paper Margins:,"${effectiveMarginMm}mm",Cell Padding:,"${effectiveCellPadding}"\n\n`;

    csv += `CONSOLIDATED MATERIALS SUMMARY\n`;
    csv += `Item,Quantity,Unit,Specification\n`;
    csv += `Portland Composite Cement,${totalCementBags},Bags (50kg),~${(totalCementBags * 50).toLocaleString()} kg\n`;
    csv += `Sand (Medium & Coarse),${Math.round(totalSandCft)},cft,FM 1.5 - 2.5\n`;
    csv += `Stone Aggregate / Picket Chips,${Math.round(totalAggCft)},cft,3/4" down graded\n`;
    csv += `TMT 500W / 60G Rebar Steel,${Math.round(totalSteelKg)},kg,${(totalSteelKg / 1000).toFixed(2)} Metric Tons\n`;
    csv += `First Class Clay Bricks,${totalBricks},pcs,Standard Modular\n`;
    if (totalTiles > 0) csv += `Floor / Wall Ceramic Tiles,${totalTiles},pcs,Vitrified / Porcelain\n`;
    csv += `\n`;

    csv += `ITEMIZED ESTIMATES BREAKDOWN\n`;
    csv += `Estimate Sheet Name,Module Type,Date,Cost (BDT)\n`;
    estimates.forEach((e) => {
      csv += `"${e.name}","${e.type.toUpperCase()}","${new Date(e.date).toLocaleDateString()}","${Math.round(e.totalCost)}"\n`;
    });
    csv += `\nGRAND TOTAL ESTIMATED COST (BDT),,,${Math.round(grandTotalCost)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_boq_report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="report-modal-card bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header & Actions Bar (Hidden during print) */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00c2c7]" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Consolidated BOQ & Materials Report
              </h3>
              <p className="text-[10px] text-[#8ba3c1]">
                Project: <strong className="text-white">{project.name}</strong> •{" "}
                {estimates.length} sheets included
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Toggle Margin/Padding Settings Bar */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                showSettings
                  ? "bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/50"
                  : "bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white border border-[#2d4a6a]"
              }`}
              title="Configure PDF Margins & Table Paddings"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>PDF Margins & Paddings</span>
            </button>

            {/* Paper Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPaperPreview(!isPaperPreview)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isPaperPreview
                  ? "bg-[#f5a623] text-[#0f1c2e]"
                  : "bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white border border-[#2d4a6a]"
              }`}
              title="Toggle White A4 Paper Sheet Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paper Preview</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-[#243b55] hover:bg-[#2d4a6a] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border border-[#2d4a6a]"
              title="Export as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span className="hidden md:inline">CSV</span>
            </button>

            {/* Main Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-[#00c2c7]/20 active:scale-95"
              title="Generate PDF or Print Document"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save PDF / Print</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="text-[#8ba3c1] hover:text-white transition p-1.5 hover:bg-[#243b55] rounded-lg ml-1"
              title="Close Report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Margin, Padding & Layout Controls Panel (Hidden during print) */}
        {showSettings && (
          <div className="bg-[#121c2d] border-b border-[#2d4a6a] px-4 py-2.5 text-xs text-[#8ba3c1] print:hidden shrink-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Margin Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#00c2c7]" />
                  PDF Margin:
                </span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => setMarginPreset("compact")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      marginPreset === "compact"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Compact (8mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginPreset("normal")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      marginPreset === "normal"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Normal (14mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginPreset("spacious")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      marginPreset === "spacious"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Spacious (20mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginPreset("custom")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      marginPreset === "custom"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {marginPreset === "custom" && (
                  <div className="flex items-center gap-1 bg-[#1a2b42] border border-[#2d4a6a] px-2 py-0.5 rounded text-[11px]">
                    <input
                      type="number"
                      min={5}
                      max={35}
                      value={customMarginMm}
                      onChange={(e) => setCustomMarginMm(Math.max(5, Math.min(35, Number(e.target.value))))}
                      className="w-9 bg-transparent text-white text-center outline-none font-bold"
                    />
                    <span className="text-[10px] text-[#8ba3c1]">mm</span>
                  </div>
                )}
              </div>

              {/* Table Cell Padding Density */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">Table Padding:</span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => setPaddingPreset("compact")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      paddingPreset === "compact"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Tight (4px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaddingPreset("normal")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      paddingPreset === "normal"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Balanced (6px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaddingPreset("spacious")}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      paddingPreset === "spacious"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Roomy (10px)
                  </button>
                </div>
              </div>

              {/* Paper Size & Font Size */}
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSizeOption)}
                  className="bg-[#1a2b42] text-white border border-[#2d4a6a] rounded px-2 py-1 text-[10px] outline-none"
                >
                  <option value="A4 portrait">A4 Paper (210×297mm)</option>
                  <option value="Letter portrait">Letter (8.5×11in)</option>
                </select>

                <select
                  value={fontSizePt}
                  onChange={(e) => setFontSizePt(Number(e.target.value))}
                  className="bg-[#1a2b42] text-white border border-[#2d4a6a] rounded px-2 py-1 text-[10px] outline-none"
                  title="PDF Base Font Size"
                >
                  <option value={10}>Font: 10 pt (Compact)</option>
                  <option value={11}>Font: 11 pt (Standard)</option>
                  <option value={12}>Font: 12 pt (Large)</option>
                </select>

                {/* Filter Sheets */}
                {allEstimates.length > 1 && (
                  <select
                    value={selectedSheetFilter}
                    onChange={(e) => setSelectedSheetFilter(e.target.value)}
                    className="bg-[#1a2b42] text-[#00c2c7] border border-[#2d4a6a] rounded px-2 py-1 text-[10px] outline-none max-w-[150px] truncate"
                    title="Filter sheets to include"
                  >
                    <option value="all">All Sheets ({allEstimates.length})</option>
                    {allEstimates.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="text-[10px] text-[#8ba3c1]/80 flex items-center justify-between border-t border-[#2d4a6a]/40 pt-1.5">
              <span>
                Current PDF Print Setup: Margins: <strong>{effectiveMarginMm}mm</strong> • Cell Padding:{" "}
                <strong>{effectiveCellPadding}</strong> • Size: <strong>{pageSize}</strong> • Clean page breaks active
              </span>
              <span className="text-[#00c2c7]">
                Click "Save PDF / Print" to export without cutoffs
              </span>
            </div>
          </div>
        )}

        {/* Printable Report Content Body */}
        <div
          className={`flex-1 overflow-y-auto ${
            isPaperPreview
              ? "p-4 sm:p-8 bg-[#0a121e] flex justify-center"
              : "p-4 sm:p-6 bg-[#0f1c2e]"
          } print:bg-white print:text-black print:p-0 print:overflow-visible`}
        >
          <div
            className={`report-printable-content ${sectionSpacingClass} ${
              isPaperPreview
                ? "bg-white text-slate-900 shadow-2xl rounded-sm max-w-[210mm] w-full border border-gray-300 transition-all"
                : "text-[#f1f5f9] print:text-black print:bg-white"
            }`}
            style={{
              padding: isPaperPreview ? `${effectiveMarginMm}mm` : undefined,
            }}
          >
            {/* Document Header */}
            <div className="border-b-2 border-[#2d4a6a] print:border-slate-800 pb-3 sm:pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[#00c2c7] print:text-blue-800 uppercase mb-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>ASHRAF CIVIL STUDIO • CIVIL & STRUCTURAL ENGINEERING</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white print:text-slate-900 tracking-tight">
                  Bill of Quantities (BOQ) & Estimate Summary
                </h1>
                <p className="text-xs text-[#8ba3c1] print:text-slate-600 mt-0.5">
                  Consolidated Project Engineering Takeoff & Material Rate Rollup
                </p>
              </div>

              <div className="text-xs text-left sm:text-right text-[#8ba3c1] print:text-slate-600 space-y-1 shrink-0 bg-[#152033] print:bg-slate-100 p-2 rounded-lg border border-[#2d4a6a] print:border-slate-300">
                <div className="flex items-center sm:justify-end gap-1.5 text-[11px]">
                  <Calendar className="w-3 h-3 text-[#f5a623]" />
                  <span>Report Date:</span>
                  <strong className="text-white print:text-slate-900">
                    {new Date().toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                </div>
                <div>
                  Lead Engineer:{" "}
                  <strong className="text-white print:text-slate-900">
                    {project.engineer || "Engr. Ashraf"}
                  </strong>
                </div>
                <div className="text-[10px] text-[#00c2c7] print:text-blue-700 font-mono">
                  Code: BNBC / ACI 318 Standard
                </div>
              </div>
            </div>

            {/* Project Details Grid Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-[#152033] print:bg-slate-50 border border-[#2d4a6a] print:border-slate-300 rounded-xl p-3 print:p-2.5">
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Project Title:
                </span>
                <strong className="text-white print:text-slate-900 text-sm block truncate">
                  {project.name}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Client / Owner:
                </span>
                <strong className="text-white print:text-slate-900 block truncate">
                  {project.client || "Client"}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Site Location:
                </span>
                <strong className="text-white print:text-slate-900 block truncate">
                  {project.location || "Bangladesh"}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Included Sheets:
                </span>
                <strong className="text-white print:text-slate-900 block">
                  {estimates.length} Calculation File(s)
                </strong>
              </div>
            </div>

            {/* Consolidated Structural Materials Table */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Consolidated Structural Materials Schedule
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500">
                  Aggregated Quantities
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: effectiveCellPadding }}>Material Description</th>
                      <th style={{ padding: effectiveCellPadding }}>Unit</th>
                      <th style={{ padding: effectiveCellPadding }} className="text-right">Total Net Quantity</th>
                      <th style={{ padding: effectiveCellPadding }} className="text-right">Technical Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                        Portland Composite Cement (PCC)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                        Bags (50 kg)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {totalCementBags.toLocaleString()} bags
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                        ~{(totalCementBags * 50).toLocaleString()} kg total
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                        Coarse & Medium Sand (Sylhet + Local)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                        cft (Cu. Ft)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalSandCft).toLocaleString()} cft
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                        Fineness Modulus (FM 1.5 - 2.5)
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                        Crushed Stone Aggregate / Picket Chips
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                        cft (Cu. Ft)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalAggCft).toLocaleString()} cft
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                        3/4" down graded coarse aggregate
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                        High-Yield Strength Deformed Rebar (500W / 60G)
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                        kg
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalSteelKg).toLocaleString()} kg
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                        {(totalSteelKg / 1000).toFixed(2)} Metric Tons
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                        First Class Burnt Clay Bricks
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                        Pieces
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {totalBricks.toLocaleString()} pcs
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                        Standard 9.5" × 4.5" × 2.75"
                      </td>
                    </tr>
                    {totalTiles > 0 && (
                      <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                          Floor / Wall Ceramic & Vitrified Tiles
                        </td>
                        <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600">
                          Pieces
                        </td>
                        <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                          {totalTiles.toLocaleString()} pcs
                        </td>
                        <td style={{ padding: effectiveCellPadding }} className="text-right text-[11px] text-[#8ba3c1] print:text-slate-600">
                          Including skirting & wastage
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Itemized Sheets Table */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Itemized Estimate Sheet Breakdown ({estimates.length})
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500">
                  Individual Module Takeoffs
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: effectiveCellPadding }}>Item #</th>
                      <th style={{ padding: effectiveCellPadding }}>Estimate Sheet Name</th>
                      <th style={{ padding: effectiveCellPadding }}>Component Type</th>
                      <th style={{ padding: effectiveCellPadding }}>Calculation Date</th>
                      <th style={{ padding: effectiveCellPadding }} className="text-right">Estimated Cost (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {estimates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-[#8ba3c1] print:text-slate-500">
                          No estimate sheets saved yet for this project.
                        </td>
                      </tr>
                    ) : (
                      estimates.map((e, idx) => (
                        <tr key={e.id} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: effectiveCellPadding }} className="font-mono text-[#8ba3c1] print:text-slate-500 text-[11px]">
                            {idx + 1}.
                          </td>
                          <td style={{ padding: effectiveCellPadding }} className="font-semibold text-white print:text-slate-900">
                            {e.name}
                          </td>
                          <td style={{ padding: effectiveCellPadding }} className="uppercase font-mono text-[10px] text-[#00c2c7] print:text-blue-800 font-bold">
                            {e.type}
                          </td>
                          <td style={{ padding: effectiveCellPadding }} className="text-[#8ba3c1] print:text-slate-600 text-[11px]">
                            {new Date(e.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: effectiveCellPadding }} className="text-right font-bold text-[#2ecc71] print:text-slate-900 font-mono">
                            ৳ {Math.round(e.totalCost).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td colSpan={4} style={{ padding: effectiveCellPadding }} className="text-right text-white print:text-slate-900 font-bold">
                        Consolidated Project Grand Total Estimated Cost:
                      </td>
                      <td style={{ padding: effectiveCellPadding }} className="text-right text-sm text-[#2ecc71] print:text-slate-950 font-black font-mono">
                        ৳ {Math.round(grandTotalCost).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Engineer Signature & Client Approval Block */}
            <div className="pt-6 sm:pt-8 print:pt-6 mt-4 border-t border-[#2d4a6a]/60 print:border-slate-300 print-avoid-break">
              <div className="grid grid-cols-2 gap-6 sm:gap-12 text-center text-xs text-[#8ba3c1] print:text-slate-700">
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[220px] border-b-2 border-dashed border-[#2d4a6a] print:border-slate-400 pb-1 mb-2">
                    <div className="font-bold text-white print:text-slate-900 text-sm">
                      {project.engineer || "Engr. Ashraf"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-[#f1f5f9] print:text-slate-800">
                    Lead Structural & Civil Engineer
                  </div>
                  <div className="text-[9px] text-[#8ba3c1] print:text-slate-500">
                    Signature, Seal & Date
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[220px] border-b-2 border-dashed border-[#2d4a6a] print:border-slate-400 pb-1 mb-2">
                    <div className="font-bold text-white print:text-slate-900 text-sm">
                      {project.client || "Client Representative"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-[#f1f5f9] print:text-slate-800">
                    Client Verification & Work Authorization
                  </div>
                  <div className="text-[9px] text-[#8ba3c1] print:text-slate-500">
                    Signature, Seal & Date
                  </div>
                </div>
              </div>

              {/* Bottom Copyright & Verification Footer */}
              <div className="mt-6 pt-3 border-t border-[#2d4a6a]/40 print:border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#8ba3c1] print:text-slate-500">
                <div>
                  Generated via <strong>Ashraf Civil Studio</strong> • Professional Civil Engineering Suite
                </div>
                <div>
                  Designed by <strong className="text-white print:text-slate-800">MD. ASHRAFUL ISLAM</strong> • Page 1 of 1
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
