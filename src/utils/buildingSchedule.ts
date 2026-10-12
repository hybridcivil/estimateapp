import { ProjectEstimateItem, EstimateType } from "../types";

export interface BuildingElementMeta {
  type: EstimateType;
  name: string;
  category: "structural" | "finishing";
  unitDescription: string;
  defaultTitle: string;
  accent: string;
}

export const BUILDING_ELEMENTS: BuildingElementMeta[] = [
  {
    type: "beam",
    name: "Beam",
    category: "structural",
    unitDescription: "Grade Beams, Floor Beams, Tie Beams",
    defaultTitle: "Structural Beams Takeoff",
    accent: "#00c2c7",
  },
  {
    type: "column",
    name: "Column",
    category: "structural",
    unitDescription: "Pillars, Ground & Multi-Floor Columns",
    defaultTitle: "Reinforced Columns Takeoff",
    accent: "#f5a623",
  },
  {
    type: "footing",
    name: "Footing",
    category: "structural",
    unitDescription: "Isolated, Combined, Mat/Raft Footings",
    defaultTitle: "Foundation Footings Takeoff",
    accent: "#38bdf8",
  },
  {
    type: "situ_pile",
    name: "Situ Pile",
    category: "structural",
    unitDescription: "Cast-in-Situ Bored Piles & Steel Reinforcement",
    defaultTitle: "Cast-in-Situ Bored Pile Takeoff",
    accent: "#06b6d4",
  },
  {
    type: "sand_pile",
    name: "Sand Pile",
    category: "structural",
    unitDescription: "Sand Compaction Piles (SCP) Foundation",
    defaultTitle: "Sand Compaction Pile Takeoff",
    accent: "#f59e0b",
  },
  {
    type: "slab",
    name: "Slab",
    category: "structural",
    unitDescription: "Two-Way / One-Way Floor & Roof Slabs",
    defaultTitle: "Floor RCC Slabs Takeoff",
    accent: "#a78bfa",
  },
  {
    type: "stair",
    name: "Stair",
    category: "structural",
    unitDescription: "Dog-legged, Doglegged Flight & Landings",
    defaultTitle: "Staircase Estimation",
    accent: "#fb7185",
  },
  {
    type: "tiles",
    name: "Tiles",
    category: "finishing",
    unitDescription: "Floor & Wall Ceramic/Porcelain Tiles",
    defaultTitle: "Floor & Wall Tiles Takeoff",
    accent: "#34d399",
  },
  {
    type: "brick",
    name: "Brick",
    category: "finishing",
    unitDescription: "10\" & 5\" Brickwork & Cement Plaster",
    defaultTitle: "Brickwork & Plaster Takeoff",
    accent: "#fb923c",
  },
];

export function createDefaultBuildingEstimates(stories: number = 1): ProjectEstimateItem[] {
  const s = Math.max(1, stories);
  const now = new Date().toISOString();

  // 1. BEAM
  const beamCostPerFloor = 184500;
  const beamTotalCost = beamCostPerFloor * s;
  const beamItem: ProjectEstimateItem = {
    id: "est_beam_init_" + Date.now(),
    type: "beam",
    name: `Building Beams (${s} ${s === 1 ? "Storey" : "Storeys"} × Multiplied)`,
    date: now,
    totalCost: beamTotalCost,
    summary: {
      cementBags: 68 * s,
      sandCft: 128 * s,
      aggCft: 255 * s,
      totalSteelKg: 1140 * s,
      wetVolCft: Number((165.5 * s).toFixed(1)),
      dryVolCft: Number((267.4 * s).toFixed(1)),
      totalCost: beamTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
      totalBeamsCount: 8 * s,
    },
    data: {
      multiplier: s,
      isMultiplying: s > 1,
      beams: [
        {
          nos: 8,
          name: "B1",
          width: 12,
          depth: 18,
          length: 22,
          stirrupSpacing: 6,
          mix: "1:1.5:3",
          mainBars: [
            { dia: 16, qty: 3 },
            { dia: 20, qty: 2 },
          ],
          extraTopBars: { nos: 2, dia: 16, length: 7.33 },
          extraBottomBars: { nos: 2, dia: 16, length: 11 },
        },
      ],
      rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
      baseType: "none",
    },
  };

  // 2. COLUMN
  const colCostPerFloor = 215400;
  const colTotalCost = colCostPerFloor * s;
  const columnItem: ProjectEstimateItem = {
    id: "est_col_init_" + Date.now(),
    type: "column",
    name: `Main Columns C1-C12 (${s} ${s === 1 ? "Storey" : "Storeys"} × Multiplied)`,
    date: now,
    totalCost: colTotalCost,
    summary: {
      cementBags: 74 * s,
      sandCft: 139 * s,
      aggCft: 278 * s,
      totalSteelKg: 1350 * s,
      wetVolCft: Number((180 * s).toFixed(1)),
      dryVolCft: Number((292 * s).toFixed(1)),
      totalCost: colTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
      totalColsCount: 12 * s,
    },
    data: {
      multiplier: s,
      isMultiplying: s > 1,
      columns: [
        {
          nos: 12,
          name: "C1",
          type: "rectangular",
          category: "long",
          size: "12x15",
          height: 10,
          rebars: [
            { dia: 20, nos: 4 },
            { dia: 16, nos: 4 },
          ],
          mix: "1:1.5:3",
          stirrupDia: 10,
          stirrupSpacing: 5,
        },
      ],
      rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
      baseType: "none",
    },
  };

  // 3. FOOTING (Foundation level, 1x baseline for building, but supports multiplier)
  const footingCost = 268900;
  const footingItem: ProjectEstimateItem = {
    id: "est_ft_init_" + Date.now(),
    type: "footing",
    name: `Foundation Isolated Footings F1-F8 (${s} Storey Load)`,
    date: now,
    totalCost: footingCost,
    summary: {
      cementBags: 112,
      sandCft: 210,
      aggCft: 420,
      totalSteelKg: 1420,
      wetVolCft: 272,
      dryVolCft: 440,
      totalCost: footingCost,
      totalFtCount: 8,
      multiplier: 1,
      isMultiplying: false,
    },
    data: {
      multiplier: 1,
      isMultiplying: false,
      footings: [
        {
          nos: 8,
          name: "F1",
          length: 7.5,
          breadth: 7.5,
          thickness: 1.5,
          cover: 0.25,
          hook: 0.5,
          mix: "1:1.5:3",
          rebars: [
            { role: "bottom", dia: 16, spacing: 5 },
            { role: "top", dia: 12, spacing: 6 },
          ],
        },
      ],
      rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
      baseType: "none",
    },
  };

  // 4. SLAB
  const slabCostPerFloor = 246800;
  const slabTotalCost = slabCostPerFloor * s;
  const slabItem: ProjectEstimateItem = {
    id: "est_slab_init_" + Date.now(),
    type: "slab",
    name: `Floor RCC Slabs S1-S4 (${s} ${s === 1 ? "Floor" : "Floors"} × Multiplied)`,
    date: now,
    totalCost: slabTotalCost,
    summary: {
      cementBags: 92 * s,
      sandCft: 172 * s,
      aggCft: 345 * s,
      totalSteelKg: 1580 * s,
      wetVolCft: Number((225 * s).toFixed(1)),
      dryVolCft: Number((364 * s).toFixed(1)),
      totalCost: slabTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
    },
    data: {
      multiplier: s,
      isMultiplying: s > 1,
      slabs: [
        {
          id: "slab_1",
          nos: 4,
          name: "S1 (Living & Bed)",
          length: 22,
          width: 16,
          thicknessIn: 5,
          mixRatio: "1:1.5:3",
          mainBar: 10,
          spacingIn: 5,
          distBar: 10,
          distSpacingIn: 6,
          extraBar: 10,
          extraBarsNum: 2,
        },
      ],
      rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
      baseType: "none",
    },
  };

  // 5. STAIR (Flights for multi-storey)
  const stairFlights = Math.max(1, s > 1 ? s - 1 : 1);
  const stairCostPerFlight = 68400;
  const stairTotalCost = stairCostPerFlight * stairFlights;
  const stairItem: ProjectEstimateItem = {
    id: "est_stair_init_" + Date.now(),
    type: "stair",
    name: `Doglegged Staircase Flights (${stairFlights} ${stairFlights === 1 ? "Flight" : "Flights"} × Multiplied)`,
    date: now,
    totalCost: stairTotalCost,
    summary: {
      cementBags: 24 * stairFlights,
      sandCft: 45 * stairFlights,
      aggCft: 90 * stairFlights,
      totalSteelKg: 420 * stairFlights,
      wetVolCft: Number((58 * stairFlights).toFixed(1)),
      dryVolCft: Number((94 * stairFlights).toFixed(1)),
      totalCost: stairTotalCost,
      multiplier: stairFlights,
      isMultiplying: s > 1,
    },
    data: {
      multiplier: stairFlights,
      isMultiplying: s > 1,
      stairs: [
        {
          id: "stair_1",
          nos: 2,
          name: "Main Doglegged Flight",
          lengthFeet: 16,
          lengthInches: 4,
          widthFeet: 8,
          widthInches: 0,
          thicknessIn: 6,
          mixRatio: "1:1.5:3",
          risers: 20,
          treads: 19,
          riserHeightIn: 5.54,
          treadWidthIn: 10,
          mainBar: 12,
          mainSpacingIn: 5,
          distBar: 10,
          distSpacingIn: 5,
        },
      ],
      rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
    },
  };

  // 6. TILES
  const tileCostPerFloor = 142500;
  const tileTotalCost = tileCostPerFloor * s;
  const tileItem: ProjectEstimateItem = {
    id: "est_tile_init_" + Date.now(),
    type: "tiles",
    name: `Floor & Skirting Tiles (${s} ${s === 1 ? "Floor" : "Floors"} × Multiplied)`,
    date: now,
    totalCost: tileTotalCost,
    summary: {
      tiles: 480 * s,
      cementBags: 18 * s,
      sandCft: 65 * s,
      totalCost: tileTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
    },
    data: {
      multiplier: s,
      isMultiplying: s > 1,
      rooms: [
        {
          id: "room_1",
          nos: 1,
          name: "Apartment Floor Units (2'x2')",
          length: 40,
          width: 30,
          tileType: "180",
          tilePrice: 180,
          tileSize: 2,
          includeSkirting: true,
          skirtingHeight: 4,
          skirtingPrice: 160,
          mortarTh: 0.5,
          wastage: 8,
          labour: 45,
        },
      ],
    },
  };

  // 7. BRICK
  const brickCostPerFloor = 189200;
  const brickTotalCost = brickCostPerFloor * s;
  const brickItem: ProjectEstimateItem = {
    id: "est_brick_init_" + Date.now(),
    type: "brick",
    name: `External & Partition Brickwork (${s} ${s === 1 ? "Floor" : "Floors"} × Multiplied)`,
    date: now,
    totalCost: brickTotalCost,
    summary: {
      totalBricks: 7850 * s,
      brickQty: 7850 * s,
      cementBags: 38 * s,
      sandCft: 190 * s,
      totalCost: brickTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
    },
    data: {
      multiplier: s,
      isMultiplying: s > 1,
      walls: [
        {
          id: "wall_1",
          nos: 1,
          name: "Perimeter 10\" Wall & 5\" Partition",
          length: 40,
          width: 30,
          lengthSpans: 2,
          widthSpans: 2,
          height: 10,
          wallThickness: 10,
          windowCount: 6,
          windowWidth: 4,
          windowHeight: 4.5,
          doorCount: 4,
          doorWidth: 3.25,
          doorHeight: 7,
          brickLengthIn: 9.5,
          brickWidthIn: 4.5,
          brickHeightIn: 2.75,
          brickMix: "1:4",
          plasterMix: "1:4",
          plasterThicknessMm: 12,
        },
      ],
      rates: { cementRate: 550, sandRate: 45, brickRate: 15, bricksPerCft: 10 },
    },
  };

  return [beamItem, columnItem, footingItem, slabItem, stairItem, tileItem, brickItem];
}

/**
 * Rescales all estimates in a project when the project storey count changes.
 * Ensures total bricks, beams, columns, slabs, stairs, tiles, cement, steel, etc.,
 * match the exact new storey count.
 */
export function rescaleEstimatesForStories(
  estimates: ProjectEstimateItem[],
  newStories: number,
  oldStories?: number
): ProjectEstimateItem[] {
  const s = Math.max(1, Math.round(newStories) || 1);
  const oldS = Math.max(1, Math.round(oldStories || 1) || 1);

  // Pre-generate standard templates for stories = s
  const defaultTemplates = createDefaultBuildingEstimates(s);
  const templateMap = new Map<string, ProjectEstimateItem>();
  defaultTemplates.forEach((t) => templateMap.set(t.type, t));

  return estimates.map((est) => {
    const isStandardInit =
      est.id.includes("_init_") ||
      est.id.startsWith("est_beam_01") ||
      est.id.startsWith("est_col_01") ||
      est.id.startsWith("est_footing_01");

    const template = templateMap.get(est.type);

    // If it's a standard/default building schedule element, regenerate using the exact formula
    if (isStandardInit && template) {
      return {
        ...template,
        id: est.id, // preserve the existing item's ID
        date: est.date || template.date,
        // Preserve any custom user-configured rates
        data: {
          ...template.data,
          rates: est.data?.rates || template.data.rates,
        },
      };
    }

    // For any custom estimates or user-modified estimates:
    const prevSummary = est.summary || {};
    const currentMult =
      prevSummary.multiplier ||
      est.data?.multiplier ||
      (prevSummary.isMultiplying || est.data?.isMultiplying ? oldS : 1);

    const shouldMultiply =
      prevSummary.isMultiplying ??
      est.data?.isMultiplying ??
      (currentMult > 1 || oldS > 1 || s > 1);

    if (!shouldMultiply) {
      return est;
    }

    const ratio = s / (currentMult || 1);
    const updatedSummary: Record<string, any> = { ...prevSummary };

    // Brickwork specific scaling
    if (est.type === "brick") {
      const baseBricks =
        prevSummary.singleFloorBricks ||
        (prevSummary.totalBricks ? Math.round(prevSummary.totalBricks / currentMult) : 7850);
      const baseCement =
        prevSummary.singleFloorCementBags ||
        (prevSummary.cementBags ? Math.round(prevSummary.cementBags / currentMult) : 38);
      const baseSand =
        prevSummary.singleFloorSandCft ||
        (prevSummary.sandCft ? prevSummary.sandCft / currentMult : 190);
      const baseCost =
        prevSummary.singleFloorTotalCost ||
        (est.totalCost ? est.totalCost / currentMult : 189200);

      updatedSummary.totalBricks = Math.round(baseBricks * s);
      updatedSummary.brickQty = updatedSummary.totalBricks;
      updatedSummary.multipliedBricks = updatedSummary.totalBricks;
      updatedSummary.cementBags = Math.ceil(baseCement * s);
      updatedSummary.sandCft = Number((baseSand * s).toFixed(1));
      updatedSummary.totalCost = Math.round(baseCost * s);
    } else {
      // General scaling for beam, column, slab, stair, tile, etc.
      if (typeof prevSummary.totalBricks === "number") {
        updatedSummary.totalBricks = Math.round(prevSummary.totalBricks * ratio);
        updatedSummary.brickQty = updatedSummary.totalBricks;
      }
      if (typeof prevSummary.cementBags === "number") {
        updatedSummary.cementBags = Math.ceil(prevSummary.cementBags * ratio);
      }
      if (typeof prevSummary.sandCft === "number") {
        updatedSummary.sandCft = Number((prevSummary.sandCft * ratio).toFixed(1));
      }
      if (typeof prevSummary.aggCft === "number") {
        updatedSummary.aggCft = Number((prevSummary.aggCft * ratio).toFixed(1));
      }
      if (typeof prevSummary.totalSteelKg === "number") {
        updatedSummary.totalSteelKg = Math.round(prevSummary.totalSteelKg * ratio);
      }
      if (typeof prevSummary.tiles === "number") {
        updatedSummary.tiles = Math.round(prevSummary.tiles * ratio);
      }
      if (typeof prevSummary.wetVolCft === "number") {
        updatedSummary.wetVolCft = Number((prevSummary.wetVolCft * ratio).toFixed(1));
      }
      if (typeof prevSummary.dryVolCft === "number") {
        updatedSummary.dryVolCft = Number((prevSummary.dryVolCft * ratio).toFixed(1));
      }
      if (typeof prevSummary.totalBeamsCount === "number") {
        updatedSummary.totalBeamsCount = Math.round(prevSummary.totalBeamsCount * ratio);
      }
      if (typeof prevSummary.totalColsCount === "number") {
        updatedSummary.totalColsCount = Math.round(prevSummary.totalColsCount * ratio);
      }
      updatedSummary.totalCost = Math.round((est.totalCost || 0) * ratio);
    }

    updatedSummary.multiplier = s;
    updatedSummary.isMultiplying = s > 1;

    // Update title/label string with new floor count
    let updatedName = est.name;
    const storeyRegex = /\(\s*\d+\s*(?:Floors?|Storeys?|Flights?)\s*(?:[×x]\s*Multiplied|Load)?\s*\)/i;
    if (storeyRegex.test(updatedName)) {
      if (est.type === "stair") {
        const flights = Math.max(1, s > 1 ? s - 1 : 1);
        updatedName = updatedName.replace(
          storeyRegex,
          `(${flights} ${flights === 1 ? "Flight" : "Flights"} × Multiplied)`
        );
      } else if (est.type === "footing") {
        updatedName = updatedName.replace(storeyRegex, `(${s} Storey Load)`);
      } else if (est.type === "beam" || est.type === "column") {
        updatedName = updatedName.replace(
          storeyRegex,
          `(${s} ${s === 1 ? "Storey" : "Storeys"} × Multiplied)`
        );
      } else {
        updatedName = updatedName.replace(
          storeyRegex,
          `(${s} ${s === 1 ? "Floor" : "Floors"} × Multiplied)`
        );
      }
    }

    return {
      ...est,
      name: updatedName,
      totalCost: updatedSummary.totalCost || Math.round((est.totalCost || 0) * ratio),
      summary: updatedSummary,
      data: {
        ...(est.data || {}),
        multiplier: s,
        isMultiplying: s > 1,
      },
    };
  });
}
