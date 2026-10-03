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
} from "lucide-react";

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
      case "zero":
        setMarginTop(0);
        setMarginBottom(0);
        setMarginLeft(0);
        setMarginRight(0);
        break;
      case "narrow":
        setMarginTop(5);
        setMarginBottom(5);
        setMarginLeft(5);
        setMarginRight(5);
        break;
      case "compact":
        setMarginTop(8);
        setMarginBottom(8);
        setMarginLeft(8);
        setMarginRight(8);
        break;
      case "standard":
        setMarginTop(15);
        setMarginBottom(15);
        setMarginLeft(15);
        setMarginRight(15);
        break;
      case "spacious":
        setMarginTop(20);
        setMarginBottom(20);
        setMarginLeft(20);
        setMarginRight(20);
        break;
      case "binding":
        setMarginTop(15);
        setMarginBottom(15);
        setMarginLeft(25);
        setMarginRight(12);
        break;
    }
  };

  // Cell padding based on density
  const cellPaddingCss =
    paddingDensity === "compact"
      ? "3px 6px"
      : paddingDensity === "normal"
      ? "6px 9px"
      : "9px 12px";

  // Section spacing class based on density
  const sectionSpacingClass =
    paddingDensity === "compact"
      ? "space-y-2"
      : paddingDensity === "normal"
      ? "space-y-3.5"
      : "space-y-5";

  // Dynamic CSS injection for direct window.print()
  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("report-modal-open");
      return;
    }

    document.body.classList.add("report-modal-open");

    const styleId = "dynamic-pdf-page-rules";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    const pageKeyword =
      pageSize === "a4" ? "A4" : pageSize === "letter" ? "letter" : "legal";

    styleTag.textContent = `
      @media print {
        @page {
          size: ${pageKeyword} ${orientation};
          margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
        }
        :root {
          --pdf-cell-padding: ${cellPaddingCss};
          --pdf-base-font-size: ${fontSizePt}px;
        }
        th, td {
          padding: ${cellPaddingCss} !important;
          font-size: ${fontSizePt}px !important;
        }
        .report-printable-content {
          padding: 0 !important;
          margin: 0 !important;
        }
      }
    `;

    return () => {
      document.body.classList.remove("report-modal-open");
      const tag = document.getElementById(styleId);
      if (tag) tag.remove();
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

  // Material aggregates & costs
  let totalCementBags = 0;
  let totalSandCft = 0;
  let totalAggCft = 0;
  let totalSteelKg = 0;
  let totalBricks = 0;
  let totalTiles = 0;

  let totalCementCost = 0;
  let totalSandCost = 0;
  let totalAggCost = 0;
  let totalSteelCost = 0;
  let totalBrickCost = 0;
  let totalTileCost = 0;

  // Default rates fallback
  let defaultCementRate = 550;
  let defaultSandRate = 45;
  let defaultAggRate = 120;
  let defaultSteelRate = 95;
  let defaultBrickRate = 12;
  let defaultTileRate = 180;

  estimates.forEach((e) => {
    const s = e.summary || {};
    const d = e.data || {};
    const r = d.rates || {};

    if (r.cementRate) defaultCementRate = r.cementRate;
    if (r.sandRate) defaultSandRate = r.sandRate;
    if (r.aggRate) defaultAggRate = r.aggRate;
    if (r.steelRate) defaultSteelRate = r.steelRate;
    if (r.brickRate) defaultBrickRate = r.brickRate;
    if (d.tilePrice) defaultTileRate = d.tilePrice;

    // Cement
    const cBags = s.cementBags || s.totalCementBags || 0;
    totalCementBags += cBags;
    const cCost =
      s.cementCost !== undefined ? s.cementCost : cBags * (r.cementRate || defaultCementRate);
    totalCementCost += cCost;

    // Sand
    const sCft =
      s.sandVolume || s.sandVol || s.sandCft || s.totalSand || s.totalSandCft || 0;
    totalSandCft += sCft;
    const sCost =
      s.sandCost !== undefined ? s.sandCost : sCft * (r.sandRate || defaultSandRate);
    totalSandCost += sCost;

    // Aggregate
    const aCft =
      s.aggregateVolume || s.aggregateVol || s.aggCft || s.totalAggCft || 0;
    totalAggCft += aCft;
    const aCost =
      (s.aggCost !== undefined ? s.aggCost : aCft * (r.aggRate || defaultAggRate)) +
      (s.picketCost || 0);
    totalAggCost += aCost;

    // Steel
    const stKg = s.totalSteel || s.totalSteelKg || 0;
    totalSteelKg += stKg;
    const stCost =
      s.steelCost !== undefined ? s.steelCost : stKg * (r.steelRate || defaultSteelRate);
    totalSteelCost += stCost;

    // Bricks
    const bQty = s.totalBricks || s.brickQty || 0;
    totalBricks += bQty;
    const bCost =
      s.brickCost !== undefined ? s.brickCost : bQty * (r.brickRate || defaultBrickRate);
    totalBrickCost += bCost;

    // Tiles
    const tQty = s.tiles || 0;
    totalTiles += tQty;
    const tCost =
      s.tileCost !== undefined ? s.tileCost : tQty * (d.tilePrice || defaultTileRate);
    totalTileCost += tCost;
  });

  // Calculate clean Unit Prices for materials (rounded to standard currencies)
  const unitPriceCement =
    totalCementBags > 0
      ? Math.round(totalCementCost / totalCementBags)
      : defaultCementRate;
  const unitPriceSand =
    totalSandCft > 0
      ? Number((totalSandCost / totalSandCft).toFixed(2))
      : defaultSandRate;
  const unitPriceAgg =
    totalAggCft > 0
      ? Number((totalAggCost / totalAggCft).toFixed(2))
      : defaultAggRate;
  const unitPriceSteel =
    totalSteelKg > 0
      ? Number((totalSteelCost / totalSteelKg).toFixed(2))
      : defaultSteelRate;
  const unitPriceBrick =
    totalBricks > 0
      ? Number((totalBrickCost / totalBricks).toFixed(2))
      : defaultBrickRate;
  const unitPriceTile =
    totalTiles > 0
      ? Number((totalTileCost / totalTiles).toFixed(2))
      : defaultTileRate;

  const totalMaterialsCost =
    totalCementCost +
    totalSandCost +
    totalAggCost +
    totalSteelCost +
    totalBrickCost +
    totalTileCost;

  const grandTotalCost = estimates.reduce(
    (sum, e) => sum + (e.totalCost || 0),
    0
  );

  // Helper to extract Unit, Unit Price, Quantity, Amount for an itemized estimate sheet
  const getEstimateItemDetails = (e: ProjectEstimateItem) => {
    let unit = "Job";
    let qty = 1;
    const s = e.summary || {};
    const d = e.data || {};

    switch (e.type) {
      case "beam":
        unit = "Nos";
        qty =
          s.totalBeamsCount ||
          (d.beams &&
            d.beams.reduce((sum: number, b: any) => sum + (b.nos || 1), 0)) ||
          1;
        break;
      case "column":
        unit = "Nos";
        qty =
          s.totalColsCount ||
          (d.cols &&
            d.cols.reduce((sum: number, c: any) => sum + (c.nos || 1), 0)) ||
          1;
        break;
      case "footing":
        unit = "Nos";
        qty =
          s.totalFtCount ||
          (d.footings &&
            d.footings.reduce((sum: number, f: any) => sum + (f.nos || 1), 0)) ||
          1;
        break;
      case "slab":
        unit = "sq.ft";
        qty = s.area || 1;
        break;
      case "stair":
        unit = "Steps";
        qty = d.numSteps || 1;
        break;
      case "brick":
        unit = "Pcs";
        qty = s.totalBricks || s.brickQty || 1;
        break;
      case "tiles":
        unit = "sq.ft";
        qty = s.area || s.tiles || 1;
        break;
      default:
        unit = "Job";
        qty = 1;
        break;
    }

    const amount = Math.round(e.totalCost || 0);
    const unitPrice = qty > 0 ? amount / qty : amount;

    return {
      unit,
      qty,
      unitPrice:
        qty > 0
          ? Number(unitPrice.toFixed(qty < 100 ? 0 : 2))
          : amount,
      amount,
    };
  };

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
  <title>${project.name} - Bill of Quantities (BOQ)</title>
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
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 0;
      margin: 0;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #007791;
      margin-bottom: 2px;
    }
    .doc-title {
      font-size: 19px;
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
      font-size: 10px;
      color: #475569;
      line-height: 1.45;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .project-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 14px;
      font-size: 10px;
    }
    .grid-label {
      font-size: 8.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
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
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
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
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    td {
      padding: ${cellPaddingCss};
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .font-bold {
      font-weight: 700;
    }
    tfoot {
      background: #f8fafc;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      display: table-footer-group;
    }
    tfoot td {
      padding: ${cellPaddingCss};
      border-bottom: none;
    }
    .grand-total-val {
      font-size: 12.5px;
      color: #047857;
      font-weight: 800;
    }
    .signatures-block {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-line {
      width: 100%;
      max-width: 220px;
      margin: 0 auto 5px auto;
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
      margin-top: 16px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
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
      <div class="brand-sub">ASHRAF CIVIL STUDIO • CIVIL & STRUCTURAL ENGINEERING</div>
      <div class="doc-title">Bill of Quantities (BOQ) & Cost Takeoff</div>
      <div class="doc-subtitle">Consolidated Materials & Component Breakdown Matrix</div>
    </div>
    <div class="meta-box">
      <div>Report Date: <strong>${new Date().toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</strong></div>
      <div>Lead Engineer: <strong>${project.engineer || "Engr. Ashraf"}</strong></div>
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
      <div class="grid-label">Calculation Sheets</div>
      <div class="grid-val">${estimates.length} Saved Takeoff File(s)</div>
    </div>
  </div>

  <div class="section-title">
    <span>1. Consolidated Structural Materials Schedule</span>
  </div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 28px" class="text-center">#</th>
          <th>Material Description & Specification</th>
          <th class="text-center" style="width: 75px">Unit</th>
          <th class="text-right" style="width: 95px">Unit Price (৳)</th>
          <th class="text-right" style="width: 95px">Quantity</th>
          <th class="text-right" style="width: 120px">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">1</td>
          <td class="font-bold">
            Portland Composite Cement (PCC)
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Standard 50 kg bags (BDS EN 197-1 CEM II)</div>
          </td>
          <td class="text-center">Bag</td>
          <td class="text-right font-mono">৳ ${unitPriceCement.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">${totalCementBags.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalCementCost).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">2</td>
          <td class="font-bold">
            Coarse & Medium Sand (Sylhet + Local)
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Fineness Modulus FM 1.5 - 2.5</div>
          </td>
          <td class="text-center">cft</td>
          <td class="text-right font-mono">৳ ${unitPriceSand}</td>
          <td class="text-right font-bold font-mono">${Math.round(totalSandCft).toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalSandCost).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">3</td>
          <td class="font-bold">
            Crushed Stone Aggregate / Picket Chips
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">3/4" down graded angular coarse aggregate</div>
          </td>
          <td class="text-center">cft</td>
          <td class="text-right font-mono">৳ ${unitPriceAgg}</td>
          <td class="text-right font-bold font-mono">${Math.round(totalAggCft).toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalAggCost).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">4</td>
          <td class="font-bold">
            High-Yield Strength Deformed Rebar
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Grade 500W / 60G Thermo-Mechanically Treated</div>
          </td>
          <td class="text-center">kg</td>
          <td class="text-right font-mono">৳ ${unitPriceSteel}</td>
          <td class="text-right font-bold font-mono">${Math.round(totalSteelKg).toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalSteelCost).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="text-center font-mono" style="color: #64748b;">5</td>
          <td class="font-bold">
            First Class Burnt Clay Bricks
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Standard Modular 9.5" × 4.5" × 2.75"</div>
          </td>
          <td class="text-center">Pcs</td>
          <td class="text-right font-mono">৳ ${unitPriceBrick}</td>
          <td class="text-right font-bold font-mono">${totalBricks.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalBrickCost).toLocaleString("en-IN")}</td>
        </tr>
        ${
          totalTiles > 0
            ? `<tr>
          <td class="text-center font-mono" style="color: #64748b;">6</td>
          <td class="font-bold">
            Floor / Wall Ceramic & Vitrified Tiles
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Finished tile surface including cuts & wastage</div>
          </td>
          <td class="text-center">Pcs</td>
          <td class="text-right font-mono">৳ ${unitPriceTile}</td>
          <td class="text-right font-bold font-mono">${totalTiles.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${Math.round(totalTileCost).toLocaleString("en-IN")}</td>
        </tr>`
            : ""
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="text-right font-bold">Consolidated Materials Subtotal Cost:</td>
          <td class="text-right grand-total-val font-mono">৳ ${Math.round(totalMaterialsCost).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="section-title">
    <span>2. Itemized Component Estimate Breakdown (${estimates.length} Sheets)</span>
  </div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 28px" class="text-center">#</th>
          <th>Estimate File Title</th>
          <th style="width: 75px">Component</th>
          <th class="text-center" style="width: 60px">Unit</th>
          <th class="text-right" style="width: 90px">Unit Price (৳)</th>
          <th class="text-right" style="width: 70px">Quantity</th>
          <th class="text-right" style="width: 115px">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        ${
          estimates.length === 0
            ? `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 16px;">No saved estimate sheets recorded for this project yet.</td></tr>`
            : estimates
                .map((e, idx) => {
                  const details = getEstimateItemDetails(e);
                  return `<tr>
          <td class="font-mono text-center" style="color: #64748b;">${idx + 1}</td>
          <td class="font-bold">
            ${e.name}
            <div style="font-size: 8.5px; font-weight: normal; color: #64748b;">Date: ${new Date(e.date).toLocaleDateString()}</div>
          </td>
          <td style="text-transform: uppercase; font-size: 9px; font-weight: 700; color: #007791;">${e.type}</td>
          <td class="text-center" style="font-size: 9.5px; color: #475569;">${details.unit}</td>
          <td class="text-right font-mono">৳ ${details.unitPrice.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${details.qty.toLocaleString()}</td>
          <td class="text-right font-bold font-mono">৳ ${details.amount.toLocaleString("en-IN")}</td>
        </tr>`;
                })
                .join("")
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="text-right font-bold">Consolidated Project Estimate Grand Total:</td>
          <td class="text-right grand-total-val font-mono">৳ ${Math.round(grandTotalCost).toLocaleString("en-IN")}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="signatures-block avoid-break">
    <div>
      <div class="sign-line">${project.engineer || "Engr. Ashraf"}</div>
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
    <div>Generated via <strong>Ashraf Civil Studio</strong> • Professional Civil Engineering Suite</div>
    <div>Designed by <strong>MD. ASHRAFUL ISLAM</strong> • Standard: BNBC / ACI 318</div>
  </div>
</body>
</html>`;
  };

  // Direct printing execution with verified page rules
  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("report-modal-open");

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
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
    link.download = `${project.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")}_boq_report_${pageSize}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export CSV with Unit, Unit Price, Quantity, Amount
  const handleExportCSV = () => {
    let csv = `ASHRAF CIVIL STUDIO - BILL OF QUANTITIES REPORT\n`;
    csv += `Project:,"${project.name}"\n`;
    csv += `Client:,"${project.client || "N/A"}"\n`;
    csv += `Location:,"${project.location || "N/A"}"\n`;
    csv += `Engineer:,"${project.engineer || "Engr. Ashraf"}"\n`;
    csv += `Date:,"${new Date().toLocaleDateString()}"\n`;
    csv += `Page Format:,"${pageSize.toUpperCase()} ${orientation.toUpperCase()}",Top Margin:,"${marginTop}mm",Bottom Margin:,"${marginBottom}mm",Left Margin:,"${marginLeft}mm",Right Margin:,"${marginRight}mm"\n\n`;

    csv += `1. CONSOLIDATED MATERIALS SCHEDULE\n`;
    csv += `SL,Material Description,Specification,Unit,Unit Price (BDT),Quantity,Amount (BDT)\n`;
    csv += `1,"Portland Composite Cement (PCC)","50 kg Bags, BDS EN 197-1 CEM II",Bag,${unitPriceCement},${totalCementBags},${Math.round(totalCementCost)}\n`;
    csv += `2,"Coarse & Medium Sand (Sylhet + Local)","Fineness Modulus FM 1.5 - 2.5",cft,${unitPriceSand},${Math.round(totalSandCft)},${Math.round(totalSandCost)}\n`;
    csv += `3,"Stone Aggregate / Picket Chips","3/4 inch down graded coarse agg",cft,${unitPriceAgg},${Math.round(totalAggCft)},${Math.round(totalAggCost)}\n`;
    csv += `4,"High-Yield Strength Deformed Rebar","500W / 60G Rebar Steel",kg,${unitPriceSteel},${Math.round(totalSteelKg)},${Math.round(totalSteelCost)}\n`;
    csv += `5,"First Class Burnt Clay Bricks","Standard Modular 9.5x4.5x2.75 in",Pcs,${unitPriceBrick},${totalBricks},${Math.round(totalBrickCost)}\n`;
    if (totalTiles > 0) {
      csv += `6,"Ceramic & Vitrified Tiles","Finished tile surface",Pcs,${unitPriceTile},${totalTiles},${Math.round(totalTileCost)}\n`;
    }
    csv += `Subtotal Material Cost,,,,,,${Math.round(totalMaterialsCost)}\n\n`;

    csv += `2. ITEMIZED COMPONENT ESTIMATE BREAKDOWN\n`;
    csv += `SL,Estimate Sheet Name,Component Type,Date,Unit,Unit Price (BDT),Quantity,Amount (BDT)\n`;
    estimates.forEach((e, i) => {
      const details = getEstimateItemDetails(e);
      csv += `${i + 1},"${e.name}",${e.type.toUpperCase()},"${new Date(e.date).toLocaleDateString()}",${details.unit},${details.unitPrice},${details.qty},${details.amount}\n`;
    });
    csv += `Grand Total Consolidated Estimated Cost,,,,,,,${Math.round(grandTotalCost)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_boq_report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="report-modal-card bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header & Actions Bar (Hidden during print) */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex flex-wrap items-center justify-between gap-2.5 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00c2c7]/20 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                BOQ Report & PDF Export Studio
              </h3>
              <p className="text-[10px] text-[#8ba3c1]">
                Project: <strong className="text-white">{project.name}</strong> •{" "}
                {estimates.length} sheets • Paper:{" "}
                <span className="text-[#00c2c7] font-bold uppercase">{pageSize}</span>{" "}
                ({orientation}) • Columns:{" "}
                <span className="text-[#2ecc71] font-semibold">Unit, Unit Price, Qty, Amount</span>
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
              <span>Page & Margin Controls</span>
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
              title="Export as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span className="hidden md:inline">CSV</span>
            </button>

            {/* Main Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-[#00c2c7]/20 active:scale-95 disabled:opacity-50"
              title="Print or Save PDF with exact margins, paper size and all columns"
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

        {/* DETAILED PDF CONTROLS PANEL: TOP, BOTTOM, LEFT, RIGHT MARGINS & A4/LETTER/LEGAL */}
        {showSettings && (
          <div className="bg-[#121c2d] border-b border-[#2d4a6a] px-4 py-3 text-xs text-[#8ba3c1] print:hidden shrink-0 space-y-3 shadow-inner">
            
            {/* Row 1: Page Size (A4, Letter, Legal), Orientation, and Margin Presets */}
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
                    title="A4 Standard: 210 × 297 mm (Standard International)"
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
                    title="Letter Standard: 8.5 × 11 in (216 × 279 mm)"
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
                    title="Legal Standard: 8.5 × 14 in (216 × 356 mm)"
                  >
                    Legal (8.5×14")
                  </button>
                </div>

                {/* Orientation: Portrait / Landscape */}
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a] ml-1">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                      orientation === "portrait"
                        ? "bg-[#f5a623] text-[#0f1c2e]"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                      orientation === "landscape"
                        ? "bg-[#f5a623] text-[#0f1c2e]"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Landscape orientation (wider tables)"
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Quick Margin Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-white">Presets:</span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("standard")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginTop === 15 &&
                      marginBottom === 15 &&
                      marginLeft === 15 &&
                      marginRight === 15
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="15 mm all sides (Standard BNBC / ACI)"
                  >
                    Normal (15mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("compact")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginTop === 8 &&
                      marginBottom === 8 &&
                      marginLeft === 8 &&
                      marginRight === 8
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="8 mm all sides (Compact economic print)"
                  >
                    Compact (8mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("narrow")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginTop === 5 &&
                      marginBottom === 5 &&
                      marginLeft === 5 &&
                      marginRight === 5
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="5 mm narrow margins (Maximizes page content)"
                  >
                    Narrow (5mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("spacious")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginTop === 20 &&
                      marginBottom === 20 &&
                      marginLeft === 20 &&
                      marginRight === 20
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="20 mm wide margins (Formal executive presentation)"
                  >
                    Wide (20mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("binding")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginLeft === 25 &&
                      marginRight === 12 &&
                      marginTop === 15 &&
                      marginBottom === 15
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Extra left margin (25mm) for punched holes & spiral folder binding"
                  >
                    Left Binding (25mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset("zero")}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                      marginTop === 0 &&
                      marginBottom === 0 &&
                      marginLeft === 0 &&
                      marginRight === 0
                        ? "bg-[#2ecc71] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Zero margins (0mm) - for borderless print or driver handling"
                  >
                    Zero (0mm)
                  </button>
                </div>
              </div>

              {/* Table Padding Density */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">Padding:</span>
                <div className="inline-flex rounded-lg bg-[#1a2b42] p-0.5 border border-[#2d4a6a]">
                  <button
                    type="button"
                    onClick={() => setPaddingDensity("compact")}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      paddingDensity === "compact"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Dense table cells (3px 6px padding)"
                  >
                    Dense (3px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaddingDensity("normal")}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      paddingDensity === "normal"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Standard table cells (6px 9px padding)"
                  >
                    Normal (6px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaddingDensity("spacious")}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      paddingDensity === "spacious"
                        ? "bg-[#f5a623] text-[#0f1c2e] font-bold"
                        : "text-[#8ba3c1] hover:text-white"
                    }`}
                    title="Roomy table cells (9px 12px padding)"
                  >
                    Roomy (9px)
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Individual TOP, BOTTOM, LEFT, RIGHT Margins with Steppers & Link */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#2d4a6a]/60 bg-[#0d1624] p-2.5 rounded-xl border border-[#243b55]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#00c2c7] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Exact Margins (mm):
                </span>

                {/* Top Margin */}
                <div className="flex items-center gap-1 bg-[#1a2b42] border border-[#2d4a6a] px-1.5 py-1 rounded-lg">
                  <ArrowUp className="w-3 h-3 text-[#f5a623]" />
                  <span className="text-[10px] font-semibold text-[#8ba3c1]">Top:</span>
                  <button
                    type="button"
                    onClick={() => stepMargin("top", -1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Decrease 1mm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginTop}
                    onChange={(e) => handleMarginChange("top", Number(e.target.value))}
                    className="w-8 bg-transparent text-white text-center font-mono font-bold text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => stepMargin("top", 1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Increase 1mm"
                  >
                    +
                  </button>
                  <span className="text-[9px] text-[#8ba3c1] pr-1">mm</span>
                </div>

                {/* Bottom Margin */}
                <div className="flex items-center gap-1 bg-[#1a2b42] border border-[#2d4a6a] px-1.5 py-1 rounded-lg">
                  <ArrowDown className="w-3 h-3 text-[#f5a623]" />
                  <span className="text-[10px] font-semibold text-[#8ba3c1]">Bottom:</span>
                  <button
                    type="button"
                    onClick={() => stepMargin("bottom", -1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Decrease 1mm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginBottom}
                    onChange={(e) => handleMarginChange("bottom", Number(e.target.value))}
                    className="w-8 bg-transparent text-white text-center font-mono font-bold text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => stepMargin("bottom", 1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Increase 1mm"
                  >
                    +
                  </button>
                  <span className="text-[9px] text-[#8ba3c1] pr-1">mm</span>
                </div>

                {/* Left Margin */}
                <div className="flex items-center gap-1 bg-[#1a2b42] border border-[#2d4a6a] px-1.5 py-1 rounded-lg">
                  <ArrowLeft className="w-3 h-3 text-[#00c2c7]" />
                  <span className="text-[10px] font-semibold text-[#8ba3c1]">Left:</span>
                  <button
                    type="button"
                    onClick={() => stepMargin("left", -1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Decrease 1mm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginLeft}
                    onChange={(e) => handleMarginChange("left", Number(e.target.value))}
                    className="w-8 bg-transparent text-white text-center font-mono font-bold text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => stepMargin("left", 1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Increase 1mm"
                  >
                    +
                  </button>
                  <span className="text-[9px] text-[#8ba3c1] pr-1">mm</span>
                </div>

                {/* Right Margin */}
                <div className="flex items-center gap-1 bg-[#1a2b42] border border-[#2d4a6a] px-1.5 py-1 rounded-lg">
                  <ArrowRight className="w-3 h-3 text-[#00c2c7]" />
                  <span className="text-[10px] font-semibold text-[#8ba3c1]">Right:</span>
                  <button
                    type="button"
                    onClick={() => stepMargin("right", -1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Decrease 1mm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={marginRight}
                    onChange={(e) => handleMarginChange("right", Number(e.target.value))}
                    className="w-8 bg-transparent text-white text-center font-mono font-bold text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => stepMargin("right", 1)}
                    className="w-4 h-4 flex items-center justify-center bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded text-[10px]"
                    title="Increase 1mm"
                  >
                    +
                  </button>
                  <span className="text-[9px] text-[#8ba3c1] pr-1">mm</span>
                </div>

                {/* Link Margins Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMarginsLinked(!isMarginsLinked)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition border ${
                    isMarginsLinked
                      ? "bg-[#00c2c7]/20 text-[#00c2c7] border-[#00c2c7]"
                      : "bg-[#1a2b42] text-[#8ba3c1] border-[#2d4a6a] hover:text-white"
                  }`}
                  title="Lock/Link all 4 margins so they update simultaneously"
                >
                  {isMarginsLinked ? (
                    <>
                      <LinkIcon className="w-3 h-3 text-[#00c2c7]" />
                      <span>Linked</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3 h-3 text-[#8ba3c1]" />
                      <span>Unlinked</span>
                    </>
                  )}
                </button>
              </div>

              {/* Font Size & Filter Sheets */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8ba3c1]">Font:</span>
                <select
                  value={fontSizePt}
                  onChange={(e) => setFontSizePt(Number(e.target.value))}
                  className="bg-[#1a2b42] text-white border border-[#2d4a6a] rounded px-2 py-1 text-[10px] outline-none"
                >
                  <option value={9}>9 pt (Ultra Dense)</option>
                  <option value={10}>10 pt (Standard)</option>
                  <option value={11}>11 pt (Large)</option>
                  <option value={12}>12 pt (Extra Large)</option>
                </select>

                {allEstimates.length > 1 && (
                  <select
                    value={selectedSheetFilter}
                    onChange={(e) => setSelectedSheetFilter(e.target.value)}
                    className="bg-[#1a2b42] text-[#00c2c7] border border-[#2d4a6a] rounded px-2 py-1 text-[10px] outline-none max-w-[140px] truncate"
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
                className="absolute inset-0 pointer-events-none border border-dashed border-sky-400/40 print:hidden z-10"
                style={{
                  top: `${marginTop}mm`,
                  bottom: `${marginBottom}mm`,
                  left: `${marginLeft}mm`,
                  right: `${marginRight}mm`,
                }}
                title={`Printable margin boundary: Top ${marginTop}mm, Bottom ${marginBottom}mm, Left ${marginLeft}mm, Right ${marginRight}mm`}
              >
                {/* Margin measurement badge */}
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
                  <span>ASHRAF CIVIL STUDIO • STRUCTURAL & CIVIL ENGINEERING</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white print:text-slate-900 tracking-tight">
                  Bill of Quantities (BOQ) & Cost Schedule
                </h1>
                <p className="text-xs text-[#8ba3c1] print:text-slate-600 mt-0.5">
                  Comprehensive Takeoff Matrix with Unit, Unit Price, Quantity & Amount Breakdown
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
                    {project.engineer || "Engr. Ashraf"}
                  </strong>
                </div>
                <div className="text-[10px] text-[#00c2c7] print:text-blue-700 font-mono font-semibold">
                  Standard: BNBC / ACI 318 Standard
                </div>
              </div>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#152033] print:bg-slate-50 border border-[#2d4a6a] print:border-slate-300 rounded-lg p-2.5">
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
                  Paper & Margins:
                </span>
                <strong className="text-white print:text-slate-900 block uppercase font-mono text-[11px]">
                  {pageSize} {orientation[0].toUpperCase()} • T:{marginTop} B:{marginBottom} L:{marginLeft} R:{marginRight}mm
                </strong>
              </div>
            </div>

            {/* Table 1: Consolidated Structural Materials Schedule */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Consolidated Structural Materials Schedule
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500">
                  Aggregated Quantities & Rates
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
                      <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Quantity</th>
                      <th style={{ padding: cellPaddingCss, width: "125px" }} className="text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {/* 1. Cement */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">1</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Portland Composite Cement (PCC)
                        <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Standard 50 kg bags (BDS EN 197-1 CEM II)
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                        Bag
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                        ৳ {unitPriceCement.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {totalCementBags.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                        ৳ {Math.round(totalCementCost).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* 2. Sand */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">2</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Coarse & Medium Sand (Sylhet + Local)
                        <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Fineness Modulus FM 1.5 - 2.5
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                        cft
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                        ৳ {unitPriceSand}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalSandCft).toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                        ৳ {Math.round(totalSandCost).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* 3. Aggregate */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">3</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        Crushed Stone Aggregate / Picket Chips
                        <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                          3/4" down graded angular coarse aggregate
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                        cft
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                        ৳ {unitPriceAgg}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalAggCft).toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                        ৳ {Math.round(totalAggCost).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* 4. Steel */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">4</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        High-Yield Strength Deformed Rebar
                        <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Grade 500W / 60G Thermo-Mechanically Treated
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                        kg
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                        ৳ {unitPriceSteel}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {Math.round(totalSteelKg).toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                        ৳ {Math.round(totalSteelCost).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* 5. Bricks */}
                    <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                      <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">5</td>
                      <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                        First Class Burnt Clay Bricks
                        <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                          Standard Modular 9.5" × 4.5" × 2.75"
                        </div>
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                        Pcs
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                        ৳ {unitPriceBrick}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                        {totalBricks.toLocaleString()}
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                        ৳ {Math.round(totalBrickCost).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* 6. Tiles (if any) */}
                    {totalTiles > 0 && (
                      <tr className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                        <td style={{ padding: cellPaddingCss }} className="text-center font-mono text-[#8ba3c1] print:text-slate-500">6</td>
                        <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                          Floor / Wall Ceramic & Vitrified Tiles
                          <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                            Finished tile surface including cuts & wastage
                          </div>
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                          Pcs
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                          ৳ {unitPriceTile}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                          {totalTiles.toLocaleString()}
                        </td>
                        <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-950 font-mono">
                          ৳ {Math.round(totalTileCost).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td colSpan={5} style={{ padding: cellPaddingCss }} className="text-right text-white print:text-slate-900 font-bold">
                        Consolidated Materials Subtotal Cost:
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right text-sm text-[#2ecc71] print:text-slate-950 font-black font-mono">
                        ৳ {Math.round(totalMaterialsCost).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Individual Itemized Component Sheets Breakdown */}
            <div className="space-y-1.5 print-avoid-break">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] print:bg-blue-100 print:text-blue-800 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Itemized Component Estimate Breakdown ({estimates.length} Sheets)
                </h4>
                <span className="text-[10px] text-[#8ba3c1] print:text-slate-500">
                  Individual Module Takeoffs
                </span>
              </div>

              <div className="border border-[#2d4a6a] print:border-slate-300 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1a2b42] print:bg-slate-100 text-[#8ba3c1] print:text-slate-700 font-bold border-b border-[#2d4a6a] print:border-slate-300">
                    <tr>
                      <th style={{ padding: cellPaddingCss, width: "28px" }} className="text-center">#</th>
                      <th style={{ padding: cellPaddingCss }}>Estimate Sheet Name</th>
                      <th style={{ padding: cellPaddingCss, width: "75px" }}>Type</th>
                      <th style={{ padding: cellPaddingCss, width: "65px" }} className="text-center">Unit</th>
                      <th style={{ padding: cellPaddingCss, width: "95px" }} className="text-right">Unit Price (৳)</th>
                      <th style={{ padding: cellPaddingCss, width: "75px" }} className="text-right">Quantity</th>
                      <th style={{ padding: cellPaddingCss, width: "125px" }} className="text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-slate-200">
                    {estimates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-[#8ba3c1] print:text-slate-500">
                          No estimate sheets saved yet for this project.
                        </td>
                      </tr>
                    ) : (
                      estimates.map((e, idx) => {
                        const details = getEstimateItemDetails(e);
                        return (
                          <tr key={e.id} className="hover:bg-[#1a2b42]/30 print:hover:bg-transparent">
                            <td style={{ padding: cellPaddingCss }} className="font-mono text-center text-[#8ba3c1] print:text-slate-500 text-[11px]">
                              {idx + 1}
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="font-semibold text-white print:text-slate-900">
                              {e.name}
                              <div className="text-[10px] font-normal text-[#8ba3c1] print:text-slate-500">
                                Date: {new Date(e.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="uppercase font-mono text-[10px] text-[#00c2c7] print:text-blue-800 font-bold">
                              {e.type}
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="text-center text-[#8ba3c1] print:text-slate-600 font-medium">
                              {details.unit}
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="text-right font-mono text-[#8ba3c1] print:text-slate-700">
                              ৳ {details.unitPrice.toLocaleString()}
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#f5a623] print:text-slate-950 font-mono">
                              {details.qty.toLocaleString()}
                            </td>
                            <td style={{ padding: cellPaddingCss }} className="text-right font-bold text-[#2ecc71] print:text-slate-900 font-mono">
                              ৳ {details.amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-[#1a2b42] print:bg-slate-100 font-bold border-t-2 border-[#00c2c7] print:border-slate-800">
                    <tr>
                      <td colSpan={6} style={{ padding: cellPaddingCss }} className="text-right text-white print:text-slate-900 font-bold">
                        Consolidated Project Grand Total Estimated Cost:
                      </td>
                      <td style={{ padding: cellPaddingCss }} className="text-right text-sm text-[#2ecc71] print:text-slate-950 font-black font-mono">
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
                  Designed by <strong className="text-white print:text-slate-800">MD. ASHRAFUL ISLAM</strong> • Standard: BNBC / ACI 318
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
