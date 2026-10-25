import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../types";
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Sliders,
  Eye,
  Building,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Unlink,
  Layers,
  Boxes,
  Hammer,
  ShieldCheck,
  Building2,
  HardHat,
  Sparkles,
} from "lucide-react";
import {
  computeFullProjectBreakdown,
  FullProjectBreakdown,
  extractEstimateMaterials,
} from "../utils/reportBreakdown";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export type PageSizeOption = "a4" | "letter" | "legal";
export type PageOrientation = "portrait" | "landscape";
export type PaddingDensity = "compact" | "normal" | "spacious";

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  // Page Size: A4, Letter, Legal
  const [pageSize, setPageSize] = useState<PageSizeOption>("a4");

  // Page Orientation: portrait or landscape
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");

  // Specific Margin Settings (Top, Bottom, Left, Right in mm)
  const [marginTop, setMarginTop] = useState<number>(15);
  const [marginBottom, setMarginBottom] = useState<number>(15);
  const [marginLeft, setMarginLeft] = useState<number>(15);
  const [marginRight, setMarginRight] = useState<number>(15);

  // Link all 4 margins together
  const [isMarginsLinked, setIsMarginsLinked] = useState<boolean>(false);

  // Table cell padding & spacing density
  const [paddingDensity, setPaddingDensity] = useState<PaddingDensity>("normal");

  // Base font size (pt)
  const [fontSizePt, setFontSizePt] = useState<number>(10);

  // Active section view filter in modal preview
  const [activeTabFilter, setActiveTabFilter] = useState<string>("all");

  // UI state
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [isPaperPreview, setIsPaperPreview] = useState<boolean>(true);
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>("all");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Handle margin change with link support
  const handleMarginChange = (
    side: "top" | "bottom" | "left" | "right",
    val: number
  ) => {
    const clamped = Math.max(0, Math.min(60, isNaN(val) ? 0 : val));
    if (isMarginsLinked) {
      setMarginTop(clamped);
      setMarginBottom(clamped);
      setMarginLeft(clamped);
      setMarginRight(clamped);
    } else {
      if (side === "top") setMarginTop(clamped);
      if (side === "bottom") setMarginBottom(clamped);
      if (side === "left") setMarginLeft(clamped);
      if (side === "right") setMarginRight(clamped);
    }
  };

  // Step margin helper
  const stepMargin = (
    side: "top" | "bottom" | "left" | "right",
    delta: number
  ) => {
    let current = 15;
    if (side === "top") current = marginTop;
    if (side === "bottom") current = marginBottom;
    if (side === "left") current = marginLeft;
    if (side === "right") current = marginRight;
    handleMarginChange(side, current + delta);
  };

  // Quick Margin Preset applicator
  const applyMarginPreset = (
    preset: "standard" | "compact" | "narrow" | "spacious" | "binding" | "zero"
  ) => {
    switch (preset) {
      case "standard":
        setMarginTop(15);
        setMarginBottom(15);
        setMarginLeft(15);
        setMarginRight(15);
        break;
      case "compact":
        setMarginTop(10);
        setMarginBottom(10);
        setMarginLeft(10);
        setMarginRight(10);
        break;
      case "narrow":
        setMarginTop(8);
        setMarginBottom(8);
        setMarginLeft(8);
        setMarginRight(8);
        break;
      case "spacious":
        setMarginTop(22);
        setMarginBottom(22);
        setMarginLeft(20);
        setMarginRight(20);
        break;
      case "binding":
        setMarginTop(15);
        setMarginBottom(15);
        setMarginLeft(25);
        setMarginRight(12);
        break;
      case "zero":
        setMarginTop(0);
        setMarginBottom(0);
        setMarginLeft(0);
        setMarginRight(0);
        break;
    }
  };

  // Cell padding CSS value
  const cellPaddingCss =
    paddingDensity === "compact"
      ? "3px 6px"
      : paddingDensity === "spacious"
      ? "7px 11px"
      : "5px 8px";

  // Section spacing class
  const sectionSpacingClass =
    paddingDensity === "compact"
      ? "space-y-3"
      : paddingDensity === "spacious"
      ? "space-y-6"
      : "space-y-4";

  // Inject dynamic print style tag when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const styleId = "dynamic-pdf-page-rules";
    let tag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = styleId;
      document.head.appendChild(tag);
    }

    const pageKeyword =
      pageSize === "a4" ? "A4" : pageSize === "letter" ? "letter" : "legal";

    tag.innerHTML = `
      @media print {
        @page {
          size: ${pageKeyword} ${orientation} !important;
          margin-top: ${marginTop}mm !important;
          margin-bottom: ${marginBottom}mm !important;
          margin-left: ${marginLeft}mm !important;
          margin-right: ${marginRight}mm !important;
        }
        :root {
          --pdf-margin-top: ${marginTop}mm;
          --pdf-margin-bottom: ${marginBottom}mm;
          --pdf-margin-left: ${marginLeft}mm;
          --pdf-margin-right: ${marginRight}mm;
          --pdf-cell-padding: ${cellPaddingCss};
          --pdf-base-font-size: ${fontSizePt}px;
        }
      }
    `;

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, [
    isOpen,
    pageSize,
    orientation,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    cellPaddingCss,
    fontSizePt,
  ]);

  if (!isOpen || !project) return null;

  const allEstimates = project.estimates || [];
  const estimates =
    selectedSheetFilter === "all"
      ? allEstimates
      : allEstimates.filter((e) => e.id === selectedSheetFilter);

  // 1. Resolve rates from project settings, estimate data, or fallback defaults
  const pRates = project.rates || {};
  let defaultCementRate = pRates.cementRate || 550;
  let defaultSandRate = pRates.sandRate || 45;
  let defaultAggRate = pRates.aggRate || pRates.stoneRate || 120;
  let defaultSteelRate = pRates.steelRate || 95;
  let defaultBrickRate = pRates.brickRate || 15;
  let defaultTileRate = pRates.tileRate || 180;

  estimates.forEach((e) => {
    const r = e.data?.rates || {};
    if (r.cementRate) defaultCementRate = r.cementRate;
    if (r.sandRate) defaultSandRate = r.sandRate;
    if (r.aggRate || r.stoneRate) defaultAggRate = r.aggRate || r.stoneRate;
    if (r.steelRate) defaultSteelRate = r.steelRate;
    if (r.brickRate) defaultBrickRate = r.brickRate;
    if (e.data?.tilePrice || r.tileRate) defaultTileRate = e.data?.tilePrice || r.tileRate;
  });

  const effectiveRates = {
    cementRate: defaultCementRate,
    sandRate: defaultSandRate,
    aggRate: defaultAggRate,
    steelRate: defaultSteelRate,
    brickRate: defaultBrickRate,
    tileRate: defaultTileRate,
  };

  // Compute the comprehensive project breakdown with effective project rates
  const breakdown: FullProjectBreakdown = computeFullProjectBreakdown(estimates, effectiveRates);

  const { allocations, footings, situPiles, sandPiles, columns, beams, slabs, stairs, bricks, tiles, steelBreakdown, totals } = breakdown;

  // Dimensions for paper aspect ratio in preview mode
  const getPaperDimensionsClass = () => {
    if (orientation === "portrait") {
      switch (pageSize) {
        case "a4":
          return "max-w-[210mm] min-h-[297mm]";
        case "letter":
          return "max-w-[216mm] min-h-[279mm]";
        case "legal":
          return "max-w-[216mm] min-h-[356mm]";
      }
    } else {
      switch (pageSize) {
        case "a4":
          return "max-w-[297mm] min-h-[210mm]";
        case "letter":
          return "max-w-[279mm] min-h-[216mm]";
        case "legal":
          return "max-w-[356mm] min-h-[216mm]";
      }
    }
  };

  // Generate full, standalone, high-fidelity printable HTML string
  const generateStandaloneHtml = (includeAutoPrint: boolean = false) => {
    const pageKeyword =
      pageSize === "a4" ? "A4" : pageSize === "letter" ? "letter" : "legal";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${(project.client || "Client").trim()} - Estimate - ${project.name.trim()} - Detailed BOQ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageKeyword} ${orientation};
      margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${fontSizePt}px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 0;
      margin: 0;
    }
    .header-box {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-sub {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #007791;
      margin-bottom: 2px;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .doc-subtitle {
      font-size: 10px;
      color: #475569;
      margin-top: 1px;
    }
    .meta-box {
      text-align: right;
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .project-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 9px;
      margin-bottom: 12px;
      font-size: 9.5px;
    }
    .grid-label {
      font-size: 8px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 1px;
    }
    .grid-val {
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
    }
    .section-badge {
      font-size: 8.5px;
      font-weight: 700;
      background: #e2e8f0;
      color: #1e293b;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 10px;
      page-break-inside: auto;
      break-inside: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${fontSizePt}px;
      text-align: left;
    }
    thead {
      background: #f1f5f9;
      display: table-header-group;
    }
    th {
      padding: ${cellPaddingCss};
      font-weight: 700;
      color: #1e293b;
      border-bottom: 1.5px solid #475569;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: ${cellPaddingCss};
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
      font-size: ${fontSizePt}px;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tbody tr:nth-child(even) {
      background-color: #fafbfc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-bold { font-weight: 700; }
    tfoot {
      background: #f1f5f9;
      font-weight: 800;
      border-top: 1.5px solid #0f172a;
      display: table-footer-group;
    }
    tfoot td {
      padding: ${cellPaddingCss};
      border-bottom: none;
    }
    .grand-total-val {
      font-size: 11.5px;
      color: #047857;
      font-weight: 800;
    }
    .materials-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .mat-card {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 7px 9px;
      background: #f8fafc;
    }
    .mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .mat-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .mat-rate {
      font-size: 8.5px;
      font-family: 'JetBrains Mono', monospace;
      color: #64748b;
    }
    .mat-qty {
      font-size: 14px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #007791;
    }
    .mat-cost {
      font-size: 10.5px;
      font-weight: 800;
      color: #047857;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 2px;
    }
    .mat-sub {
      font-size: 8px;
      color: #64748b;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signatures-block {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-line {
      width: 100%;
      max-width: 220px;
      margin: 0 auto 4px auto;
      border-bottom: 1.5px dashed #475569;
      padding-bottom: 4px;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-title {
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
    }
    .sign-sub {
      font-size: 8px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
  ${
    includeAutoPrint
      ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>`
      : ""
  }
</head>
<body>
  <div class="header-box">
    <div>
      <div class="brand-sub">DOLPHIN BOX • CIVIL & STRUCTURAL ENGINEERING</div>
      <div class="doc-title">Bill of Quantities (BOQ) & Component Takeoff</div>
      <div class="doc-subtitle">Complete Structural Elements Breakdown (Footings, Columns, Beams, Slabs, Stairs, Bricks) & Separated Materials Schedule</div>
    </div>
    <div class="meta-box">
      <div>Report Date: <strong>${new Date().toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</strong></div>
      <div>Lead Engineer: <strong>${project.engineer || "Anonymous"}</strong></div>
      <div>Standard: <strong>BNBC / ACI 318 Standard</strong></div>
      <div>Page: <strong>${pageSize.toUpperCase()} ${orientation.toUpperCase()} (T:${marginTop} B:${marginBottom} L:${marginLeft} R:${marginRight}mm)</strong></div>
    </div>
  </div>

  <div class="project-grid">
    <div>
      <div class="grid-label">Project Name</div>
      <div class="grid-val">${project.name}</div>
    </div>
    <div>
      <div class="grid-label">Client / Authority</div>
      <div class="grid-val">${project.client || "Client Representative"}</div>
    </div>
    <div>
      <div class="grid-label">Project Site Location</div>
      <div class="grid-val">${project.location || "Bangladesh"}</div>
    </div>
    <div>
      <div class="grid-label">Building Storeys</div>
      <div class="grid-val">${project.stories || 1} Floor(s)${(project.stories || 1) > 1 ? ` (×${project.stories} Multiplied)` : ""}</div>
    </div>
    <div>
      <div class="grid-label">Takeoff File Sheets</div>
      <div class="grid-val">${estimates.length} Saved Module(s)</div>
    </div>
  </div>

  <!-- SECTION 1: CONSOLIDATED MATERIALS SUMMARY -->
  <div class="section-title">
    <span>1. Consolidated Structural Materials Schedule</span>
    <span class="section-badge">Master Totals</span>
  </div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 28px" class="text-center">#</th>
          <th>Material Description & Specification</th>
          <th class="text-center" style="width: 75px">Unit</th>
          <th class="text-right" style="width: 95px">Unit Price (৳)</th>
          <th class="text-right" style="width: 100px">Total Quantity</th>
          <th class="text-right" style="width: 120px">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">1</td>
          <td class="font-bold">
            Portland Composite Cement (PCC)
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Standard 50 kg bags (BDS EN 197-1 CEM II / ACI 318)</div>
          </td>
          <td class="text-center">Bag</td>
          <td class="text-right font-mono">৳ ${defaultCementRate.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">${totals.cementBags.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${(totals.cementBags * defaultCementRate).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">2</td>
          <td class="font-bold">
            Coarse & Medium Sand (Sylhet FM 2.5 + Local FM 1.5)
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Clean graded sand for concrete, mortar & plastering</div>
          </td>
          <td class="text-center">cft</td>
          <td class="text-right font-mono">৳ ${defaultSandRate}</td>
          <td class="text-right font-bold font-mono">${Math.round(totals.sandCft).toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totals.sandCft * defaultSandRate).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">3</td>
          <td class="font-bold">
            Crushed Stone Aggregate / Picket Chips
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">3/4" down-graded angular coarse aggregate</div>
          </td>
          <td class="text-center">cft</td>
          <td class="text-right font-mono">৳ ${defaultAggRate}</td>
          <td class="text-right font-bold font-mono">${Math.round(totals.aggCft).toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totals.aggCft * defaultAggRate).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">4</td>
          <td class="font-bold">
            High-Yield Strength Deformed Rebar Steel
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Grade 500W / 60G TMT Rebar (${totals.steelTons} Metric Tons)</div>
          </td>
          <td class="text-center">kg</td>
          <td class="text-right font-mono">৳ ${defaultSteelRate}</td>
          <td class="text-right font-bold font-mono">${totals.steelKg.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totals.steelKg * defaultSteelRate).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">5</td>
          <td class="font-bold">
            First Class Burnt Clay Bricks
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Standard Modular 9.5" × 4.5" × 2.75"</div>
          </td>
          <td class="text-center">Pcs</td>
          <td class="text-right font-mono">৳ ${defaultBrickRate}</td>
          <td class="text-right font-bold font-mono">${totals.bricksPcs.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totals.bricksPcs * defaultBrickRate).toLocaleString("en-IN")}</td>
        </tr>
        ${
          totals.tilesPcs > 0
            ? `<tr>
          <td class="text-center font-mono" style="color: #64748b;">6</td>
          <td class="font-bold">
            Floor & Wall Ceramic / Vitrified Tiles
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Finished tile units including cuts, skirting & wastage</div>
          </td>
          <td class="text-center">Pcs</td>
          <td class="text-right font-mono">৳ ${defaultTileRate}</td>
          <td class="text-right font-bold font-mono">${totals.tilesPcs.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totals.tilesPcs * defaultTileRate).toLocaleString("en-IN")}</td>
        </tr>`
            : ""
        }
        ${
          totals.boringCost > 0
            ? `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${totals.tilesPcs > 0 ? 7 : 6}</td>
          <td class="font-bold">
            Cast-in-Situ / Sand Pile Machine Boring & Rig Drilling
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Rotary / wash boring, bentonite slurry circulation & rig mobilization</div>
          </td>
          <td class="text-center">Job</td>
          <td class="text-right font-mono">—</td>
          <td class="text-right font-bold font-mono">1 Job</td>
          <td class="text-right font-bold font-mono">৳ ${totals.boringCost.toLocaleString("en-IN")}</td>
        </tr>`
            : ""
        }
        ${
          totals.ancillaryCost > 0
            ? `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${totals.tilesPcs > 0 ? (totals.boringCost > 0 ? 8 : 7) : (totals.boringCost > 0 ? 7 : 6)}</td>
          <td class="font-bold">
            Substructure Soling (BFS), Sand Bedding, Tile Skirting & Mortar
            <div style="font-size: 8px; font-weight: normal; color: #64748b;">Footing flat brick soling, sand cushion, tile adhesive mortar, pointing & edge finishing</div>
          </td>
          <td class="text-center">Itemized</td>
          <td class="text-right font-mono">—</td>
          <td class="text-right font-bold font-mono">Lump Sum</td>
          <td class="text-right font-bold font-mono">৳ ${totals.ancillaryCost.toLocaleString("en-IN")}</td>
        </tr>`
            : ""
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="text-right font-bold">
            Consolidated Materials & Works Subtotal Cost:
            <div style="font-size: 8px; font-weight: normal; color: #475569;">
              [Direct Raw Materials: ৳ ${totals.rawMaterialsCost.toLocaleString("en-IN")}${totals.boringCost > 0 ? ` + Pile Boring: ৳ ${totals.boringCost.toLocaleString("en-IN")}` : ""}${totals.ancillaryCost > 0 ? ` + Soling, Skirting & Finishing: ৳ ${totals.ancillaryCost.toLocaleString("en-IN")}` : ""}]
            </div>
          </td>
          <td class="text-right grand-total-val font-mono">৳ ${totals.grandTotalCost.toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- SECTION 2: COMPONENT VS MATERIAL ALLOCATION MATRIX -->
  <div class="section-title">
    <span>2. Material Allocation Matrix by Structural Component</span>
    <span class="section-badge">Cross-Breakdown</span>
  </div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Structural Element</th>
          <th class="text-right" style="width: 75px">Wet Conc (cft)</th>
          <th class="text-right" style="width: 75px">Cement (Bags)</th>
          <th class="text-right" style="width: 65px">Sand (cft)</th>
          <th class="text-right" style="width: 65px">Stone (cft)</th>
          <th class="text-right" style="width: 70px">Steel (kg)</th>
          <th class="text-right" style="width: 65px">Bricks (Pcs)</th>
          <th class="text-right" style="width: 60px">Tiles (Pcs)</th>
          <th class="text-right" style="width: 95px">Subtotal (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${allocations
          .map(
            (a) => `<tr>
          <td class="font-bold">${a.label} <span style="font-size: 8px; color: #64748b; font-weight: normal;">(${a.count > 0 ? `${a.count.toLocaleString()} ${a.unit}` : ""})</span></td>
          <td class="text-right font-mono">${a.concreteVolCft > 0 ? a.concreteVolCft.toLocaleString() : "—"}</td>
          <td class="text-right font-mono font-bold">${a.cementBags > 0 ? a.cementBags.toLocaleString() : "—"}</td>
          <td class="text-right font-mono">${a.sandCft > 0 ? Math.round(a.sandCft).toLocaleString() : "—"}</td>
          <td class="text-right font-mono">${a.aggCft > 0 ? Math.round(a.aggCft).toLocaleString() : "—"}</td>
          <td class="text-right font-mono font-bold">${a.steelKg > 0 ? a.steelKg.toLocaleString() : "—"}</td>
          <td class="text-right font-mono">${a.bricksPcs > 0 ? a.bricksPcs.toLocaleString() : "—"}</td>
          <td class="text-right font-mono">${a.tilesPcs > 0 ? a.tilesPcs.toLocaleString() : "—"}</td>
          <td class="text-right font-mono font-bold">৳ ${a.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td class="font-bold">Total Material Quantities:</td>
          <td class="text-right font-mono font-bold">${totals.concreteVolCft.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.cementBags.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${Math.round(totals.sandCft).toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${Math.round(totals.aggCft).toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.steelKg.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.bricksPcs.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.tilesPcs.toLocaleString()}</td>
          <td class="text-right font-mono grand-total-val">৳ ${totals.grandTotalCost.toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- SECTION 3: REBAR DIAMETER BREAKDOWN -->
  ${
    steelBreakdown.length > 0
      ? `<div class="section-title avoid-break">
    <span>3. Deformed Rebar Steel Reinforcement Breakdown (${totals.steelTons} Metric Tons)</span>
    <span class="section-badge">Grade 500W / 60G</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 30px" class="text-center">#</th>
          <th>Rebar Bar Size & Diameter</th>
          <th class="text-right" style="width: 100px">Weight (kg)</th>
          <th class="text-right" style="width: 100px">Tonnage (Metric Tons)</th>
          <th class="text-right" style="width: 80px">Share (%)</th>
          <th class="text-right" style="width: 90px">Rate (৳/kg)</th>
          <th class="text-right" style="width: 115px">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${steelBreakdown
          .map(
            (st, i) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${i + 1}</td>
          <td class="font-bold">${st.dia} mmø Deformed Rebar <span style="font-size: 8px; color: #64748b; font-weight: normal;">(ASTM #${Math.round(st.dia / 3.175)})</span></td>
          <td class="text-right font-mono font-bold">${st.kg.toLocaleString()} kg</td>
          <td class="text-right font-mono">${st.tons} MT</td>
          <td class="text-right font-mono">${st.pct}%</td>
          <td class="text-right font-mono">৳ ${defaultSteelRate}</td>
          <td class="text-right font-mono font-bold">৳ ${st.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="text-right font-bold">Total Steel Rebar Quantity:</td>
          <td class="text-right font-mono font-bold">${totals.steelKg.toLocaleString()} kg</td>
          <td class="text-right font-mono font-bold">${totals.steelTons} MT</td>
          <td class="text-right font-mono font-bold">100.0%</td>
          <td class="text-right font-mono">৳ ${defaultSteelRate}</td>
          <td class="text-right font-mono grand-total-val">৳ ${Math.round(totals.steelKg * defaultSteelRate).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 4: FOUNDATION / FOOTINGS BREAKDOWN -->
  ${
    footings.length > 0
      ? `<div class="section-title avoid-break">
    <span>4. Foundation Isolated Footings Breakdown Schedule</span>
    <span class="section-badge">${footings.length} Mark(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Footing Mark</th>
          <th style="width: 110px">Size (L×B×Th)</th>
          <th class="text-center" style="width: 45px">Nos</th>
          <th style="width: 60px">Mix</th>
          <th>Reinforcement (Bottom / Top)</th>
          <th class="text-right" style="width: 55px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 85px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${footings
          .map(
            (f) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${f.sl}</td>
          <td class="font-bold">${f.name}</td>
          <td class="font-mono text-[9px]">${f.dimensions}</td>
          <td class="text-center font-mono font-bold">${f.totalNos}</td>
          <td class="font-mono text-[9px]">${f.mix}</td>
          <td style="font-size: 8.5px; color: #334155;">${f.rebars}</td>
          <td class="text-right font-mono">${f.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${f.cementBags}</td>
          <td class="text-right font-mono">${f.sandCft}</td>
          <td class="text-right font-mono">${f.aggCft}</td>
          <td class="text-right font-mono font-bold">${f.steelKg}</td>
          <td class="text-right font-mono font-bold">৳ ${f.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="font-bold">Total Footings Subtotal:</td>
          <td class="text-center font-mono font-bold">${footings.reduce((sum, f) => sum + f.totalNos, 0)}</td>
          <td colspan="2"></td>
          <td class="text-right font-mono font-bold">${footings.reduce((sum, f) => sum + f.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${footings.reduce((sum, f) => sum + f.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${footings.reduce((sum, f) => sum + f.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${footings.reduce((sum, f) => sum + f.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${footings.reduce((sum, f) => sum + f.steelKg, 0)}</td>
          <td class="text-right font-mono grand-total-val">৳ ${footings.reduce((sum, f) => sum + f.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 4B: CAST-IN-SITU BORED PILES BREAKDOWN -->
  ${
    situPiles.length > 0
      ? `<div class="section-title avoid-break">
    <span>4B. Deep Foundation: Cast-in-Situ Bored Piles Schedule</span>
    <span class="section-badge">${situPiles.length} Item(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Pile Mark / Name</th>
          <th style="width: 95px">Size (Dia × L)</th>
          <th class="text-center" style="width: 45px">Nos</th>
          <th style="width: 55px">Mix</th>
          <th>Cage Reinforcement (Main & Spiral)</th>
          <th class="text-right" style="width: 50px">Wet cft</th>
          <th class="text-right" style="width: 50px">Cement</th>
          <th class="text-right" style="width: 50px">Sand</th>
          <th class="text-right" style="width: 50px">Stone</th>
          <th class="text-right" style="width: 55px">Steel kg</th>
          <th class="text-right" style="width: 75px">Boring (BDT)</th>
          <th class="text-right" style="width: 85px">Total (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${situPiles
          .map(
            (p) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${p.sl}</td>
          <td class="font-bold">${p.name}</td>
          <td class="font-mono text-[9px]">${p.dimensions}</td>
          <td class="text-center font-mono font-bold">${p.pileNos}</td>
          <td class="font-mono text-[9px]">${p.mix}</td>
          <td style="font-size: 8.5px; color: #334155;">${p.mainRebars}; ${p.spiralTies}</td>
          <td class="text-right font-mono">${p.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${p.cementBags}</td>
          <td class="text-right font-mono">${p.sandCft}</td>
          <td class="text-right font-mono">${p.aggCft}</td>
          <td class="text-right font-mono font-bold">${p.steelKg}</td>
          <td class="text-right font-mono">৳ ${p.boringCost.toLocaleString("en-IN")}</td>
          <td class="text-right font-mono font-bold">৳ ${p.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="font-bold">Total Bored Piles Subtotal:</td>
          <td class="text-center font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.pileNos, 0)}</td>
          <td colspan="2"></td>
          <td class="text-right font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${situPiles.reduce((sum, p) => sum + p.steelKg, 0)}</td>
          <td class="text-right font-mono font-bold">৳ ${situPiles.reduce((sum, p) => sum + p.boringCost, 0).toLocaleString("en-IN")}</td>
          <td class="text-right font-mono grand-total-val">৳ ${situPiles.reduce((sum, p) => sum + p.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 4C: SAND COMPACTION PILES (SCP) BREAKDOWN -->
  ${
    sandPiles.length > 0
      ? `<div class="section-title avoid-break">
    <span>4C. Soil Improvement: Sand Compaction Piles (SCP) Schedule</span>
    <span class="section-badge">${sandPiles.length} Item(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Pile Mark / Name</th>
          <th style="width: 85px">Land Area</th>
          <th style="width: 95px">Grid Spacing</th>
          <th style="width: 90px">Size (Dia × L)</th>
          <th class="text-center" style="width: 50px">Nos</th>
          <th class="text-right" style="width: 75px">Sand Vol (cft)</th>
          <th class="text-right" style="width: 80px">Sand Cost</th>
          <th class="text-right" style="width: 80px">Rig Boring Cost</th>
          <th class="text-right" style="width: 90px">Total Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${sandPiles
          .map(
            (sp) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${sp.sl}</td>
          <td class="font-bold">${sp.name}</td>
          <td class="font-mono text-[9px]">${sp.landArea.toLocaleString()} sq.ft</td>
          <td class="font-mono text-[9px]">${sp.spacing}</td>
          <td class="font-mono text-[9px]">${sp.dimensions}</td>
          <td class="text-center font-mono font-bold">${sp.numPiles}</td>
          <td class="text-right font-mono font-bold">${sp.sandCft.toLocaleString()}</td>
          <td class="text-right font-mono">৳ ${sp.sandCost.toLocaleString("en-IN")}</td>
          <td class="text-right font-mono">৳ ${sp.boringCost.toLocaleString("en-IN")}</td>
          <td class="text-right font-mono font-bold">৳ ${sp.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="font-bold">Total Sand Piles Subtotal:</td>
          <td class="text-center font-mono font-bold">${sandPiles.reduce((sum, sp) => sum + sp.numPiles, 0)}</td>
          <td class="text-right font-mono font-bold">${sandPiles.reduce((sum, sp) => sum + sp.sandCft, 0).toLocaleString()}</td>
          <td class="text-right font-mono font-bold">৳ ${sandPiles.reduce((sum, sp) => sum + sp.sandCost, 0).toLocaleString("en-IN")}</td>
          <td class="text-right font-mono font-bold">৳ ${sandPiles.reduce((sum, sp) => sum + sp.boringCost, 0).toLocaleString("en-IN")}</td>
          <td class="text-right font-mono grand-total-val">৳ ${sandPiles.reduce((sum, sp) => sum + sp.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 5: COLUMNS BREAKDOWN -->
  ${
    columns.length > 0
      ? `<div class="section-title avoid-break">
    <span>5. Building RCC Columns Breakdown Schedule</span>
    <span class="section-badge">${columns.length} Mark(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Column Mark</th>
          <th style="width: 85px">Size (b×h)</th>
          <th style="width: 60px">Height</th>
          <th class="text-center" style="width: 45px">Nos</th>
          <th>Longitudinal Rebars</th>
          <th>Lateral Ties</th>
          <th class="text-right" style="width: 55px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 85px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${columns
          .map(
            (c) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${c.sl}</td>
          <td class="font-bold">${c.name}</td>
          <td class="font-mono text-[9px]">${c.size}</td>
          <td class="font-mono text-[9px]">${c.height}</td>
          <td class="text-center font-mono font-bold">${c.totalNos}</td>
          <td class="font-mono text-[8.5px] font-bold" style="color: #007791;">${c.mainBars}</td>
          <td style="font-size: 8.5px; color: #475569;">${c.ties}</td>
          <td class="text-right font-mono">${c.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${c.cementBags}</td>
          <td class="text-right font-mono">${c.sandCft}</td>
          <td class="text-right font-mono">${c.aggCft}</td>
          <td class="text-right font-mono font-bold">${c.steelKg}</td>
          <td class="text-right font-mono font-bold">৳ ${c.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="font-bold">Total Columns Subtotal:</td>
          <td class="text-center font-mono font-bold">${columns.reduce((sum, c) => sum + c.totalNos, 0)}</td>
          <td colspan="2"></td>
          <td class="text-right font-mono font-bold">${columns.reduce((sum, c) => sum + c.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${columns.reduce((sum, c) => sum + c.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${columns.reduce((sum, c) => sum + c.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${columns.reduce((sum, c) => sum + c.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${columns.reduce((sum, c) => sum + c.steelKg, 0)}</td>
          <td class="text-right font-mono grand-total-val">৳ ${columns.reduce((sum, c) => sum + c.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 6: BEAMS BREAKDOWN -->
  ${
    beams.length > 0
      ? `<div class="section-title avoid-break">
    <span>6. Structural RCC Beams Breakdown Schedule</span>
    <span class="section-badge">${beams.length} Mark(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Beam Mark</th>
          <th style="width: 80px">Cross Sec</th>
          <th style="width: 60px">Span</th>
          <th class="text-center" style="width: 45px">Nos</th>
          <th>Main Bottom/Top Rebar</th>
          <th>Extra Bars & Stirrups</th>
          <th class="text-right" style="width: 55px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 85px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${beams
          .map(
            (b) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${b.sl}</td>
          <td class="font-bold">${b.name}</td>
          <td class="font-mono text-[9px]">${b.size}</td>
          <td class="font-mono text-[9px]">${b.span}</td>
          <td class="text-center font-mono font-bold">${b.totalNos}</td>
          <td class="font-mono text-[8.5px] font-bold" style="color: #007791;">${b.mainBars}</td>
          <td style="font-size: 8.5px; color: #475569;">${b.extraBars} | ${b.stirrups}</td>
          <td class="text-right font-mono">${b.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${b.cementBags}</td>
          <td class="text-right font-mono">${b.sandCft}</td>
          <td class="text-right font-mono">${b.aggCft}</td>
          <td class="text-right font-mono font-bold">${b.steelKg}</td>
          <td class="text-right font-mono font-bold">৳ ${b.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="font-bold">Total Beams Subtotal:</td>
          <td class="text-center font-mono font-bold">${beams.reduce((sum, b) => sum + b.totalNos, 0)}</td>
          <td colspan="2"></td>
          <td class="text-right font-mono font-bold">${beams.reduce((sum, b) => sum + b.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${beams.reduce((sum, b) => sum + b.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${beams.reduce((sum, b) => sum + b.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${beams.reduce((sum, b) => sum + b.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${beams.reduce((sum, b) => sum + b.steelKg, 0)}</td>
          <td class="text-right font-mono grand-total-val">৳ ${beams.reduce((sum, b) => sum + b.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 7: SLABS BREAKDOWN -->
  ${
    slabs.length > 0
      ? `<div class="section-title avoid-break">
    <span>7. Floor RCC Slabs Breakdown Schedule</span>
    <span class="section-badge">${slabs.length} Mark(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Slab Mark</th>
          <th style="width: 120px">Dimensions (L×W×Th)</th>
          <th class="text-right" style="width: 75px">Area (sq.ft)</th>
          <th class="text-center" style="width: 45px">Nos</th>
          <th>Reinforcement (Main / Dist / Extra)</th>
          <th class="text-right" style="width: 55px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 85px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${slabs
          .map(
            (sl) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${sl.sl}</td>
          <td class="font-bold">${sl.name}</td>
          <td class="font-mono text-[9px]">${sl.dimensions}</td>
          <td class="text-right font-mono font-bold">${sl.areaSqft.toLocaleString()}</td>
          <td class="text-center font-mono">${sl.totalNos}</td>
          <td style="font-size: 8.5px; color: #334155;">Main: ${sl.mainBars}; Dist: ${sl.distBars}; Extra: ${sl.extraBars}</td>
          <td class="text-right font-mono">${sl.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${sl.cementBags}</td>
          <td class="text-right font-mono">${sl.sandCft}</td>
          <td class="text-right font-mono">${sl.aggCft}</td>
          <td class="text-right font-mono font-bold">${sl.steelKg}</td>
          <td class="text-right font-mono font-bold">৳ ${sl.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="font-bold">Total Slabs Subtotal:</td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.areaSqft, 0).toLocaleString()}</td>
          <td class="text-center font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.totalNos, 0)}</td>
          <td></td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${slabs.reduce((sum, sl) => sum + sl.steelKg, 0)}</td>
          <td class="text-right font-mono grand-total-val">৳ ${slabs.reduce((sum, sl) => sum + sl.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 8: STAIRS BREAKDOWN -->
  ${
    stairs.length > 0
      ? `<div class="section-title avoid-break">
    <span>8. Staircase Flights Breakdown Schedule</span>
    <span class="section-badge">${stairs.length} Item(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Flight Mark</th>
          <th style="width: 130px">Dimensions & Waist</th>
          <th style="width: 110px">Steps & Risers</th>
          <th class="text-center" style="width: 50px">Flights</th>
          <th>Reinforcement</th>
          <th class="text-right" style="width: 55px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 85px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${stairs
          .map(
            (st) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${st.sl}</td>
          <td class="font-bold">${st.name}</td>
          <td class="font-mono text-[9px]">${st.dimensions}</td>
          <td style="font-size: 8.5px;">${st.steps}</td>
          <td class="text-center font-mono font-bold">${st.flights}</td>
          <td style="font-size: 8.5px; color: #334155;">${st.rebar}</td>
          <td class="text-right font-mono">${st.wetVolCft}</td>
          <td class="text-right font-mono font-bold">${st.cementBags}</td>
          <td class="text-right font-mono">${st.sandCft}</td>
          <td class="text-right font-mono">${st.aggCft}</td>
          <td class="text-right font-mono font-bold">${st.steelKg}</td>
          <td class="text-right font-mono font-bold">৳ ${st.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="font-bold">Total Stairs Subtotal:</td>
          <td class="text-center font-mono font-bold">${stairs.reduce((sum, st) => sum + st.flights, 0)}</td>
          <td></td>
          <td class="text-right font-mono font-bold">${stairs.reduce((sum, st) => sum + st.wetVolCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${stairs.reduce((sum, st) => sum + st.cementBags, 0)}</td>
          <td class="text-right font-mono font-bold">${stairs.reduce((sum, st) => sum + st.sandCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${stairs.reduce((sum, st) => sum + st.aggCft, 0).toFixed(1)}</td>
          <td class="text-right font-mono font-bold">${stairs.reduce((sum, st) => sum + st.steelKg, 0)}</td>
          <td class="text-right font-mono grand-total-val">৳ ${stairs.reduce((sum, st) => sum + st.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 9: BRICKWORK BREAKDOWN -->
  ${
    bricks.length > 0
      ? `<div class="section-title avoid-break">
    <span>9. Burnt Clay Brickwork & Partition Masonry Schedule</span>
    <span class="section-badge">${bricks.length} Item(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Wall Description</th>
          <th style="width: 140px">Dimensions & Thickness</th>
          <th>Openings & Deductions</th>
          <th class="text-center" style="width: 50px">Storeys</th>
          <th class="text-right" style="width: 85px">Bricks (Pcs)</th>
          <th class="text-right" style="width: 75px">Cement (Bags)</th>
          <th class="text-right" style="width: 75px">Sand (cft)</th>
          <th class="text-right" style="width: 100px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${bricks
          .map(
            (b) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${b.sl}</td>
          <td class="font-bold">${b.name}</td>
          <td class="font-mono text-[9px]">${b.dimensions}</td>
          <td style="font-size: 8.5px; color: #475569;">${b.deductions}</td>
          <td class="text-center font-mono">×${b.multiplier}</td>
          <td class="text-right font-mono font-bold" style="color: #c2410c;">${b.bricksPcs.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${b.cementBags}</td>
          <td class="text-right font-mono">${b.sandCft}</td>
          <td class="text-right font-mono font-bold">৳ ${b.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="font-bold">Total Brickwork Subtotal:</td>
          <td class="text-right font-mono font-bold">${bricks.reduce((sum, b) => sum + b.bricksPcs, 0).toLocaleString()} Pcs</td>
          <td class="text-right font-mono font-bold">${bricks.reduce((sum, b) => sum + b.cementBags, 0)} Bags</td>
          <td class="text-right font-mono font-bold">${bricks.reduce((sum, b) => sum + b.sandCft, 0).toFixed(1)} cft</td>
          <td class="text-right font-mono grand-total-val">৳ ${bricks.reduce((sum, b) => sum + b.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 10: TILES BREAKDOWN -->
  ${
    tiles.length > 0
      ? `<div class="section-title avoid-break">
    <span>10. Floor & Skirting Tiles Schedule</span>
    <span class="section-badge">${tiles.length} Item(s)</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Room / Area Name</th>
          <th style="width: 140px">Dimensions & Area</th>
          <th>Tile Specification</th>
          <th>Skirting</th>
          <th class="text-center" style="width: 50px">Storeys</th>
          <th class="text-right" style="width: 80px">Tiles (Pcs)</th>
          <th class="text-right" style="width: 70px">Cement (Bags)</th>
          <th class="text-right" style="width: 70px">Sand (cft)</th>
          <th class="text-right" style="width: 95px">Cost (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${tiles
          .map(
            (t) => `<tr>
          <td class="text-center font-mono" style="color: #64748b;">${t.sl}</td>
          <td class="font-bold">${t.name}</td>
          <td class="font-mono text-[9px]">${t.dimensions}</td>
          <td style="font-size: 8.5px;">${t.tileSpec}</td>
          <td style="font-size: 8.5px; color: #475569;">${t.skirting}</td>
          <td class="text-center font-mono">×${t.multiplier}</td>
          <td class="text-right font-mono font-bold" style="color: #0284c7;">${t.tilesPcs.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${t.cementBags}</td>
          <td class="text-right font-mono">${t.sandCft}</td>
          <td class="text-right font-mono font-bold">৳ ${t.cost.toLocaleString("en-IN")}</td>
        </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="font-bold">Total Tiles Subtotal:</td>
          <td class="text-right font-mono font-bold">${tiles.reduce((sum, t) => sum + t.tilesPcs, 0).toLocaleString()} Pcs</td>
          <td class="text-right font-mono font-bold">${tiles.reduce((sum, t) => sum + t.cementBags, 0)} Bags</td>
          <td class="text-right font-mono font-bold">${tiles.reduce((sum, t) => sum + t.sandCft, 0).toFixed(1)} cft</td>
          <td class="text-right font-mono grand-total-val">৳ ${tiles.reduce((sum, t) => sum + t.cost, 0).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
      : ""
  }

  <!-- SECTION 11: ESTIMATE FILE LIST & ALL MATERIALS -->
  <div class="section-title avoid-break">
    <span>11. Consolidated Project Budget & Saved Estimate Files with All Materials (${estimates.length} Sheets)</span>
    <span class="section-badge">Grand Materials Summary</span>
  </div>
  <div class="table-container avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25px" class="text-center">#</th>
          <th>Estimate File Title</th>
          <th style="width: 70px">Component</th>
          <th class="text-center" style="width: 45px">Mult</th>
          <th class="text-right" style="width: 52px">Wet cft</th>
          <th class="text-right" style="width: 55px">Cement</th>
          <th class="text-right" style="width: 55px">Sand</th>
          <th class="text-right" style="width: 55px">Stone</th>
          <th class="text-right" style="width: 60px">Steel kg</th>
          <th class="text-right" style="width: 55px">Bricks</th>
          <th class="text-right" style="width: 55px">Tiles</th>
          <th class="text-right" style="width: 95px">Total (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${estimates
          .map((e, idx) => {
            const m = extractEstimateMaterials(e);
            return `<tr>
          <td class="font-mono text-center" style="color: #64748b;">${idx + 1}</td>
          <td class="font-bold">${e.name}</td>
          <td style="text-transform: uppercase; font-size: 8.5px; font-weight: 700; color: #007791;">${e.type}</td>
          <td class="text-center font-mono font-bold">×${m.multiplier}</td>
          <td class="text-right font-mono">${m.wetVolCft > 0 ? m.wetVolCft : "-"}</td>
          <td class="text-right font-mono font-bold" style="color: #b45309;">${m.cementBags > 0 ? m.cementBags.toLocaleString() : "-"}</td>
          <td class="text-right font-mono">${m.sandCft > 0 ? m.sandCft.toLocaleString() : "-"}</td>
          <td class="text-right font-mono">${m.aggCft > 0 ? m.aggCft.toLocaleString() : "-"}</td>
          <td class="text-right font-mono font-bold" style="color: #0369a1;">${m.steelKg > 0 ? m.steelKg.toLocaleString() : "-"}</td>
          <td class="text-right font-mono" style="color: #c2410c;">${m.bricksPcs > 0 ? m.bricksPcs.toLocaleString() : "-"}</td>
          <td class="text-right font-mono" style="color: #047857;">${m.tilesPcs > 0 ? m.tilesPcs.toLocaleString() : "-"}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(e.totalCost || 0).toLocaleString("en-IN")}</td>
        </tr>`;
          })
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="font-bold">Total Across All Estimate Files:</td>
          <td class="text-right font-mono font-bold">${totals.concreteVolCft.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.cementBags.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${Math.round(totals.sandCft).toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${Math.round(totals.aggCft).toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.steelKg.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.bricksPcs.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${totals.tilesPcs.toLocaleString()}</td>
          <td class="text-right grand-total-val font-mono">৳ ${totals.grandTotalCost.toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="signatures-block avoid-break">
    <div>
      <div class="sign-line">${project.engineer || "Anonymous"}</div>
      <div class="sign-title">Lead Structural & Civil Engineer</div>
      <div class="sign-sub">Signature, Professional Seal & Date</div>
    </div>
    <div>
      <div class="sign-line">${project.client || "Client Representative"}</div>
      <div class="sign-title">Client Verification & Work Authorization</div>
      <div class="sign-sub">Signature, Approval & Date</div>
    </div>
  </div>

  <div class="footer-note avoid-break">
    <div>Generated via <strong>Dolphin Box</strong> • Professional Civil Engineering Suite</div>
    <div>Developer: <strong>Anonymous</strong> • Standard: BNBC / ACI 318</div>
  </div>
</body>
</html>`;
  };

  // Direct printing execution with verified page rules & client-named PDF filename
  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("report-modal-open");

    // Temporarily set document.title so that browser "Save as PDF" dialog suggests the client name & estimate format
    const originalDocTitle = document.title;
    const clientName = (project.client || "Client").trim();
    const projectName = project.name.trim();
    const pdfFilename = `${clientName} - Estimate - ${projectName} - BOQ`;
    document.title = pdfFilename;

    const restoreTitle = () => {
      document.title = originalDocTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      // Fallback restore in case afterprint does not fire in certain browsers
      setTimeout(restoreTitle, 2500);
    }, 200);
  };

  // Open in new clean tab with standalone HTML & auto-print
  const handleOpenPrintWindow = () => {
    const htmlContent = generateStandaloneHtml(true);
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      newWindow.focus();
    }
  };

  // Download standalone printable HTML report
  const handleDownloadHtml = () => {
    const htmlContent = generateStandaloneHtml(false);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeClient = (project.client || "Client")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    const safeProject = project.name
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    link.download = `${safeClient}_Estimate_${safeProject}_Detailed_BOQ_${pageSize}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Comprehensive CSV Export with all breakdowns
  const handleExportCSV = () => {
    let csv = `DOLPHIN BOX - COMPREHENSIVE BILL OF QUANTITIES REPORT\n`;
    csv += `Project:,"${project.name}"\n`;
    csv += `Client:,"${project.client || "N/A"}"\n`;
    csv += `Location:,"${project.location || "N/A"}"\n`;
    csv += `Engineer:,"${project.engineer || "Anonymous"}"\n`;
    csv += `Date:,"${new Date().toLocaleDateString()}"\n`;
    csv += `Storeys:,"${project.stories || 1} Floor(s)",Multiplier:,"×${project.stories || 1}"\n\n`;

    // 1. Consolidated Materials Schedule
    csv += `1. CONSOLIDATED MATERIALS SCHEDULE\n`;
    csv += `SL,Material Description,Specification,Unit,Unit Price (BDT),Quantity,Amount (BDT)\n`;
    csv += `1,"Portland Composite Cement (PCC)","50 kg Bags BDS EN 197-1 CEM II",Bag,${defaultCementRate},${totals.cementBags},${totals.cementBags * defaultCementRate}\n`;
    csv += `2,"Coarse & Medium Sand (Sylhet + Local)","Fineness Modulus FM 1.5 - 2.5",cft,${defaultSandRate},${Math.round(totals.sandCft)},${Math.round(totals.sandCft * defaultSandRate)}\n`;
    csv += `3,"Stone Aggregate / Picket Chips","3/4 inch down graded coarse agg",cft,${defaultAggRate},${Math.round(totals.aggCft)},${Math.round(totals.aggCft * defaultAggRate)}\n`;
    csv += `4,"High-Yield Deformed Rebar Steel","500W / 60G (${totals.steelTons} MT)",kg,${defaultSteelRate},${totals.steelKg},${Math.round(totals.steelKg * defaultSteelRate)}\n`;
    csv += `5,"First Class Burnt Clay Bricks","Standard Modular 9.5x4.5x2.75 in",Pcs,${defaultBrickRate},${totals.bricksPcs},${Math.round(totals.bricksPcs * defaultBrickRate)}\n`;
    if (totals.tilesPcs > 0) {
      csv += `6,"Ceramic & Vitrified Tiles","Finished tile surface",Pcs,${defaultTileRate},${totals.tilesPcs},${Math.round(totals.tilesPcs * defaultTileRate)}\n`;
    }
    if (totals.boringCost > 0) {
      csv += `${totals.tilesPcs > 0 ? 7 : 6},"Cast-in-Situ / Sand Pile Machine Boring & Rig Drilling","Rotary/wash boring & rig mobilization",Job,-,1 Job,${totals.boringCost}\n`;
    }
    if (totals.ancillaryCost > 0) {
      csv += `${totals.tilesPcs > 0 ? (totals.boringCost > 0 ? 8 : 7) : (totals.boringCost > 0 ? 7 : 6)},"Substructure Soling (BFS), Sand Bedding, Tile Skirting & Mortar","Footing flat brick soling, sand cushion, tile mortar & finishing",Itemized,-,Lump Sum,${totals.ancillaryCost}\n`;
    }
    csv += `Consolidated Materials & Works Subtotal Cost,,,,,,${totals.grandTotalCost}\n\n`;

    // 2. Material Allocation Matrix
    csv += `2. MATERIAL ALLOCATION MATRIX BY STRUCTURAL ELEMENT\n`;
    csv += `Structural Element,Quantity,Concrete Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Bricks (Pcs),Tiles (Pcs),Subtotal (BDT)\n`;
    allocations.forEach((a) => {
      csv += `"${a.label}","${a.count > 0 ? `${a.count} ${a.unit}` : "-"}",${a.concreteVolCft},${a.cementBags},${Math.round(a.sandCft)},${Math.round(a.aggCft)},${a.steelKg},${a.bricksPcs},${a.tilesPcs},${a.cost}\n`;
    });
    csv += `Total Quantities,-,${totals.concreteVolCft},${totals.cementBags},${Math.round(totals.sandCft)},${Math.round(totals.aggCft)},${totals.steelKg},${totals.bricksPcs},${totals.tilesPcs},${totals.grandTotalCost}\n\n`;

    // 3. Rebar Diameter Breakdown
    if (steelBreakdown.length > 0) {
      csv += `3. STEEL REBAR DIAMETER BREAKDOWN\n`;
      csv += `SL,Bar Diameter,Weight (kg),Tonnage (MT),Share (%),Rate (BDT),Amount (BDT)\n`;
      steelBreakdown.forEach((st, i) => {
        csv += `${i + 1},"${st.dia} mmø",${st.kg},${st.tons},${st.pct}%,${defaultSteelRate},${st.cost}\n`;
      });
      csv += `Total Steel,,${totals.steelKg},${totals.steelTons},100%,${defaultSteelRate},${Math.round(totals.steelKg * defaultSteelRate)}\n\n`;
    }

    // 4. Footings Breakdown
    if (footings.length > 0) {
      csv += `4. FOUNDATION FOOTINGS BREAKDOWN SCHEDULE\n`;
      csv += `SL,Footing Mark,Dimensions,Total Nos,Mix,Reinforcement,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Cost (BDT)\n`;
      footings.forEach((f) => {
        csv += `${f.sl},"${f.name}","${f.dimensions}",${f.totalNos},"${f.mix}","${f.rebars}",${f.wetVolCft},${f.cementBags},${f.sandCft},${f.aggCft},${f.steelKg},${f.cost}\n`;
      });
      csv += `\n`;
    }

    // 4B. Cast-in-Situ Bored Piles Breakdown
    if (situPiles.length > 0) {
      csv += `4B. CAST-IN-SITU BORED PILES SCHEDULE\n`;
      csv += `SL,Pile Mark,Dimensions,Total Nos,Mix,Cage Reinforcement,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Boring Cost (BDT),Total Cost (BDT)\n`;
      situPiles.forEach((p) => {
        csv += `${p.sl},"${p.name}","${p.dimensions}",${p.pileNos},"${p.mix}","${p.mainRebars}; ${p.spiralTies}",${p.wetVolCft},${p.cementBags},${p.sandCft},${p.aggCft},${p.steelKg},${p.boringCost},${p.cost}\n`;
      });
      csv += `\n`;
    }

    // 4C. Sand Compaction Piles (SCP) Breakdown
    if (sandPiles.length > 0) {
      csv += `4C. SAND COMPACTION PILES (SCP) SCHEDULE\n`;
      csv += `SL,Pile Mark,Land Area (sq.ft),Grid Spacing,Dimensions,Total Piles,Sand Vol (cft),Sand Cost (BDT),Boring Cost (BDT),Total Cost (BDT)\n`;
      sandPiles.forEach((sp) => {
        csv += `${sp.sl},"${sp.name}",${sp.landArea},"${sp.spacing}","${sp.dimensions}",${sp.numPiles},${sp.sandCft},${sp.sandCost},${sp.boringCost},${sp.cost}\n`;
      });
      csv += `\n`;
    }

    // 5. Columns Breakdown
    if (columns.length > 0) {
      csv += `5. BUILDING COLUMNS BREAKDOWN SCHEDULE\n`;
      csv += `SL,Column Mark,Size,Height,Total Nos,Main Rebars,Lateral Ties,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Cost (BDT)\n`;
      columns.forEach((c) => {
        csv += `${c.sl},"${c.name}","${c.size}","${c.height}",${c.totalNos},"${c.mainBars}","${c.ties}",${c.wetVolCft},${c.cementBags},${c.sandCft},${c.aggCft},${c.steelKg},${c.cost}\n`;
      });
      csv += `\n`;
    }

    // 6. Beams Breakdown
    if (beams.length > 0) {
      csv += `6. STRUCTURAL BEAMS BREAKDOWN SCHEDULE\n`;
      csv += `SL,Beam Mark,Cross Section,Span,Total Nos,Main Bars,Extra Bars & Stirrups,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Cost (BDT)\n`;
      beams.forEach((b) => {
        csv += `${b.sl},"${b.name}","${b.size}","${b.span}",${b.totalNos},"${b.mainBars}","${b.extraBars} | ${b.stirrups}",${b.wetVolCft},${b.cementBags},${b.sandCft},${b.aggCft},${b.steelKg},${b.cost}\n`;
      });
      csv += `\n`;
    }

    // 7. Slabs Breakdown
    if (slabs.length > 0) {
      csv += `7. FLOOR SLABS BREAKDOWN SCHEDULE\n`;
      csv += `SL,Slab Mark,Dimensions,Area (sq.ft),Total Nos,Reinforcement,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Cost (BDT)\n`;
      slabs.forEach((sl) => {
        csv += `${sl.sl},"${sl.name}","${sl.dimensions}",${sl.areaSqft},${sl.totalNos},"Main: ${sl.mainBars}; Dist: ${sl.distBars}",${sl.wetVolCft},${sl.cementBags},${sl.sandCft},${sl.aggCft},${sl.steelKg},${sl.cost}\n`;
      });
      csv += `\n`;
    }

    // 8. Stairs Breakdown
    if (stairs.length > 0) {
      csv += `8. STAIRCASES BREAKDOWN SCHEDULE\n`;
      csv += `SL,Flight Mark,Dimensions,Steps,Flights,Reinforcement,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Cost (BDT)\n`;
      stairs.forEach((st) => {
        csv += `${st.sl},"${st.name}","${st.dimensions}","${st.steps}",${st.flights},"${st.rebar}",${st.wetVolCft},${st.cementBags},${st.sandCft},${st.aggCft},${st.steelKg},${st.cost}\n`;
      });
      csv += `\n`;
    }

    // 9. Brickwork Breakdown
    if (bricks.length > 0) {
      csv += `9. BRICKWORK & MASONRY BREAKDOWN SCHEDULE\n`;
      csv += `SL,Wall Description,Dimensions,Deductions,Storeys,Bricks (Pcs),Cement (Bags),Sand (cft),Cost (BDT)\n`;
      bricks.forEach((b) => {
        csv += `${b.sl},"${b.name}","${b.dimensions}","${b.deductions}",${b.multiplier},${b.bricksPcs},${b.cementBags},${b.sandCft},${b.cost}\n`;
      });
      csv += `\n`;
    }

    // 10. Tiles Breakdown
    if (tiles.length > 0) {
      csv += `10. FLOOR TILES BREAKDOWN SCHEDULE\n`;
      csv += `SL,Room Name,Dimensions,Tile Spec,Skirting,Storeys,Tiles (Pcs),Cement (Bags),Sand (cft),Cost (BDT)\n`;
      tiles.forEach((t) => {
        csv += `${t.sl},"${t.name}","${t.dimensions}","${t.tileSpec}","${t.skirting}",${t.multiplier},${t.tilesPcs},${t.cementBags},${t.sandCft},${t.cost}\n`;
      });
      csv += `\n`;
    }

    // 11. Saved Estimate Files with All Materials
    csv += `11. CONSOLIDATED ESTIMATE FILES & MATERIALS BREAKDOWN\n`;
    csv += `SL,Estimate Title,Component,Multiplier,Wet Vol (cft),Cement (Bags),Sand (cft),Stone (cft),Steel (kg),Bricks (Pcs),Tiles (Pcs),Total Cost (BDT)\n`;
    estimates.forEach((e, idx) => {
      const m = extractEstimateMaterials(e);
      csv += `${idx + 1},"${e.name}","${e.type}",×${m.multiplier},${m.wetVolCft},${m.cementBags},${m.sandCft},${m.aggCft},${m.steelKg},${m.bricksPcs},${m.tilesPcs},${e.totalCost}\n`;
    });
    csv += `Total Across All Files,,,${totals.concreteVolCft},${totals.cementBags},${Math.round(totals.sandCft)},${Math.round(totals.aggCft)},${totals.steelKg},${totals.bricksPcs},${totals.tilesPcs},${totals.grandTotalCost}\n\n`;

    csv += `Consolidated Project Estimate Grand Total Cost,,,,,,,,,,${totals.grandTotalCost}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeClient = (project.client || "Client")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    const safeProject = project.name
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    link.setAttribute(
      "download",
      `${safeClient}_Estimate_${safeProject}_Detailed_BOQ.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="report-modal-card bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header & Actions Bar (Hidden during print) */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex flex-wrap items-center justify-between gap-2.5 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00c2c7]/20 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Dolphin Box BOQ & PDF Export
              </h3>
              <p className="text-[10px] text-[#8ba3c1]">
                Client: <strong className="text-white">{(project.client || "Client").trim()}</strong> • Project:{" "}
                <strong className="text-white">{project.name}</strong> • PDF:{" "}
                <span className="text-emerald-400 font-mono font-semibold">
                  {(project.client || "Client").trim()} - Estimate - {project.name.trim()}.pdf
                </span> •{" "}
                <span className="text-[#00c2c7] font-bold">{project.stories || 1} Floor(s)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Toggle Margin & Padding Toolbar */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                showSettings
                  ? "bg-[#00c2c7]/20 text-[#00c2c7] border-[#00c2c7]/50"
                  : "bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
              title="Show/Hide Margins, Padding & Page Size Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Page & Margins</span>
            </button>

            {/* Paper Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPaperPreview(!isPaperPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                isPaperPreview
                  ? "bg-[#f5a623] text-[#0f1c2e] border-[#f5a623] font-bold"
                  : "bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
              title="Toggle Live A4/Letter/Legal Paper Preview with Margins"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paper Preview</span>
            </button>

            {/* Standalone Clean Tab */}
            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="hidden lg:flex items-center gap-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border border-[#2d4a6a]"
              title="Open Printable Page in Standalone Isolated Window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span>Clean Tab</span>
            </button>

            {/* Save HTML Doc */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="hidden sm:flex items-center gap-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border border-[#2d4a6a]"
              title="Download standalone HTML document for offline printing"
            >
              <Download className="w-3.5 h-3.5 text-[#2ecc71]" />
              <span>HTML Doc</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-[#243b55] hover:bg-[#2d4a6a] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border border-[#2d4a6a]"
              title="Export complete breakdown as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span className="hidden md:inline">CSV</span>
            </button>

            {/* Main Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-[#00c2c7]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              title={`Download / Save PDF as "${(project.client || "Client").trim()} - Estimate - ${project.name.trim()} - BOQ.pdf"`}
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isPrinting ? "Opening Print Dialog..." : "Print / Save PDF"}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="text-[#8ba3c1] hover:text-white transition p-1.5 hover:bg-[#243b55] rounded-lg ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DETAILED PDF CONTROLS PANEL */}
        {showSettings && (
          <div className="bg-[#121c2d] border-b border-[#2d4a6a] px-4 py-2.5 text-xs text-[#8ba3c1] print:hidden shrink-0 space-y-2.5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Paper Format: A4, Letter, Legal */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00c2c7]" />
                  Paper:
                </span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => setPageSize("a4")}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      pageSize === "a4"
                        ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    A4 (210×297)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize("letter")}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      pageSize === "letter"
                        ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Letter (8.5×11")
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize("legal")}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      pageSize === "legal"
                        ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Legal (8.5×14")
                  </button>
                </div>
              </div>

              {/* Orientation: Portrait / Landscape */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">Orientation:</span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      orientation === "portrait"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-sm"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      orientation === "landscape"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-sm"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Margin Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#8ba3c1] font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyMarginPreset("standard")}
                  className="px-2 py-0.5 rounded bg-[#1a2b42] hover:bg-[#243b55] text-[10px] font-medium text-white border border-[#2d4a6a]"
                >
                  Standard (15mm)
                </button>
                <button
                  type="button"
                  onClick={() => applyMarginPreset("compact")}
                  className="px-2 py-0.5 rounded bg-[#1a2b42] hover:bg-[#243b55] text-[10px] font-medium text-white border border-[#2d4a6a]"
                >
                  Compact (10mm)
                </button>
                <button
                  type="button"
                  onClick={() => applyMarginPreset("binding")}
                  className="px-2 py-0.5 rounded bg-[#1a2b42] hover:bg-[#243b55] text-[10px] font-medium text-white border border-[#2d4a6a]"
                >
                  Binding (25mm)
                </button>
              </div>
            </div>

            {/* Row 2: 4 Margins & Density */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#2d4a6a]/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-white">Margins (mm):</span>
                {/* Top */}
                <div className="flex items-center gap-1 bg-[#1a2b42] px-1.5 py-0.5 rounded border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#8ba3c1]">Top:</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginTop}
                    onChange={(e) => handleMarginChange("top", parseInt(e.target.value) || 0)}
                    className="w-8 bg-transparent text-center font-mono font-bold text-white text-xs outline-none"
                  />
                  <span className="text-[9px] text-[#8ba3c1]">mm</span>
                </div>
                {/* Bottom */}
                <div className="flex items-center gap-1 bg-[#1a2b42] px-1.5 py-0.5 rounded border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#8ba3c1]">Btm:</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginBottom}
                    onChange={(e) => handleMarginChange("bottom", parseInt(e.target.value) || 0)}
                    className="w-8 bg-transparent text-center font-mono font-bold text-white text-xs outline-none"
                  />
                  <span className="text-[9px] text-[#8ba3c1]">mm</span>
                </div>
                {/* Left */}
                <div className="flex items-center gap-1 bg-[#1a2b42] px-1.5 py-0.5 rounded border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#8ba3c1]">Left:</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginLeft}
                    onChange={(e) => handleMarginChange("left", parseInt(e.target.value) || 0)}
                    className="w-8 bg-transparent text-center font-mono font-bold text-white text-xs outline-none"
                  />
                  <span className="text-[9px] text-[#8ba3c1]">mm</span>
                </div>
                {/* Right */}
                <div className="flex items-center gap-1 bg-[#1a2b42] px-1.5 py-0.5 rounded border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#8ba3c1]">Right:</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginRight}
                    onChange={(e) => handleMarginChange("right", parseInt(e.target.value) || 0)}
                    className="w-8 bg-transparent text-center font-mono font-bold text-white text-xs outline-none"
                  />
                  <span className="text-[9px] text-[#8ba3c1]">mm</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMarginsLinked(!isMarginsLinked)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                    isMarginsLinked
                      ? "bg-[#00c2c7]/20 text-[#00c2c7] border-[#00c2c7]"
                      : "bg-[#1a2b42] text-[#8ba3c1] border-[#2d4a6a] hover:text-white"
                  }`}
                  title="Link all 4 margins"
                >
                  {isMarginsLinked ? <LinkIcon className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                  <span>{isMarginsLinked ? "Linked" : "Unlinked"}</span>
                </button>
              </div>

              {/* Font Size & Spacing Density */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8ba3c1]">Font:</span>
                  <select
                    value={fontSizePt}
                    onChange={(e) => setFontSizePt(Number(e.target.value))}
                    className="bg-[#1a2b42] text-white border border-[#2d4a6a] rounded px-2 py-0.5 text-[10px] outline-none"
                  >
                    <option value={9}>9 pt (Ultra Dense)</option>
                    <option value={10}>10 pt (Standard)</option>
                    <option value={11}>11 pt (Large)</option>
                    <option value={12}>12 pt (Extra Large)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8ba3c1]">Padding:</span>
                  <select
                    value={paddingDensity}
                    onChange={(e) => setPaddingDensity(e.target.value as PaddingDensity)}
                    className="bg-[#1a2b42] text-white border border-[#2d4a6a] rounded px-2 py-0.5 text-[10px] outline-none"
                  >
                    <option value="compact">Compact (3×6px)</option>
                    <option value="normal">Normal (5×8px)</option>
                    <option value="spacious">Spacious (7×11px)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVE PREVIEW CONTAINER */}
        <div
          className={`flex-1 overflow-y-auto ${
            isPaperPreview
              ? "p-4 sm:p-8 bg-[#0a121e] flex justify-center items-start"
              : "p-4 sm:p-6 bg-[#0f1c2e]"
          } print:bg-white print:text-black print:p-0 print:overflow-visible`}
        >
          {/* Paper Sheet Preview Container */}
          <div
            className={`report-printable-content ${sectionSpacingClass} ${
              isPaperPreview
                ? `bg-white text-slate-900 shadow-2xl rounded-sm ${getPaperDimensionsClass()} w-full border border-gray-300 relative transition-all duration-150`
                : "text-[#f1f5f9] print:text-black print:bg-white"
            }`}
            style={{
              paddingTop: isPaperPreview ? `${marginTop}mm` : undefined,
              paddingBottom: isPaperPreview ? `${marginBottom}mm` : undefined,
              paddingLeft: isPaperPreview ? `${marginLeft}mm` : undefined,
              paddingRight: isPaperPreview ? `${marginRight}mm` : undefined,
            }}
          >
            {/* Visual Margin Guideline Indicators in Paper Preview */}
            {isPaperPreview && (
              <div
                className="absolute inset-0 pointer-events-none border border-dashed border-sky-400/30 print:hidden z-10"
                style={{
                  top: `${marginTop}mm`,
                  bottom: `${marginBottom}mm`,
                  left: `${marginLeft}mm`,
                  right: `${marginRight}mm`,
                }}
              >
                <div className="absolute top-1 right-1 text-[8px] font-mono bg-sky-100 text-sky-800 px-1 py-0.5 rounded opacity-70">
                  {marginTop}mm / {marginRight}mm
                </div>
              </div>
            )}

            {/* Document Header */}
            <div className="border-b-2 border-[#2d4a6a] print:border-slate-900 pb-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#00c2c7] print:text-blue-800 uppercase mb-0.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>DOLPHIN BOX • STRUCTURAL & CIVIL ENGINEERING</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white print:text-slate-900 tracking-tight">
                  Bill of Quantities (BOQ) & Component Takeoff
                </h1>
                <p className="text-xs text-[#8ba3c1] print:text-slate-600 mt-0.5">
                  Complete Breakdown for Columns, Beams, Footings, Slabs, Stairs & Separated Materials
                </p>
              </div>

              <div className="text-xs text-left sm:text-right text-[#8ba3c1] print:text-slate-600 space-y-0.5 shrink-0 bg-[#152033] print:bg-slate-50 p-2 rounded-lg border border-[#2d4a6a] print:border-slate-300">
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
                    {project.engineer || "Anonymous"}
                  </strong>
                </div>
                <div className="text-[10px] text-[#00c2c7] print:text-blue-700 font-mono font-semibold">
                  BNBC / ACI 318 Standard
                </div>
              </div>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-[#152033] print:bg-slate-50 border border-[#2d4a6a] print:border-slate-300 rounded-lg p-2.5">
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                  Project Title:
                </span>
                <strong className="text-white print:text-slate-900 text-sm block truncate">
                  {project.name}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                  Client / Owner:
                </span>
                <strong className="text-white print:text-slate-900 block truncate">
                  {project.client || "Client Representative"}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                  Site Location:
                </span>
                <strong className="text-white print:text-slate-900 block truncate">
                  {project.location || "Bangladesh"}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                  Building Storeys:
                </span>
                <strong className="text-[#00c2c7] print:text-blue-700 block truncate font-bold">
                  {project.stories || 1} Floor(s) {(project.stories || 1) > 1 ? `(×${project.stories} Multiplied)` : ""}
                </strong>
              </div>
              <div>
                <span className="text-[#8ba3c1] print:text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                  Paper & Margins:
                </span>
                <strong className="text-white print:text-slate-900 block uppercase font-mono text-[10px]">
                  {pageSize} • T:{marginTop} B:{marginBottom} L:{marginLeft} R:{marginRight}mm
                </strong>
              </div>
            </div>

            {/* SECTION 1: CONSOLIDATED MATERIALS SCHEDULE */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Consolidated Structural Materials Schedule
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                  Consolidated Takeoff Totals
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: cellPaddingCss, width: "28px" }} className="text-center">#</th>
                      <th style={{ padding: cellPaddingCss }}>Material Description & Specification</th>
                      <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-center">Unit</th>
                      <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Unit Price (৳)</th>
                      <th style={{ padding: cellPaddingCss, width: "105px" }} className="text-right">Total Quantity</th>
                      <th style={{ padding: cellPaddingCss, width: "125px" }} className="text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {/* Cement */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">1</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Portland Composite Cement (PCC)
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Standard 50 kg bags (BDS EN 197-1 CEM II / ACI 318)
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">Bag</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultCementRate.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{totals.cementBags.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {(totals.cementBags * defaultCementRate).toLocaleString("en-IN")}</td>
                    </tr>

                    {/* Sand */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">2</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Coarse & Medium Sand (Sylhet FM 2.5 + Local FM 1.5)
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Graded sand for structural concrete, mortar & plastering
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">cft</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultSandRate}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{Math.round(totals.sandCft).toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {Math.round(totals.sandCft * defaultSandRate).toLocaleString("en-IN")}</td>
                    </tr>

                    {/* Aggregate */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">3</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Crushed Stone Aggregate / Picket Chips
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          3/4" down-graded angular coarse aggregate
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">cft</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultAggRate}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{Math.round(totals.aggCft).toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {Math.round(totals.aggCft * defaultAggRate).toLocaleString("en-IN")}</td>
                    </tr>

                    {/* Steel */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">4</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        High-Yield Strength Deformed Rebar Steel
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Grade 500W / 60G Thermo-Mechanically Treated ({totals.steelTons} MT)
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">kg</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultSteelRate}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{totals.steelKg.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {Math.round(totals.steelKg * defaultSteelRate).toLocaleString("en-IN")}</td>
                    </tr>

                    {/* Bricks */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">5</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        First Class Burnt Clay Bricks
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Standard Modular 9.5" × 4.5" × 2.75"
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">Pcs</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultBrickRate}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{totals.bricksPcs.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {Math.round(totals.bricksPcs * defaultBrickRate).toLocaleString("en-IN")}</td>
                    </tr>

                    {/* Tiles */}
                    {totals.tilesPcs > 0 && (
                      <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">6</td>
                        <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                          Floor & Wall Ceramic / Vitrified Tiles
                          <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                            Finished tile units including skirting and cuts
                          </div>
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">Pcs</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultTileRate}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">{totals.tilesPcs.toLocaleString()}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {Math.round(totals.tilesPcs * defaultTileRate).toLocaleString("en-IN")}</td>
                      </tr>
                    )}

                    {/* Pile Boring Drilling Work */}
                    {totals.boringCost > 0 && (
                      <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{totals.tilesPcs > 0 ? 7 : 6}</td>
                        <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                          Cast-in-Situ / Sand Pile Machine Boring & Rig Drilling
                          <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                            Rotary / wash boring, bentonite slurry circulation & rig operations
                          </div>
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">Job</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">—</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">1 Job</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {totals.boringCost.toLocaleString("en-IN")}</td>
                      </tr>
                    )}

                    {/* Substructure Soling, Tile Mortar, Skirting & Finishing */}
                    {totals.ancillaryCost > 0 && (
                      <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{totals.tilesPcs > 0 ? (totals.boringCost > 0 ? 8 : 7) : (totals.boringCost > 0 ? 7 : 6)}</td>
                        <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                          Substructure Soling (BFS), Sand Bedding, Tile Skirting & Mortar
                          <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                            Footing flat brick soling, sand cushion, tile adhesive mortar, pointing & edge finishing
                          </div>
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">Itemized</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">—</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">Lump Sum</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">৳ {totals.ancillaryCost.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td colSpan={5} style={{ padding: cellPaddingCss }} className="text-right text-white print:text-slate-900 font-bold">
                        Consolidated Materials & Works Subtotal Cost:
                        <div className="text-[9px] font-normal text-[#8ba3c1] print:text-slate-500">
                          [Direct Raw Materials: ৳ {totals.rawMaterialsCost.toLocaleString("en-IN")}{totals.boringCost > 0 ? ` + Pile Boring: ৳ ${totals.boringCost.toLocaleString("en-IN")}` : ""}{totals.ancillaryCost > 0 ? ` + Soling, Skirting & Finishing: ৳ ${totals.ancillaryCost.toLocaleString("en-IN")}` : ""}]
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right text-sm text-[#2ecc71] print:text-slate-950 font-black font-mono">
                        ৳ {totals.grandTotalCost.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 2: COMPONENT VS MATERIAL ALLOCATION MATRIX */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Material Allocation Matrix by Structural Component
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                  Cross-Tab Component Distribution
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: cellPaddingCss }}>Structural Element</th>
                      <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Wet Conc (cft)</th>
                      <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Cement (Bags)</th>
                      <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-right">Sand (cft)</th>
                      <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-right">Stone (cft)</th>
                      <th style={{ padding: cellPaddingCss, width: "70px" }} className="text-right">Steel (kg)</th>
                      <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-right">Bricks (Pcs)</th>
                      <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Tiles (Pcs)</th>
                      <th style={{ padding: cellPaddingCss, width: "105px" }} className="text-right">Subtotal (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {allocations.map((a) => (
                      <tr key={a.key} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                          {a.label}{" "}
                          {a.count > 0 && (
                            <span className="text-[9px] text-[#8ba3c1] print:text-slate-500 font-normal">
                              ({a.count.toLocaleString()} {a.unit})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                          {a.concreteVolCft > 0 ? a.concreteVolCft.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">
                          {a.cementBags > 0 ? a.cementBags.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                          {a.sandCft > 0 ? Math.round(a.sandCft).toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                          {a.aggCft > 0 ? Math.round(a.aggCft).toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">
                          {a.steelKg > 0 ? a.steelKg.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#f97316] print:text-slate-700">
                          {a.bricksPcs > 0 ? a.bricksPcs.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#38bdf8] print:text-slate-700">
                          {a.tilesPcs > 0 ? a.tilesPcs.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">
                          ৳ {a.cost.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">
                        Total Material Quantities:
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">
                        {totals.concreteVolCft.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">
                        {totals.cementBags.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">
                        {Math.round(totals.sandCft).toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">
                        {Math.round(totals.aggCft).toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">
                        {totals.steelKg.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f97316] print:text-slate-900">
                        {totals.bricksPcs.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#38bdf8] print:text-slate-900">
                        {totals.tilesPcs.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val text-sm font-black">
                        ৳ {totals.grandTotalCost.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 3: REBAR STEEL REINFORCEMENT BREAKDOWN */}
            {steelBreakdown.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      3
                    </span>
                    Rebar Steel Diameter Breakdown ({totals.steelTons} Metric Tons)
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    Grade 500W / 60G Deformed Rebar
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "28px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Rebar Bar Size & Specification</th>
                        <th style={{ padding: cellPaddingCss, width: "100px" }} className="text-right">Weight (kg)</th>
                        <th style={{ padding: cellPaddingCss, width: "100px" }} className="text-right">Tonnage (MT)</th>
                        <th style={{ padding: cellPaddingCss, width: "80px" }} className="text-right">Share (%)</th>
                        <th style={{ padding: cellPaddingCss, width: "90px" }} className="text-right">Rate (৳/kg)</th>
                        <th style={{ padding: cellPaddingCss, width: "120px" }} className="text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {steelBreakdown.map((st, i) => (
                        <tr key={st.dia} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{i + 1}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                            {st.dia} mmø Deformed Rebar{" "}
                            <span className="text-[9px] text-[#8ba3c1] print:text-slate-500 font-normal">
                              (ASTM #{Math.round(st.dia / 3.175)})
                            </span>
                          </td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{st.kg.toLocaleString()} kg</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{st.tons} MT</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{st.pct}%</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultSteelRate}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {st.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={2} style={{ padding: cellPaddingCss }} className="text-right text-white print:text-slate-900 font-bold">
                          Total Steel Rebar Quantity:
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{totals.steelKg.toLocaleString()} kg</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{totals.steelTons} MT</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">100.0%</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {defaultSteelRate}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {Math.round(totals.steelKg * defaultSteelRate).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 4: FOUNDATION / FOOTINGS BREAKDOWN */}
            {footings.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      4
                    </span>
                    Foundation Isolated Footings Breakdown Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {footings.length} Footing Mark(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Footing Mark</th>
                        <th style={{ padding: cellPaddingCss, width: "105px" }}>Size (L×B×Th)</th>
                        <th style={{ padding: cellPaddingCss, width: "45px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }}>Mix</th>
                        <th style={{ padding: cellPaddingCss }}>Reinforcement (Bottom / Top)</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {footings.map((f) => (
                        <tr key={f.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{f.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{f.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{f.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{f.totalNos}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{f.mix}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{f.rebars}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{f.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{f.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{f.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{f.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{f.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {f.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={3} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Footings Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{footings.reduce((sum, f) => sum + f.totalNos, 0)}</td>
                        <td colSpan={2}></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{footings.reduce((sum, f) => sum + f.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{footings.reduce((sum, f) => sum + f.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{footings.reduce((sum, f) => sum + f.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{footings.reduce((sum, f) => sum + f.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{footings.reduce((sum, f) => sum + f.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {footings.reduce((sum, f) => sum + f.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 4B: CAST-IN-SITU BORED PILES BREAKDOWN */}
            {situPiles.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      4B
                    </span>
                    Deep Foundation: Cast-in-Situ Bored Piles Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {situPiles.length} Item(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Pile Mark / Name</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }}>Size (Dia × L)</th>
                        <th style={{ padding: cellPaddingCss, width: "45px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }}>Mix</th>
                        <th style={{ padding: cellPaddingCss }}>Cage Reinforcement (Main & Spiral)</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Boring (BDT)</th>
                        <th style={{ padding: cellPaddingCss, width: "85px" }} className="text-right">Total (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {situPiles.map((p) => (
                        <tr key={p.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{p.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{p.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{p.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{p.pileNos}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{p.mix}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{p.mainRebars}; {p.spiralTies}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{p.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{p.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{p.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{p.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{p.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {p.boringCost.toLocaleString("en-IN")}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {p.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={3} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Bored Piles Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.pileNos, 0)}</td>
                        <td colSpan={2}></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{situPiles.reduce((sum, p) => sum + p.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">৳ {situPiles.reduce((sum, p) => sum + p.boringCost, 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {situPiles.reduce((sum, p) => sum + p.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 4C: SAND COMPACTION PILES (SCP) BREAKDOWN */}
            {sandPiles.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      4C
                    </span>
                    Soil Improvement: Sand Compaction Piles (SCP) Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {sandPiles.length} Item(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Pile Mark / Name</th>
                        <th style={{ padding: cellPaddingCss, width: "85px" }}>Land Area</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }}>Grid Spacing</th>
                        <th style={{ padding: cellPaddingCss, width: "90px" }}>Size (Dia × L)</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Sand Vol (cft)</th>
                        <th style={{ padding: cellPaddingCss, width: "80px" }} className="text-right">Sand Cost</th>
                        <th style={{ padding: cellPaddingCss, width: "80px" }} className="text-right">Rig Boring</th>
                        <th style={{ padding: cellPaddingCss, width: "90px" }} className="text-right">Total Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {sandPiles.map((sp) => (
                        <tr key={sp.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{sp.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{sp.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{sp.landArea.toLocaleString()} sq.ft</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{sp.spacing}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{sp.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{sp.numPiles}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{sp.sandCft.toLocaleString()}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {sp.sandCost.toLocaleString("en-IN")}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">৳ {sp.boringCost.toLocaleString("en-IN")}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {sp.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={5} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Sand Piles Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{sandPiles.reduce((sum, sp) => sum + sp.numPiles, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{sandPiles.reduce((sum, sp) => sum + sp.sandCft, 0).toLocaleString()}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">৳ {sandPiles.reduce((sum, sp) => sum + sp.sandCost, 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">৳ {sandPiles.reduce((sum, sp) => sum + sp.boringCost, 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {sandPiles.reduce((sum, sp) => sum + sp.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 5: COLUMNS BREAKDOWN */}
            {columns.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      5
                    </span>
                    Building RCC Columns Breakdown Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {columns.length} Column Mark(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Column Mark</th>
                        <th style={{ padding: cellPaddingCss, width: "85px" }}>Size (b×h)</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }}>Height</th>
                        <th style={{ padding: cellPaddingCss, width: "45px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss }}>Longitudinal Main Rebars</th>
                        <th style={{ padding: cellPaddingCss }}>Lateral Ties</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {columns.map((c) => (
                        <tr key={c.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{c.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{c.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{c.size}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{c.height}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{c.totalNos}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] font-bold text-[#00c2c7] print:text-blue-800">{c.mainBars}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{c.ties}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{c.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{c.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{c.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{c.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{c.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {c.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={4} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Columns Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{columns.reduce((sum, c) => sum + c.totalNos, 0)}</td>
                        <td colSpan={2}></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{columns.reduce((sum, c) => sum + c.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{columns.reduce((sum, c) => sum + c.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{columns.reduce((sum, c) => sum + c.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{columns.reduce((sum, c) => sum + c.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{columns.reduce((sum, c) => sum + c.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {columns.reduce((sum, c) => sum + c.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 6: BEAMS BREAKDOWN */}
            {beams.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      6
                    </span>
                    Structural RCC Beams Breakdown Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {beams.length} Beam Mark(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Beam Mark</th>
                        <th style={{ padding: cellPaddingCss, width: "80px" }}>Cross Sec</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }}>Span</th>
                        <th style={{ padding: cellPaddingCss, width: "45px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss }}>Main Bottom/Top Bars</th>
                        <th style={{ padding: cellPaddingCss }}>Extra Bars & Stirrups</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {beams.map((b) => (
                        <tr key={b.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{b.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{b.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{b.size}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{b.span}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{b.totalNos}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] font-bold text-[#00c2c7] print:text-blue-800">{b.mainBars}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[9.5px] text-[#8ba3c1] print:text-slate-700">{b.extraBars} | {b.stirrups}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{b.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{b.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{b.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{b.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{b.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {b.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={4} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Beams Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{beams.reduce((sum, b) => sum + b.totalNos, 0)}</td>
                        <td colSpan={2}></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{beams.reduce((sum, b) => sum + b.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{beams.reduce((sum, b) => sum + b.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{beams.reduce((sum, b) => sum + b.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{beams.reduce((sum, b) => sum + b.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{beams.reduce((sum, b) => sum + b.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {beams.reduce((sum, b) => sum + b.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 7: SLABS BREAKDOWN */}
            {slabs.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      7
                    </span>
                    Floor RCC Slabs Breakdown Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {slabs.length} Slab Panel(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Slab Mark</th>
                        <th style={{ padding: cellPaddingCss, width: "120px" }}>Dimensions (L×W×Th)</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Area (sq.ft)</th>
                        <th style={{ padding: cellPaddingCss, width: "45px" }} className="text-center">Nos</th>
                        <th style={{ padding: cellPaddingCss }}>Reinforcement (Main / Dist / Extra)</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {slabs.map((sl) => (
                        <tr key={sl.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{sl.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{sl.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{sl.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{sl.areaSqft.toLocaleString()}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-white print:text-slate-900">{sl.totalNos}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[9.5px] text-[#8ba3c1] print:text-slate-700">
                            Main: {sl.mainBars}; Dist: {sl.distBars}; Extra: {sl.extraBars}
                          </td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{sl.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{sl.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{sl.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{sl.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{sl.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {sl.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={3} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Slabs Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.areaSqft, 0).toLocaleString()}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.totalNos, 0)}</td>
                        <td></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{slabs.reduce((sum, sl) => sum + sl.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {slabs.reduce((sum, sl) => sum + sl.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 8: STAIRS BREAKDOWN */}
            {stairs.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      8
                    </span>
                    Staircase Flights Breakdown Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {stairs.length} Flight(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Flight Mark</th>
                        <th style={{ padding: cellPaddingCss, width: "130px" }}>Dimensions & Waist</th>
                        <th style={{ padding: cellPaddingCss, width: "110px" }}>Steps & Risers</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-center">Flights</th>
                        <th style={{ padding: cellPaddingCss }}>Reinforcement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Wet cft</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Stone</th>
                        <th style={{ padding: cellPaddingCss, width: "60px" }} className="text-right">Steel kg</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {stairs.map((st) => (
                        <tr key={st.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{st.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{st.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{st.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{st.steps}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{st.flights}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[9.5px] text-[#8ba3c1] print:text-slate-700">{st.rebar}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{st.wetVolCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{st.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{st.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{st.aggCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{st.steelKg}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {st.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={4} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Stairs Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">{stairs.reduce((sum, st) => sum + st.flights, 0)}</td>
                        <td></td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{stairs.reduce((sum, st) => sum + st.wetVolCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{stairs.reduce((sum, st) => sum + st.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{stairs.reduce((sum, st) => sum + st.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{stairs.reduce((sum, st) => sum + st.aggCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{stairs.reduce((sum, st) => sum + st.steelKg, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {stairs.reduce((sum, st) => sum + st.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 9: BRICKWORK BREAKDOWN */}
            {bricks.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      9
                    </span>
                    Burnt Clay Brickwork & Partition Masonry Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {bricks.length} Wall Segment(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Wall Description</th>
                        <th style={{ padding: cellPaddingCss, width: "130px" }}>Dimensions & Thickness</th>
                        <th style={{ padding: cellPaddingCss }}>Openings & Deductions</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-center">Storeys</th>
                        <th style={{ padding: cellPaddingCss, width: "85px" }} className="text-right">Bricks (Pcs)</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Cement (Bags)</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Sand (cft)</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {bricks.map((b) => (
                        <tr key={b.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{b.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{b.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{b.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{b.deductions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-white print:text-slate-900">×{b.multiplier}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f97316] print:text-slate-900">{b.bricksPcs.toLocaleString()}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{b.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{b.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {b.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={5} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Brickwork Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f97316] print:text-slate-900">{bricks.reduce((sum, b) => sum + b.bricksPcs, 0).toLocaleString()}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{bricks.reduce((sum, b) => sum + b.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{bricks.reduce((sum, b) => sum + b.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {bricks.reduce((sum, b) => sum + b.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 10: TILES BREAKDOWN */}
            {tiles.length > 0 && (
              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                      10
                    </span>
                    Floor & Skirting Tiles Schedule
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                    {tiles.length} Area Unit(s)
                  </span>
                </div>

                <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                      <tr>
                        <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                        <th style={{ padding: cellPaddingCss }}>Room / Unit Name</th>
                        <th style={{ padding: cellPaddingCss, width: "130px" }}>Dimensions & Area</th>
                        <th style={{ padding: cellPaddingCss }}>Tile Specification</th>
                        <th style={{ padding: cellPaddingCss }}>Skirting</th>
                        <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-center">Storeys</th>
                        <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Tiles (Pcs)</th>
                        <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-right">Cement</th>
                        <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-right">Sand</th>
                        <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Cost (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                      {tiles.map((t) => (
                        <tr key={t.sl} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">{t.sl}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{t.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-[10px] text-[#8ba3c1] print:text-slate-700">{t.dimensions}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{t.tileSpec}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-[10px] text-[#8ba3c1] print:text-slate-700">{t.skirting}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-white print:text-slate-900">×{t.multiplier}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#38bdf8] print:text-slate-900">{t.tilesPcs.toLocaleString()}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{t.cementBags}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{t.sandCft}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {t.cost.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                      <tr>
                        <td colSpan={6} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">Total Tiles Subtotal:</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#38bdf8] print:text-slate-900">{tiles.reduce((sum, t) => sum + t.tilesPcs, 0).toLocaleString()}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{tiles.reduce((sum, t) => sum + t.cementBags, 0)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{tiles.reduce((sum, t) => sum + t.sandCft, 0).toFixed(1)}</td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">৳ {tiles.reduce((sum, t) => sum + t.cost, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 11: ESTIMATE FILE LIST WITH ALL MATERIALS */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    11
                  </span>
                  Consolidated Estimate Files & All Materials Breakdown ({estimates.length} Sheets)
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500 font-semibold">
                  All Materials Itemized
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: cellPaddingCss, width: "25px" }} className="text-center">#</th>
                      <th style={{ padding: cellPaddingCss }}>Estimate File Title</th>
                      <th style={{ padding: cellPaddingCss, width: "65px" }}>Component</th>
                      <th style={{ padding: cellPaddingCss, width: "40px" }} className="text-center">Mult</th>
                      <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Wet cft</th>
                      <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Cement</th>
                      <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Sand</th>
                      <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Stone</th>
                      <th style={{ padding: cellPaddingCss, width: "55px" }} className="text-right">Steel kg</th>
                      <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Bricks</th>
                      <th style={{ padding: cellPaddingCss, width: "50px" }} className="text-right">Tiles</th>
                      <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Total (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {estimates.map((e, idx) => {
                      const m = extractEstimateMaterials(e);
                      return (
                        <tr key={e.id} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                          <td style={{ padding: cellPaddingCss }} className="font-mono text-center text-[#8ba3c1] print:text-slate-500">{idx + 1}</td>
                          <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">{e.name}</td>
                          <td style={{ padding: cellPaddingCss }} className="uppercase font-mono text-[9px] text-[#00c2c7] print:text-blue-800 font-bold">{e.type}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-center font-mono font-bold text-white print:text-slate-900">×{m.multiplier}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{m.wetVolCft > 0 ? m.wetVolCft : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{m.cementBags > 0 ? m.cementBags.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{m.sandCft > 0 ? m.sandCft.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">{m.aggCft > 0 ? m.aggCft.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{m.steelKg > 0 ? m.steelKg.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#fb923c] print:text-slate-900">{m.bricksPcs > 0 ? m.bricksPcs.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#2ecc71] print:text-slate-900">{m.tilesPcs > 0 ? m.tilesPcs.toLocaleString() : "-"}</td>
                          <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">৳ {Math.round(e.totalCost || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td colSpan={4} style={{ padding: cellPaddingCss }} className="font-bold text-white print:text-slate-900">
                        Total Across All Estimate Files:
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{totals.concreteVolCft.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#f5a623] print:text-slate-900">{totals.cementBags.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{Math.round(totals.sandCft).toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-white print:text-slate-900">{Math.round(totals.aggCft).toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#00c2c7] print:text-slate-900">{totals.steelKg.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#fb923c] print:text-slate-900">{totals.bricksPcs.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono font-bold text-[#2ecc71] print:text-slate-900">{totals.tilesPcs.toLocaleString()}</td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono grand-total-val">
                        ৳ {totals.grandTotalCost.toLocaleString("en-IN")}
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
                      {project.engineer || "Anonymous"}
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
                  Generated via <strong>Dolphin Box</strong> • Professional Civil Engineering Suite
                </div>
                <div>
                  Developer: <strong className="text-white print:text-slate-800">Anonymous</strong> • Standard: BNBC / ACI 318
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
