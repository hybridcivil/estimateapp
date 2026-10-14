import { ProjectEstimateItem } from "../types";

export interface ComponentMaterialAllocation {
  key: string;
  label: string;
  category: "structural" | "finishing" | "other";
  count: number;
  unit: string;
  concreteVolCft: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  steelKg: number;
  bricksPcs: number;
  tilesPcs: number;
  cost: number;
}

export interface FootingRow {
  sl: number;
  name: string;
  dimensions: string;
  nos: number;
  multiplier: number;
  totalNos: number;
  wetVolCft: number;
  mix: string;
  rebars: string;
  steelKg: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  cost: number;
}

export interface ColumnRow {
  sl: number;
  name: string;
  size: string;
  height: string;
  nos: number;
  multiplier: number;
  totalNos: number;
  wetVolCft: number;
  mix: string;
  mainBars: string;
  ties: string;
  steelKg: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  cost: number;
}

export interface BeamRow {
  sl: number;
  name: string;
  size: string;
  span: string;
  nos: number;
  multiplier: number;
  totalNos: number;
  wetVolCft: number;
  mix: string;
  mainBars: string;
  extraBars: string;
  stirrups: string;
  steelKg: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  cost: number;
}

export interface SlabRow {
  sl: number;
  name: string;
  dimensions: string;
  nos: number;
  multiplier: number;
  totalNos: number;
  areaSqft: number;
  wetVolCft: number;
  mix: string;
  mainBars: string;
  distBars: string;
  extraBars: string;
  steelKg: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  cost: number;
}

export interface StairRow {
  sl: number;
  name: string;
  dimensions: string;
  steps: string;
  flights: number;
  wetVolCft: number;
  mix: string;
  rebar: string;
  steelKg: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  cost: number;
}

export interface BrickRow {
  sl: number;
  name: string;
  dimensions: string;
  deductions: string;
  multiplier: number;
  bricksPcs: number;
  cementBags: number;
  sandCft: number;
  cost: number;
}

export interface TileRow {
  sl: number;
  name: string;
  dimensions: string;
  tileSpec: string;
  skirting: string;
  multiplier: number;
  tilesPcs: number;
  cementBags: number;
  sandCft: number;
  cost: number;
}

export interface SituPileRow {
  sl: number;
  name: string;
  pileNos: number;
  dimensions: string;
  mix: string;
  mainRebars: string;
  spiralTies: string;
  wetVolCft: number;
  cementBags: number;
  sandCft: number;
  aggCft: number;
  steelKg: number;
  boringCost: number;
  cost: number;
}

export interface SandPileRow {
  sl: number;
  name: string;
  landArea: number;
  numPiles: number;
  dimensions: string;
  spacing: string;
  sandCft: number;
  sandCost: number;
  boringCost: number;
  cost: number;
}

export interface SteelDiaBreakdown {
  dia: number;
  kg: number;
  tons: number;
  pct: number;
  cost: number;
}

export interface FullProjectBreakdown {
  allocations: ComponentMaterialAllocation[];
  footings: FootingRow[];
  situPiles: SituPileRow[];
  sandPiles: SandPileRow[];
  columns: ColumnRow[];
  beams: BeamRow[];
  slabs: SlabRow[];
  stairs: StairRow[];
  bricks: BrickRow[];
  tiles: TileRow[];
  steelBreakdown: SteelDiaBreakdown[];
  totals: {
    concreteVolCft: number;
    cementBags: number;
    sandCft: number;
    aggCft: number;
    steelKg: number;
    steelTons: number;
    bricksPcs: number;
    tilesPcs: number;
    materialsCost: number;
    grandTotalCost: number;
  };
}

export interface EstimateMaterials {
  cementBags: number;
  sandCft: number;
  aggCft: number;
  steelKg: number;
  bricksPcs: number;
  tilesPcs: number;
  wetVolCft: number;
  multiplier: number;
}

export function extractEstimateMaterials(est: ProjectEstimateItem): EstimateMaterials {
  const s = est.summary || {};
  const d = est.data || {};
  const mult = Math.max(1, s.multiplier || d.multiplier || 1);

  const cementBags = Math.ceil(
    s.multipliedCementBags || s.cementBags || s.totalCementBags || 0
  );
  const sandCft = Number(
    (
      s.multipliedSandCft ||
      s.sandVolume ||
      s.sandVol ||
      s.sandCft ||
      s.totalSandVolume ||
      s.totalSand ||
      s.totalSandCft ||
      s.totalVolume || // sand pile
      0
    ).toFixed(1)
  );
  const aggCft = Number(
    (
      s.multipliedAggCft ||
      s.aggregateVolume ||
      s.aggregateVol ||
      s.aggCft ||
      s.totalAggregateVolume ||
      s.totalAggCft ||
      0
    ).toFixed(1)
  );
  const steelKg = Math.round(
    s.multipliedSteelKg || s.totalSteelKg || s.totalSteel || s.totalSteelWeight || 0
  );
  const bricksPcs = Math.round(
    s.multipliedBricks || s.totalBricks || s.brickQty || s.bricksPcs || 0
  );
  const tilesPcs = Math.round(
    s.multipliedTilePieces || s.tiles || s.totalTiles || s.tilesPcs || 0
  );
  const wetVolCft = Number(
    (
      s.wetVolCft ||
      s.totalWetVolume ||
      s.totalWetVol ||
      s.wetVolume ||
      0
    ).toFixed(1)
  );

  return {
    cementBags,
    sandCft,
    aggCft,
    steelKg,
    bricksPcs,
    tilesPcs,
    wetVolCft,
    multiplier: mult,
  };
}

export function computeFullProjectBreakdown(
  estimates: ProjectEstimateItem[],
  defaultRates = {
    cementRate: 550,
    sandRate: 45,
    aggRate: 120,
    steelRate: 95,
    brickRate: 12,
    tileRate: 180,
  }
): FullProjectBreakdown {
  const footings: FootingRow[] = [];
  const situPiles: SituPileRow[] = [];
  const sandPiles: SandPileRow[] = [];
  const columns: ColumnRow[] = [];
  const beams: BeamRow[] = [];
  const slabs: SlabRow[] = [];
  const stairs: StairRow[] = [];
  const bricks: BrickRow[] = [];
  const tiles: TileRow[] = [];

  const rawSteelByDia: Record<number, number> = {};

  // Component allocations matrix
  const allocationMap: Record<string, ComponentMaterialAllocation> = {
    footing: {
      key: "footing",
      label: "Foundation Isolated Footings",
      category: "structural",
      count: 0,
      unit: "Nos",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    situ_pile: {
      key: "situ_pile",
      label: "Cast-in-Situ Bored Piles",
      category: "structural",
      count: 0,
      unit: "Piles",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    sand_pile: {
      key: "sand_pile",
      label: "Sand Compaction Piles (SCP)",
      category: "structural",
      count: 0,
      unit: "Piles",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    column: {
      key: "column",
      label: "Building RCC Columns",
      category: "structural",
      count: 0,
      unit: "Nos",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    beam: {
      key: "beam",
      label: "Structural RCC Beams",
      category: "structural",
      count: 0,
      unit: "Nos",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    slab: {
      key: "slab",
      label: "Floor RCC Slabs",
      category: "structural",
      count: 0,
      unit: "sq.ft",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    stair: {
      key: "stair",
      label: "Staircase RCC Flights",
      category: "structural",
      count: 0,
      unit: "Flights",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    brick: {
      key: "brick",
      label: "Burnt Clay Brickwork & Plaster",
      category: "finishing",
      count: 0,
      unit: "Pcs",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    tiles: {
      key: "tiles",
      label: "Ceramic & Vitrified Floor Tiles",
      category: "finishing",
      count: 0,
      unit: "Pcs",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
    other: {
      key: "other",
      label: "Other Structural Takeoffs",
      category: "other",
      count: 0,
      unit: "Job",
      concreteVolCft: 0,
      cementBags: 0,
      sandCft: 0,
      aggCft: 0,
      steelKg: 0,
      bricksPcs: 0,
      tilesPcs: 0,
      cost: 0,
    },
  };

  estimates.forEach((est) => {
    const s = est.summary || {};
    const d = est.data || {};
    const mult = Math.max(1, s.multiplier || d.multiplier || 1);
    const cost = Math.round(est.totalCost || 0);

    const cBags = s.multipliedCementBags || s.cementBags || s.totalCementBags || 0;
    const sCft = s.multipliedSandCft || s.sandVolume || s.sandVol || s.sandCft || s.totalSand || s.totalSandCft || 0;
    const aCft = s.multipliedAggCft || s.aggregateVolume || s.aggregateVol || s.aggCft || s.totalAggCft || 0;
    const stKg = s.multipliedSteelKg || s.totalSteelKg || s.totalSteel || 0;
    const bQty = s.multipliedBricks || s.totalBricks || s.brickQty || 0;
    const tQty = s.multipliedTilePieces || s.tiles || 0;
    const wVol = s.wetVolCft || s.totalWetVol || 0;

    // Track steel diameters
    if (s.steelBreakdown && typeof s.steelBreakdown === "object") {
      Object.entries(s.steelBreakdown).forEach(([diaStr, weight]) => {
        const dia = Number(diaStr);
        if (!isNaN(dia) && dia > 0 && typeof weight === "number") {
          rawSteelByDia[dia] = (rawSteelByDia[dia] || 0) + weight;
        }
      });
    }

    // Accumulate to allocation map
    const allocKey = allocationMap[est.type] ? est.type : "other";
    const alloc = allocationMap[allocKey];
    alloc.cost += cost;
    alloc.cementBags += cBags;
    alloc.sandCft += sCft;
    alloc.aggCft += aCft;
    alloc.steelKg += stKg;
    alloc.bricksPcs += bQty;
    alloc.tilesPcs += tQty;
    alloc.concreteVolCft += wVol;

    // 1. FOOTINGS
    if (est.type === "footing") {
      const ftList: any[] = Array.isArray(d.footings) && d.footings.length > 0 ? d.footings : [];
      if (ftList.length > 0) {
        const totalBaseVol = ftList.reduce(
          (acc, f) => acc + (f.length || 7.5) * (f.breadth || 7.5) * (f.thickness || 1.5) * (f.nos || 1),
          0
        );
        ftList.forEach((f, idx) => {
          const itemBaseVol = (f.length || 7.5) * (f.breadth || 7.5) * (f.thickness || 1.5) * (f.nos || 1);
          const ratio = totalBaseVol > 0 ? itemBaseVol / totalBaseVol : 1 / ftList.length;
          const rebarStr = Array.isArray(f.rebars)
            ? f.rebars.map((r: any) => `${r.role === "top" ? "Top" : "Btm"}: ${r.dia}mmø @ ${r.spacing}" c/c`).join("; ")
            : "Btm: 16mmø @ 5\" c/c";

          const thickIn = Math.round((f.thickness || 1.5) * 12);
          const totalNos = (f.nos || 1) * mult;
          alloc.count += totalNos;

          footings.push({
            sl: footings.length + 1,
            name: f.name || `F${idx + 1}`,
            dimensions: `${f.length || 7.5}' × ${f.breadth || 7.5}' × ${thickIn}"`,
            nos: f.nos || 1,
            multiplier: mult,
            totalNos,
            wetVolCft: Number((wVol * ratio).toFixed(1)),
            mix: f.mix || "1:1.5:3",
            rebars: rebarStr,
            steelKg: Math.round(stKg * ratio),
            cementBags: Math.ceil(cBags * ratio),
            sandCft: Number((sCft * ratio).toFixed(1)),
            aggCft: Number((aCft * ratio).toFixed(1)),
            cost: Math.round(cost * ratio),
          });
        });
      } else {
        const totalNos = s.totalFtCount || 8;
        alloc.count += totalNos;
        footings.push({
          sl: footings.length + 1,
          name: est.name || "Isolated Footings F1-F8",
          dimensions: "7.5' × 7.5' × 18\"",
          nos: Math.round(totalNos / mult) || 8,
          multiplier: mult,
          totalNos,
          wetVolCft: wVol,
          mix: "1:1.5:3",
          rebars: "Btm: 16mmø @ 5\" c/c; Top: 12mmø @ 6\" c/c",
          steelKg: Math.round(stKg),
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          aggCft: Number(aCft.toFixed(1)),
          cost,
        });
      }
    }

    // 1b. CAST-IN-SITU BORED PILES
    else if (est.type === "situ_pile") {
      const pNos = s.pileNos || d.pileNos || 24;
      const pLen = s.pileLength || d.pileLength || 50;
      const pDia = s.pileDiameter || d.pileDiameter || 20;
      const bSize = d.barSize || 20;
      const bNos = d.barNos || 8;
      const spDia = d.spiralDia || 8;
      const spSpacing = d.spiralSpacing || 5;
      const mix = d.mixRatio || "1:1.5:3";
      const boringCost = s.constructionCost || Math.round(pLen * (d.constructionCostPerFoot || 200) * pNos);

      alloc.count += pNos;

      situPiles.push({
        sl: situPiles.length + 1,
        name: est.name || `Cast-in-Situ Bored Pile (${pNos} Nos)`,
        pileNos: pNos,
        dimensions: `${pDia}"ø × ${pLen}' Depth`,
        mix,
        mainRebars: `${bNos} Nos × ${bSize}mmø (with 50d lap)`,
        spiralTies: `${spDia}mmø spiral @ ${spSpacing}" pitch`,
        wetVolCft: Number((wVol || s.wetVolCft || s.totalWetVolume || 0).toFixed(1)),
        cementBags: Math.ceil(cBags || s.cementBags || s.totalCementBags || 0),
        sandCft: Number((sCft || s.sandCft || s.totalSandVolume || 0).toFixed(1)),
        aggCft: Number((aCft || s.aggCft || s.totalAggregateVolume || 0).toFixed(1)),
        steelKg: Math.round(stKg || s.totalSteelKg || s.totalSteelWeight || 0),
        boringCost,
        cost,
      });
    }

    // 1c. SAND COMPACTION PILES (SCP)
    else if (est.type === "sand_pile") {
      const pNos = s.numPiles || d.numPiles || Math.ceil((d.landArea || 2160) / Math.pow((d.pileSpacing || 48) / 12, 2));
      const pLen = s.pileLength || d.pileLength || 20;
      const pDia = s.pileDiameter || d.pileDiameter || 10;
      const pSpacing = s.pileSpacing || d.pileSpacing || 48;
      const lArea = d.landArea || Math.round(pNos * Math.pow(pSpacing / 12, 2));
      const sCost = s.totalSandCost || Math.round((s.sandCft || 0) * (d.costPerCft || 45));
      const boringCost = s.totalPileCost || Math.round(pNos * pLen * (d.costPerFoot || 30));

      alloc.count += pNos;

      sandPiles.push({
        sl: sandPiles.length + 1,
        name: est.name || `Sand Compaction Piles (${pNos} Nos)`,
        landArea: lArea,
        numPiles: pNos,
        dimensions: `${pDia}"ø × ${pLen}' Length`,
        spacing: `${pSpacing}" c/c (${(pSpacing / 12).toFixed(1)}' grid)`,
        sandCft: Number((sCft || s.sandCft || s.totalVolume || 0).toFixed(1)),
        sandCost: sCost,
        boringCost,
        cost,
      });
    }

    // 2. COLUMNS
    else if (est.type === "column") {
      const colList: any[] = Array.isArray(d.columns) && d.columns.length > 0 ? d.columns : [];
      if (colList.length > 0) {
        const totalBaseVol = colList.reduce((acc, c) => {
          let b = 1, h = 1.25;
          if (c.size && typeof c.size === "string") {
            const parts = c.size.toLowerCase().split("x").map((p: string) => parseFloat(p));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              b = parts[0] / 12;
              h = parts[1] / 12;
            }
          }
          return acc + b * h * (c.height || 10) * (c.nos || 1);
        }, 0);

        colList.forEach((c, idx) => {
          let b = 1, h = 1.25;
          let sizeStr = "12\" × 15\"";
          if (c.size && typeof c.size === "string") {
            const parts = c.size.toLowerCase().split("x").map((p: string) => parseFloat(p));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              b = parts[0] / 12;
              h = parts[1] / 12;
              sizeStr = `${parts[0]}" × ${parts[1]}"`;
            } else {
              sizeStr = c.size;
            }
          }
          const itemBaseVol = b * h * (c.height || 10) * (c.nos || 1);
          const ratio = totalBaseVol > 0 ? itemBaseVol / totalBaseVol : 1 / colList.length;

          const mainBars = Array.isArray(c.rebars)
            ? c.rebars.map((r: any) => `${r.nos}-${r.dia}mmø`).join(" + ")
            : "4-20mmø + 4-16mmø";
          const ties = `${c.stirrupDia || 10}mmø @ ${c.stirrupSpacing || 5}" c/c`;
          const totalNos = (c.nos || 1) * mult;
          alloc.count += totalNos;

          columns.push({
            sl: columns.length + 1,
            name: c.name || `C${idx + 1}`,
            size: sizeStr,
            height: `${c.height || 10} ft`,
            nos: c.nos || 1,
            multiplier: mult,
            totalNos,
            wetVolCft: Number((wVol * ratio).toFixed(1)),
            mix: c.mix || "1:1.5:3",
            mainBars,
            ties,
            steelKg: Math.round(stKg * ratio),
            cementBags: Math.ceil(cBags * ratio),
            sandCft: Number((sCft * ratio).toFixed(1)),
            aggCft: Number((aCft * ratio).toFixed(1)),
            cost: Math.round(cost * ratio),
          });
        });
      } else {
        const totalNos = s.totalColsCount || 12 * mult;
        alloc.count += totalNos;
        columns.push({
          sl: columns.length + 1,
          name: est.name || "Main Columns C1-C12",
          size: "12\" × 15\"",
          height: "10 ft",
          nos: Math.round(totalNos / mult) || 12,
          multiplier: mult,
          totalNos,
          wetVolCft: wVol,
          mix: "1:1.5:3",
          mainBars: "4-20mmø + 4-16mmø",
          ties: "10mmø @ 5\" c/c",
          steelKg: Math.round(stKg),
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          aggCft: Number(aCft.toFixed(1)),
          cost,
        });
      }
    }

    // 3. BEAMS
    else if (est.type === "beam") {
      const beamList: any[] = Array.isArray(d.beams) && d.beams.length > 0 ? d.beams : [];
      if (beamList.length > 0) {
        const totalBaseVol = beamList.reduce((acc, b) => {
          const w = (b.width || 12) / 12;
          const dep = (b.depth || 18) / 12;
          return acc + w * dep * (b.length || 22) * (b.nos || 1);
        }, 0);

        beamList.forEach((b, idx) => {
          const w = (b.width || 12) / 12;
          const dep = (b.depth || 18) / 12;
          const itemBaseVol = w * dep * (b.length || 22) * (b.nos || 1);
          const ratio = totalBaseVol > 0 ? itemBaseVol / totalBaseVol : 1 / beamList.length;

          const mainBars = Array.isArray(b.mainBars)
            ? b.mainBars.map((m: any) => `${m.qty}-${m.dia}mmø`).join(" + ")
            : "3-16mmø + 2-20mmø";
          const extraParts: string[] = [];
          if (b.extraTopBars && b.extraTopBars.nos) {
            extraParts.push(`Top: ${b.extraTopBars.nos}-${b.extraTopBars.dia || 16}mmø`);
          }
          if (b.extraBottomBars && b.extraBottomBars.nos) {
            extraParts.push(`Btm: ${b.extraBottomBars.nos}-${b.extraBottomBars.dia || 16}mmø`);
          }
          const extraBars = extraParts.length > 0 ? extraParts.join("; ") : "—";
          const stirrups = `10mmø @ ${b.stirrupSpacing || 6}" c/c`;
          const totalNos = (b.nos || 1) * mult;
          alloc.count += totalNos;

          beams.push({
            sl: beams.length + 1,
            name: b.name || `B${idx + 1}`,
            size: `${b.width || 12}" × ${b.depth || 18}"`,
            span: `${b.length || 22} ft`,
            nos: b.nos || 1,
            multiplier: mult,
            totalNos,
            wetVolCft: Number((wVol * ratio).toFixed(1)),
            mix: b.mix || "1:1.5:3",
            mainBars,
            extraBars,
            stirrups,
            steelKg: Math.round(stKg * ratio),
            cementBags: Math.ceil(cBags * ratio),
            sandCft: Number((sCft * ratio).toFixed(1)),
            aggCft: Number((aCft * ratio).toFixed(1)),
            cost: Math.round(cost * ratio),
          });
        });
      } else {
        const totalNos = s.totalBeamsCount || 8 * mult;
        alloc.count += totalNos;
        beams.push({
          sl: beams.length + 1,
          name: est.name || "Structural Beams B1-B8",
          size: "12\" × 18\"",
          span: "22 ft",
          nos: Math.round(totalNos / mult) || 8,
          multiplier: mult,
          totalNos,
          wetVolCft: wVol,
          mix: "1:1.5:3",
          mainBars: "3-16mmø + 2-20mmø",
          extraBars: "Top: 2-16mmø; Btm: 2-16mmø",
          stirrups: "10mmø @ 6\" c/c",
          steelKg: Math.round(stKg),
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          aggCft: Number(aCft.toFixed(1)),
          cost,
        });
      }
    }

    // 4. SLABS
    else if (est.type === "slab") {
      const slabList: any[] = Array.isArray(d.slabs) && d.slabs.length > 0 ? d.slabs : [];
      if (slabList.length > 0) {
        slabList.forEach((sl, idx) => {
          const area = (sl.length || 22) * (sl.width || 16) * (sl.nos || 1) * mult;
          alloc.count += area;
          slabs.push({
            sl: slabs.length + 1,
            name: sl.name || `S${idx + 1}`,
            dimensions: `${sl.length || 22}' × ${sl.width || 16}' (${sl.thicknessIn || 5}" thk)`,
            nos: sl.nos || 1,
            multiplier: mult,
            totalNos: (sl.nos || 1) * mult,
            areaSqft: area,
            wetVolCft: wVol,
            mix: sl.mixRatio || "1:1.5:3",
            mainBars: `${sl.mainBar || 10}mmø @ ${sl.spacingIn || 5}" c/c`,
            distBars: `${sl.distBar || 10}mmø @ ${sl.distSpacingIn || 6}" c/c`,
            extraBars: sl.extraBarsNum ? `${sl.extraBarsNum}-${sl.extraBar || 10}mmø` : "—",
            steelKg: Math.round(stKg),
            cementBags: Math.ceil(cBags),
            sandCft: Number(sCft.toFixed(1)),
            aggCft: Number(aCft.toFixed(1)),
            cost,
          });
        });
      } else {
        const area = (s.area || 1400) * mult;
        alloc.count += area;
        slabs.push({
          sl: slabs.length + 1,
          name: est.name || "Floor RCC Slabs S1-S4",
          dimensions: "22' × 16' (5\" thk)",
          nos: 4,
          multiplier: mult,
          totalNos: 4 * mult,
          areaSqft: area,
          wetVolCft: wVol,
          mix: "1:1.5:3",
          mainBars: "10mmø @ 5\" c/c",
          distBars: "10mmø @ 6\" c/c",
          extraBars: "2-10mmø",
          steelKg: Math.round(stKg),
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          aggCft: Number(aCft.toFixed(1)),
          cost,
        });
      }
    }

    // 5. STAIRS
    else if (est.type === "stair") {
      const stairList: any[] = Array.isArray(d.stairs) && d.stairs.length > 0 ? d.stairs : [];
      if (stairList.length > 0) {
        stairList.forEach((st, idx) => {
          const flightsCount = (st.nos || 2) * mult;
          alloc.count += flightsCount;
          stairs.push({
            sl: stairs.length + 1,
            name: st.name || `Flight ${idx + 1}`,
            dimensions: `${st.lengthFeet || 16}'${st.lengthInches || 4}" × ${st.widthFeet || 8}'${st.widthInches || 0}" (${st.thicknessIn || 6}" Waist)`,
            steps: `${st.risers || 20} Risers @ ${st.riserHeightIn || 5.5}", ${st.treads || 19} Treads @ ${st.treadWidthIn || 10}"`,
            flights: flightsCount,
            wetVolCft: wVol,
            mix: st.mixRatio || "1:1.5:3",
            rebar: `Main: ${st.mainBar || 12}mmø @ ${st.mainSpacingIn || 5}", Dist: ${st.distBar || 10}mmø @ ${st.distSpacingIn || 5}"`,
            steelKg: Math.round(stKg),
            cementBags: Math.ceil(cBags),
            sandCft: Number(sCft.toFixed(1)),
            aggCft: Number(aCft.toFixed(1)),
            cost,
          });
        });
      } else {
        alloc.count += mult;
        stairs.push({
          sl: stairs.length + 1,
          name: est.name || "Doglegged Staircase Flights",
          dimensions: "16'4\" × 8'0\" (6\" Waist)",
          steps: "20 Risers @ 5.5\", 19 Treads @ 10\"",
          flights: mult * 2,
          wetVolCft: wVol,
          mix: "1:1.5:3",
          rebar: "Main: 12mmø @ 5\", Dist: 10mmø @ 5\"",
          steelKg: Math.round(stKg),
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          aggCft: Number(aCft.toFixed(1)),
          cost,
        });
      }
    }

    // 6. BRICK
    else if (est.type === "brick") {
      const wallList: any[] = Array.isArray(d.walls) && d.walls.length > 0 ? d.walls : [];
      alloc.count += bQty;
      if (wallList.length > 0) {
        wallList.forEach((w, idx) => {
          const ded: string[] = [];
          if (w.doorCount) ded.push(`${w.doorCount} Doors (${w.doorWidth}'×${w.doorHeight}')`);
          if (w.windowCount) ded.push(`${w.windowCount} Windows (${w.windowWidth}'×${w.windowHeight}')`);
          bricks.push({
            sl: bricks.length + 1,
            name: w.name || `Wall Panel ${idx + 1}`,
            dimensions: `${w.length || 40}' × ${w.height || 10}' (${w.wallThickness || 5}" thk)`,
            deductions: ded.length > 0 ? ded.join(", ") : "None",
            multiplier: mult,
            bricksPcs: bQty,
            cementBags: Math.ceil(cBags),
            sandCft: Number(sCft.toFixed(1)),
            cost,
          });
        });
      } else {
        bricks.push({
          sl: bricks.length + 1,
          name: est.name || "External & Partition Brickwork",
          dimensions: "40' × 10' (10\" & 5\" Brickwork)",
          deductions: "4 Doors, 6 Windows",
          multiplier: mult,
          bricksPcs: bQty,
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          cost,
        });
      }
    }

    // 7. TILES
    else if (est.type === "tiles") {
      const roomList: any[] = Array.isArray(d.rooms) && d.rooms.length > 0 ? d.rooms : [];
      alloc.count += tQty;
      if (roomList.length > 0) {
        roomList.forEach((rm, idx) => {
          tiles.push({
            sl: tiles.length + 1,
            name: rm.name || `Unit ${idx + 1}`,
            dimensions: `${rm.length || 40}' × ${rm.width || 30}' (${(rm.length || 40) * (rm.width || 30)} sq.ft)`,
            tileSpec: `${rm.tileSize || 2}' × ${rm.tileSize || 2}' Tiles (৳${rm.tilePrice || 180}/pc)`,
            skirting: rm.includeSkirting ? `${rm.skirtingHeight || 4}" Skirting` : "None",
            multiplier: mult,
            tilesPcs: tQty,
            cementBags: Math.ceil(cBags),
            sandCft: Number(sCft.toFixed(1)),
            cost,
          });
        });
      } else {
        tiles.push({
          sl: tiles.length + 1,
          name: est.name || "Floor & Skirting Tiles",
          dimensions: "40' × 30' (1,200 sq.ft)",
          tileSpec: "2' × 2' Vitrified Tiles",
          skirting: "4\" Skirting",
          multiplier: mult,
          tilesPcs: tQty,
          cementBags: Math.ceil(cBags),
          sandCft: Number(sCft.toFixed(1)),
          cost,
        });
      }
    }
  });

  // Calculate totals across allocations
  const activeAllocations = Object.values(allocationMap).filter(
    (a) => a.cost > 0 || a.cementBags > 0 || a.steelKg > 0 || a.bricksPcs > 0 || a.tilesPcs > 0
  );

  let totalConcrete = 0;
  let totalCement = 0;
  let totalSand = 0;
  let totalAgg = 0;
  let totalSteel = 0;
  let totalBricks = 0;
  let totalTiles = 0;
  let totalCost = 0;

  activeAllocations.forEach((a) => {
    totalConcrete += a.concreteVolCft;
    totalCement += a.cementBags;
    totalSand += a.sandCft;
    totalAgg += a.aggCft;
    totalSteel += a.steelKg;
    totalBricks += a.bricksPcs;
    totalTiles += a.tilesPcs;
    totalCost += a.cost;
  });

  // Rebar diameters array sorted descending
  const steelBreakdown: SteelDiaBreakdown[] = Object.entries(rawSteelByDia)
    .map(([diaStr, kg]) => {
      const dia = Number(diaStr);
      const roundedKg = Math.round(kg);
      return {
        dia,
        kg: roundedKg,
        tons: Number((roundedKg / 1000).toFixed(3)),
        pct: totalSteel > 0 ? Number(((roundedKg / totalSteel) * 100).toFixed(1)) : 0,
        cost: Math.round(roundedKg * defaultRates.steelRate),
      };
    })
    .sort((a, b) => b.dia - a.dia);

  // If no diameter breakdown was recorded in summary, provide BNBC standard ratio estimation
  if (steelBreakdown.length === 0 && totalSteel > 0) {
    const defaultDist = [
      { dia: 20, pct: 40 },
      { dia: 16, pct: 35 },
      { dia: 12, pct: 15 },
      { dia: 10, pct: 10 },
    ];
    defaultDist.forEach((d) => {
      const kg = Math.round((totalSteel * d.pct) / 100);
      steelBreakdown.push({
        dia: d.dia,
        kg,
        tons: Number((kg / 1000).toFixed(3)),
        pct: d.pct,
        cost: Math.round(kg * defaultRates.steelRate),
      });
    });
  }

  const materialsCost =
    totalCement * defaultRates.cementRate +
    totalSand * defaultRates.sandRate +
    totalAgg * defaultRates.aggRate +
    totalSteel * defaultRates.steelRate +
    totalBricks * defaultRates.brickRate +
    totalTiles * defaultRates.tileRate;

  return {
    allocations: activeAllocations,
    footings,
    situPiles,
    sandPiles,
    columns,
    beams,
    slabs,
    stairs,
    bricks,
    tiles,
    steelBreakdown,
    totals: {
      concreteVolCft: Number(totalConcrete.toFixed(1)),
      cementBags: totalCement,
      sandCft: Number(totalSand.toFixed(1)),
      aggCft: Number(totalAgg.toFixed(1)),
      steelKg: Math.round(totalSteel),
      steelTons: Number((totalSteel / 1000).toFixed(3)),
      bricksPcs: totalBricks,
      tilesPcs: totalTiles,
      materialsCost: Math.round(materialsCost),
      grandTotalCost: Math.round(totalCost),
    },
  };
}

export interface ItemMaterialsReport {
  cementBags: number;
  cementCost: number;
  sandCft: number;
  sandCost: number;
  aggCft: number;
  aggCost: number;
  aggType: "stone" | "brick_khoa" | "aggregate";
  steelKg: number;
  steelCost: number;
  steelBreakdown: Record<string, number>;
  bricksPcs: number;
  brickCost: number;
  tilesPcs: number;
  tilesBoxes: number;
  tilesCost: number;
  tileAreaSqft: number;
  wetVolCft: number;
  dryVolCft: number;
  pilesCount: number;
  pileLengthFt: number;
  pileDiameterIn: number;
  boringRft: number;
  boringCost: number;
  mixRatio: string;
  itemCount: number;
  multiplier: number;
  isMultiplying: boolean;
  totalCost: number;
  rates: {
    cementRate: number;
    sandRate: number;
    aggRate: number;
    steelRate: number;
    brickRate: number;
    tileRate: number;
    boringRatePerFt?: number;
    sandPileCostPerFt?: number;
  };
  specifications: string[];
}

export const DEFAULT_MATERIAL_RATES = {
  cementRate: 550,
  sandRate: 45,
  aggRate: 120,
  steelRate: 95,
  brickRate: 15,
  tileRate: 180,
  boringRatePerFt: 180,
  sandPileCostPerFt: 120,
};

/**
 * Extracts complete, normalized materials and specifications for any estimate file item.
 * Foundation items (footing, situ_pile, sand_pile) are substructure used once (multiplier = 1).
 */
export function extractItemMaterials(
  est: ProjectEstimateItem,
  overrideRates?: Partial<typeof DEFAULT_MATERIAL_RATES>
): ItemMaterialsReport {
  const s = est.summary || {};
  const d = est.data || {};

  // Foundation elements (footing, situ_pile, sand_pile) are substructure and used only once (no storey multiplication)
  const isFoundation = est.type === "footing" || est.type === "situ_pile" || est.type === "sand_pile";
  const mult = isFoundation ? 1 : Math.max(1, s.multiplier || d.multiplier || 1);
  const isMultiplying = isFoundation ? false : Boolean(s.isMultiplying ?? d.isMultiplying ?? mult > 1);

  // Extract saved or default rates with overrideRates taking highest precedence
  const savedRates = d.rates || {};
  const cementRate = Number(overrideRates?.cementRate ?? savedRates.cementRate ?? d.cementRate ?? s.cementRate ?? DEFAULT_MATERIAL_RATES.cementRate);
  const sandRate = Number(overrideRates?.sandRate ?? savedRates.sandRate ?? d.sandRate ?? s.sandRate ?? DEFAULT_MATERIAL_RATES.sandRate);
  const aggRate = Number(overrideRates?.aggRate ?? savedRates.aggRate ?? d.aggRate ?? s.aggRate ?? DEFAULT_MATERIAL_RATES.aggRate);
  const steelRate = Number(overrideRates?.steelRate ?? savedRates.steelRate ?? d.steelRate ?? s.steelRate ?? DEFAULT_MATERIAL_RATES.steelRate);
  const brickRate = Number(overrideRates?.brickRate ?? savedRates.brickRate ?? d.brickRate ?? s.brickRate ?? DEFAULT_MATERIAL_RATES.brickRate);
  const tileRate = Number(overrideRates?.tileRate ?? savedRates.tileRate ?? d.tileRate ?? s.tileRate ?? DEFAULT_MATERIAL_RATES.tileRate);
  const boringRatePerFt = Number(overrideRates?.boringRatePerFt ?? savedRates.boringRatePerFt ?? d.constructionCostPerFoot ?? s.constructionCostPerFoot ?? DEFAULT_MATERIAL_RATES.boringRatePerFt);
  const sandPileCostPerFt = Number(overrideRates?.sandPileCostPerFt ?? savedRates.sandPileCostPerFt ?? d.costPerFoot ?? s.costPerFoot ?? DEFAULT_MATERIAL_RATES.sandPileCostPerFt);

  // Cement (bags)
  const cementBags = Math.round(
    s.multipliedCementBags || s.cementBags || s.totalCementBags || 0
  );
  const cementCost = overrideRates
    ? Math.round(cementBags * cementRate)
    : (s.cementCost !== undefined ? Math.round(s.cementCost) : Math.round(cementBags * cementRate));

  // Sand (cft)
  const sandCft = Number(
    (s.multipliedSandCft || s.sandVolume || s.sandVol || s.sandCft || s.totalSand || s.totalSandCft || s.totalVolume || 0).toFixed(1)
  );
  const sandCost = overrideRates
    ? Math.round(sandCft * sandRate)
    : (s.sandCost !== undefined ? Math.round(s.sandCost) : (s.totalSandCost !== undefined ? Math.round(s.totalSandCost) : Math.round(sandCft * sandRate)));

  // Stone / Khoa Aggregates (cft)
  const aggCft = Number(
    (s.multipliedAggCft || s.aggregateVolume || s.aggregateVol || s.aggCft || s.totalAggCft || 0).toFixed(1)
  );
  const isBrickKhoa = Boolean(
    d.baseType === "brick" ||
    (s.brickQty && s.brickQty > 0 && est.type !== "brick" && est.type !== "tiles")
  );
  const aggType: "stone" | "brick_khoa" | "aggregate" = isBrickKhoa ? "brick_khoa" : "stone";
  const aggCost = overrideRates
    ? Math.round(aggCft * aggRate)
    : (s.aggCost !== undefined ? Math.round(s.aggCost) : Math.round(aggCft * aggRate));

  // Rebar Steel (kg)
  const steelKg = Math.round(
    s.multipliedSteelKg || s.totalSteelKg || s.totalSteel || s.steelKg || s.totalSteelWeight || 0
  );
  const steelCost = overrideRates
    ? Math.round(steelKg * steelRate)
    : (s.steelCost !== undefined ? Math.round(s.steelCost) : Math.round(steelKg * steelRate));

  // Steel breakdown map
  const steelBreakdown: Record<string, number> = {};
  if (s.steelBreakdown && typeof s.steelBreakdown === "object") {
    Object.entries(s.steelBreakdown).forEach(([dia, w]) => {
      const numDia = Number(dia);
      const numW = typeof w === "number" ? w : Number(w);
      if (!isNaN(numDia) && numDia > 0 && !isNaN(numW) && numW > 0) {
        steelBreakdown[dia] = Math.round(numW);
      }
    });
  }

  // Bricks (pcs)
  const bricksPcs = Math.round(
    s.multipliedBricks || s.totalBricks || s.brickQty || 0
  );
  const brickCost = overrideRates
    ? Math.round(bricksPcs * brickRate)
    : (s.brickCost !== undefined ? Math.round(s.brickCost) : Math.round(bricksPcs * brickRate));

  // Tiles (pcs & boxes & area)
  const tilesPcs = Math.round(
    s.multipliedTilePieces || s.tiles || s.totalTilePieces || 0
  );
  const tilesBoxes = s.multipliedBoxes || s.boxes || Math.ceil(tilesPcs / 4);
  const tileAreaSqft = Number(
    (s.multipliedTileArea || s.totalTileArea || s.totalGrossTileArea || 0).toFixed(1)
  );
  const tilesCost = overrideRates
    ? Math.round(tilesPcs * tileRate)
    : (s.totalTileCost !== undefined ? Math.round(s.totalTileCost) : Math.round(tilesPcs * tileRate));

  // Concrete volumes
  const wetVolCft = Number((s.wetVolCft || s.totalWetVol || s.totalWetVolume || 0).toFixed(1));
  const dryVolCft = Number((s.dryVolCft || s.totalDryVol || s.totalDryVolume || 0).toFixed(1));

  // Pile details (Foundation: only once, no storey multiplier!)
  const pilesCount = Math.round(s.pileNos || s.numPiles || d.pileNos || d.numPiles || 0);
  const pileLengthFt = Number((s.pileLength || d.pileLength || 0).toFixed(1));
  const pileDiameterIn = Number((s.pileDiameter || d.pileDiameter || 0).toFixed(1));
  const boringRft = pilesCount > 0 && pileLengthFt > 0 ? Math.round(pilesCount * pileLengthFt) : 0;
  
  let boringCost = 0;
  if (est.type === "situ_pile") {
    boringCost = overrideRates
      ? Math.round(boringRft * boringRatePerFt)
      : Math.round(s.constructionCost || boringRft * boringRatePerFt || 0);
  } else if (est.type === "sand_pile") {
    boringCost = overrideRates
      ? Math.round(boringRft * sandPileCostPerFt)
      : Math.round(s.totalPileCost || boringRft * sandPileCostPerFt || 0);
  }

  // Item counts and specs
  let itemCount = 0;
  let mixRatio = "";
  const specs: string[] = [];

  if (est.type === "beam") {
    itemCount = s.totalBeamsCount || (Array.isArray(d.beams) ? d.beams.reduce((sum: number, b: any) => sum + (b.nos || 1), 0) * mult : mult);
    mixRatio = d.beams?.[0]?.mix || "1:1.5:3";
    specs.push(`${itemCount} Beams Total (${mult} storey multiplier)`);
    specs.push(`Mix: ${mixRatio}`);
    if (d.beams?.[0]) {
      const b = d.beams[0];
      specs.push(`Sample Size: ${b.width || 12}" × ${b.depth || 18}", Span: ${b.length || 20}ft`);
    }
  } else if (est.type === "column") {
    itemCount = s.totalColsCount || (Array.isArray(d.columns) ? d.columns.reduce((sum: number, c: any) => sum + (c.nos || 1), 0) * mult : mult);
    mixRatio = d.columns?.[0]?.mix || "1:1.5:3";
    specs.push(`${itemCount} Columns Total (${mult} storey multiplier)`);
    specs.push(`Mix: ${mixRatio}`);
    if (d.columns?.[0]) {
      const c = d.columns[0];
      specs.push(`Size: ${c.size || "12x15"}, Height: ${c.height || 10}ft`);
    }
  } else if (est.type === "footing") {
    itemCount = s.totalFtCount || (Array.isArray(d.footings) ? d.footings.reduce((sum: number, f: any) => sum + (f.nos || 1), 0) : 1);
    mixRatio = d.footings?.[0]?.mix || "1:1.5:3";
    specs.push(`${itemCount} Isolated Footings (Foundation Substructure 1x)`);
    specs.push(`Mix: ${mixRatio}`);
    if (d.footings?.[0]) {
      const f = d.footings[0];
      specs.push(`Base: ${f.length || 7}ft × ${f.breadth || 7}ft × ${f.thickness || 1.5}ft thick`);
    }
  } else if (est.type === "situ_pile") {
    specs.push(`${pilesCount} Bored Piles (Foundation 1x), ${pileDiameterIn}" dia, ${pileLengthFt}ft depth`);
    specs.push(`Total Drilling: ${boringRft} running feet`);
    mixRatio = d.mixRatio || "1:1.5:3";
    specs.push(`Mix: ${mixRatio}`);
  } else if (est.type === "sand_pile") {
    specs.push(`${pilesCount} Sand Compaction Piles (Foundation 1x), ${pileDiameterIn}" dia, ${pileLengthFt}ft depth`);
    specs.push(`Total Compaction: ${boringRft} rft`);
    specs.push(`Sand Volume: ${sandCft} cft (${Math.ceil(sandCft / 500)} Truckloads)`);
  } else if (est.type === "slab") {
    itemCount = Array.isArray(d.slabs) ? d.slabs.reduce((sum: number, sl: any) => sum + (sl.nos || 1), 0) * mult : mult;
    mixRatio = d.slabs?.[0]?.mixRatio || "1:1.5:3";
    specs.push(`${itemCount} Two-Way RCC Slabs (${mult} floor multiplier)`);
    specs.push(`Mix: ${mixRatio}, Thickness: ${d.slabs?.[0]?.thicknessIn || 5}"`);
  } else if (est.type === "stair") {
    itemCount = mult;
    mixRatio = d.stairs?.[0]?.mixRatio || "1:1.5:3";
    specs.push(`${itemCount} Staircase Flights (${mult} flight multiplier)`);
    specs.push(`Mix: ${mixRatio}, Waist Slab: ${d.stairs?.[0]?.thicknessIn || 6}"`);
  } else if (est.type === "brick") {
    specs.push(`${bricksPcs.toLocaleString()} Bricks (${mult} floor multiplier)`);
    if (s.totalWallArea || s.singleFloorNetArea) {
      specs.push(`Wall Area: ${s.totalWallArea || s.singleFloorNetArea} sqft`);
    }
    if (s.brickCementBags && s.plasterCementBags) {
      specs.push(`Mortar: ${s.brickCementBags} bags, Plaster: ${s.plasterCementBags} bags`);
    }
  } else if (est.type === "tiles") {
    specs.push(`${tilesPcs.toLocaleString()} Tiles (${tilesBoxes} Boxes)`);
    if (tileAreaSqft > 0) specs.push(`Coverage: ${tileAreaSqft} sqft`);
    specs.push(`Bedding Mortar: ${cementBags} bags cement, ${sandCft} cft sand`);
  } else if (est.type === "structural") {
    specs.push(`Full Building Plinth Area: ${s.totalBuiltUpArea || 1500} sqft`);
  }

  // Calculate totalCost based on overridden material rates if provided, otherwise preserve saved totalCost
  let calculatedCost = 0;
  if (overrideRates) {
    if (est.type === "situ_pile") {
      calculatedCost = cementCost + sandCost + aggCost + steelCost + boringCost;
    } else if (est.type === "sand_pile") {
      calculatedCost = sandCost + boringCost;
    } else if (est.type === "brick") {
      calculatedCost = brickCost + cementCost + sandCost;
    } else if (est.type === "tiles") {
      const labourCost = s.totalLabourCost || Math.round(tilesPcs * 45);
      calculatedCost = tilesCost + cementCost + sandCost + labourCost;
    } else {
      calculatedCost = cementCost + sandCost + aggCost + steelCost + (bricksPcs > 0 && aggType === "brick_khoa" ? brickCost : 0);
    }
  } else {
    calculatedCost = Math.round(est.totalCost || 0);
  }

  return {
    cementBags,
    cementCost,
    sandCft,
    sandCost,
    aggCft,
    aggCost,
    aggType,
    steelKg,
    steelCost,
    steelBreakdown,
    bricksPcs,
    brickCost,
    tilesPcs,
    tilesBoxes,
    tilesCost,
    tileAreaSqft,
    wetVolCft,
    dryVolCft,
    pilesCount,
    pileLengthFt,
    pileDiameterIn,
    boringRft,
    boringCost,
    mixRatio,
    itemCount,
    multiplier: mult,
    isMultiplying,
    totalCost: calculatedCost,
    rates: {
      cementRate,
      sandRate,
      aggRate,
      steelRate,
      brickRate,
      tileRate,
      boringRatePerFt,
      sandPileCostPerFt,
    },
    specifications: specs,
  };
}

/**
 * Recalculates an estimate file's totalCost and summary using the global unified project material rates.
 * Foundation elements (footing, situ_pile, sand_pile) are locked to 1x multiplier.
 */
export function recalculateEstimateWithRates(
  est: ProjectEstimateItem,
  rates: typeof DEFAULT_MATERIAL_RATES
): ProjectEstimateItem {
  const isFoundation = est.type === "footing" || est.type === "situ_pile" || est.type === "sand_pile";
  const mat = extractItemMaterials(est, rates);

  const updatedSummary = {
    ...est.summary,
    cementCost: mat.cementCost,
    sandCost: mat.sandCost,
    aggCost: mat.aggCost,
    steelCost: mat.steelCost,
    brickCost: mat.brickCost,
    totalTileCost: mat.tilesCost,
    totalCost: mat.totalCost,
    ...(isFoundation ? { multiplier: 1, isMultiplying: false } : {}),
    ...(est.type === "situ_pile" ? { constructionCost: mat.boringCost } : {}),
    ...(est.type === "sand_pile" ? { totalPileCost: mat.boringCost, totalSandCost: mat.sandCost } : {}),
  };

  return {
    ...est,
    totalCost: mat.totalCost,
    summary: updatedSummary,
    data: {
      ...est.data,
      rates: {
        ...(est.data?.rates || {}),
        ...rates,
      },
      ...(isFoundation ? { multiplier: 1, isMultiplying: false } : {}),
    },
  };
}
