import { ProjectEstimateItem, EstimateType, ContractorRateItem } from "../types";

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
  {
    type: "contractor",
    name: "Contractor & Labour",
    category: "structural",
    unitDescription: "Civil Floor, Electrical, Plumbing & Painting Labour Rates",
    defaultTitle: "Contractor & Labour Rate Schedule",
    accent: "#f59e0b",
  },
];

export function generateDefaultContractorItems(
  stories: number = 1,
  defaultFloorArea: number = 1500
): ContractorRateItem[] {
  const items: ContractorRateItem[] = [];
  const s = Math.max(1, stories);

  // Ground Floor: ৳400/sft
  items.push({
    id: "item_gf_civil",
    category: "civil_floor",
    workType: "Ground floor civil construction (গ্রাউন্ড ফ্লোর সিভিল নির্মাণ)",
    unit: "sft",
    rate: 400,
    quantity: defaultFloorArea,
    floorNumber: 0,
    notes: "Foundation, plinth brick soling, earthwork, RCC casting & shuttering",
    totalCost: 400 * defaultFloorArea,
  });

  // 1st Floor: ৳300/sft
  if (s >= 2) {
    items.push({
      id: "item_1f_civil",
      category: "civil_floor",
      workType: "1st floor civil construction (১ম তলা সিভিল নির্মাণ)",
      unit: "sft",
      rate: 300,
      quantity: defaultFloorArea,
      floorNumber: 1,
      notes: "Column casting, beam/slab formwork, reinforcement & brick masonry",
      totalCost: 300 * defaultFloorArea,
    });
  }

  // 2nd Floor: ৳310/sft
  if (s >= 3) {
    items.push({
      id: "item_2f_civil",
      category: "civil_floor",
      workType: "2nd floor civil construction (২য় তলা সিভিল নির্মাণ)",
      unit: "sft",
      rate: 310,
      quantity: defaultFloorArea,
      floorNumber: 2,
      notes: "Height allowance +৳10/sft for lifting & shuttering",
      totalCost: 310 * defaultFloorArea,
    });
  }

  // Higher Floors (3rd floor onward: +৳10 per floor)
  for (let f = 3; f < s; f++) {
    const floorRate = 310 + (f - 2) * 10;
    const floorLabel = f === 3 ? "3rd" : `${f}th`;
    items.push({
      id: `item_${f}f_civil`,
      category: "civil_floor",
      workType: `${floorLabel} floor civil construction (${f}ম তলা সিভিল নির্মাণ)`,
      unit: "sft",
      rate: floorRate,
      quantity: defaultFloorArea,
      floorNumber: f,
      notes: "Lifting allowance rate (+৳10/sft per floor height)",
      totalCost: floorRate * defaultFloorArea,
    });
  }

  const totalBuiltupArea = defaultFloorArea * s;

  // Electrical Installation Labour: ৳20/sft
  items.push({
    id: "item_electrical",
    category: "electrical",
    workType: "Electrical installation labour (বৈদ্যুতিক ওয়্যারিং ও পাইপিং মজুরি)",
    unit: "sft",
    rate: 20,
    quantity: totalBuiltupArea,
    notes: "Conduit piping, switchboards, db wiring, lighting & earthing labour",
    totalCost: 20 * totalBuiltupArea,
  });

  // Plumbing Installation Labour: ৳25/sft
  items.push({
    id: "item_plumbing",
    category: "plumbing",
    workType: "Plumbing installation labour (প্লাম্বিং ও স্যানিটারি ফিটিংস মজুরি)",
    unit: "sft",
    rate: 25,
    quantity: totalBuiltupArea,
    notes: "Water supply lines, sanitary drainage, waste stack & bath fittings",
    totalCost: 25 * totalBuiltupArea,
  });

  // Painting Labour: ৳10/sft (wall & ceiling area, approx 3.5x floor area)
  const estimatedWallArea = Math.round(totalBuiltupArea * 3.5);
  items.push({
    id: "item_painting",
    category: "painting",
    workType: "Painting labour (রং কাজের মজুরি - ওয়াল ও সিলিং এরিয়া)",
    unit: "sft",
    rate: 10,
    quantity: estimatedWallArea,
    notes: "Putty / seamer, primer coat, 2-coat plastic paint & weather coat (approx 3.5× floor sft)",
    totalCost: 10 * estimatedWallArea,
  });

  return items;
}

/**
 * Rescales contractor rate items accurately for a target storey count.
 * - Expands or trims civil floor items for floors 0 to s-1.
 * - Preserves custom rates configured by the user for ground floor, 1st floor, 2nd floor, etc.
 * - Dynamically computes height allowance (+৳10/sft per floor) for new higher floors.
 * - Multiplies electrical & plumbing total builtup area by floorArea * s.
 * - Multiplies painting wall & ceiling area by Math.round(floorArea * s * wallAreaMultiplier).
 * - Preserves any additional custom items added by the user.
 * - Returns exact updated items, breakdown sums, and grand total cost.
 */
export function rescaleContractorItems(
  existingItems: ContractorRateItem[] = [],
  targetStories: number,
  floorArea: number = 1500,
  wallMult: number = 3.5
): {
  items: ContractorRateItem[];
  civilFloorTotal: number;
  electricalTotal: number;
  plumbingTotal: number;
  paintingTotal: number;
  customTotal: number;
  grandTotalCost: number;
  totalBuiltupArea: number;
  wallArea: number;
} {
  const s = Math.max(1, Math.round(targetStories) || 1);
  const items = Array.isArray(existingItems) ? existingItems : [];

  // Extract existing custom rates if present
  const existingGf = items.find((i) => i.category === "civil_floor" && i.floorNumber === 0);
  const gfRate = existingGf?.rate || 400;

  const existing1f = items.find((i) => i.category === "civil_floor" && i.floorNumber === 1);
  const f1Rate = existing1f?.rate || 300;

  const existing2f = items.find((i) => i.category === "civil_floor" && i.floorNumber === 2);
  const f2Rate = existing2f?.rate || 310;

  const existingEl = items.find((i) => i.category === "electrical");
  const elRate = existingEl?.rate ?? 20;

  const existingPl = items.find((i) => i.category === "plumbing");
  const plRate = existingPl?.rate ?? 25;

  const existingPt = items.find((i) => i.category === "painting");
  const ptRate = existingPt?.rate ?? 10;

  // Other custom additional items
  const customItems = items.filter(
    (i) =>
      i.category !== "civil_floor" &&
      i.category !== "electrical" &&
      i.category !== "plumbing" &&
      i.category !== "painting"
  );

  // Reconstruct civil floor items strictly matching targetStories `s`
  const newCivilItems: ContractorRateItem[] = [];
  for (let f = 0; f < s; f++) {
    const existingFloorItem = items.find(
      (i) => i.category === "civil_floor" && i.floorNumber === f
    );

    let floorRate: number;
    if (existingFloorItem && typeof existingFloorItem.rate === "number") {
      floorRate = existingFloorItem.rate;
    } else if (f === 0) {
      floorRate = gfRate;
    } else if (f === 1) {
      floorRate = f1Rate;
    } else if (f === 2) {
      floorRate = f2Rate;
    } else {
      floorRate = f2Rate + (f - 2) * 10;
    }

    const floorLabel =
      f === 0
        ? "Ground floor"
        : f === 1
        ? "1st floor"
        : f === 2
        ? "2nd floor"
        : f === 3
        ? "3rd floor"
        : `${f}th floor`;
    const banglaLabel = f === 0 ? "গ্রাউন্ড ফ্লোর" : `${f}ম তলা`;

    newCivilItems.push({
      id: existingFloorItem?.id || `item_${f}f_civil`,
      category: "civil_floor",
      workType:
        existingFloorItem?.workType || `${floorLabel} civil construction (${banglaLabel} সিভিল নির্মাণ)`,
      unit: "sft",
      rate: floorRate,
      quantity: floorArea,
      floorNumber: f,
      notes:
        existingFloorItem?.notes ||
        (f >= 2
          ? "Height allowance (+৳10/sft per floor height)"
          : f === 0
          ? "Foundation, plinth brick soling, earthwork, RCC casting & shuttering"
          : "Column casting, beam/slab formwork, reinforcement & brick masonry"),
      totalCost: Math.round(floorRate * floorArea),
    });
  }

  const totalBuiltupArea = floorArea * s;
  const wallArea = Math.round(totalBuiltupArea * wallMult);

  const elItem: ContractorRateItem = {
    id: existingEl?.id || "item_electrical",
    category: "electrical",
    workType:
      existingEl?.workType || "Electrical installation labour (বৈদ্বুতিক ওয়্যারিং ও পাইপিং মজুরি)",
    unit: existingEl?.unit || "sft",
    rate: elRate,
    quantity: totalBuiltupArea,
    notes:
      existingEl?.notes ||
      "Conduit piping, switchboards, db wiring, lighting & earthing labour",
    totalCost: Math.round(elRate * totalBuiltupArea),
  };

  const plItem: ContractorRateItem = {
    id: existingPl?.id || "item_plumbing",
    category: "plumbing",
    workType:
      existingPl?.workType || "Plumbing installation labour (প্লাম্বিং ও স্যানিটারি ফিটিংস মজুরি)",
    unit: existingPl?.unit || "sft",
    rate: plRate,
    quantity: totalBuiltupArea,
    notes:
      existingPl?.notes ||
      "Water supply lines, sanitary drainage, waste stack & bath fittings",
    totalCost: Math.round(plRate * totalBuiltupArea),
  };

  const ptItem: ContractorRateItem = {
    id: existingPt?.id || "item_painting",
    category: "painting",
    workType:
      existingPt?.workType || "Painting labour (রং কাজের মজুরি - ওয়াল ও সিলিং এরিয়া)",
    unit: existingPt?.unit || "sft",
    rate: ptRate,
    quantity: wallArea,
    notes:
      existingPt?.notes ||
      `Putty / seamer, primer coat, 2-coat plastic paint & weather coat (approx ${wallMult}× floor sft)`,
    totalCost: Math.round(ptRate * wallArea),
  };

  const updatedItems: ContractorRateItem[] = [...newCivilItems, elItem, plItem, ptItem, ...customItems];

  const civilFloorTotal = newCivilItems.reduce((sum, it) => sum + it.totalCost, 0);
  const electricalTotal = elItem.totalCost;
  const plumbingTotal = plItem.totalCost;
  const paintingTotal = ptItem.totalCost;
  const customTotal = customItems.reduce((sum, it) => sum + (Number(it.totalCost) || 0), 0);
  const grandTotalCost =
    civilFloorTotal + electricalTotal + plumbingTotal + paintingTotal + customTotal;

  return {
    items: updatedItems,
    civilFloorTotal,
    electricalTotal,
    plumbingTotal,
    paintingTotal,
    customTotal,
    grandTotalCost,
    totalBuiltupArea,
    wallArea,
  };
}

export function createDefaultBuildingEstimates(stories: number = 1): ProjectEstimateItem[] {
  const s = Math.max(1, stories);
  const now = new Date().toISOString();

  // 1a. GRADE BEAM (Plinth Substructure - 1 Storey Fixed)
  const gradeBeamItem: ProjectEstimateItem = {
    id: "est_grade_beam_init_" + Date.now(),
    type: "beam",
    name: "Grade Beams GB1-GB8 (Plinth Level - 1 Storey)",
    date: now,
    totalCost: 175000,
    summary: {
      beamSubtype: "grade_beam",
      cementBags: 65,
      sandCft: 122,
      aggCft: 245,
      totalSteelKg: 1080,
      wetVolCft: 158.0,
      dryVolCft: 255.0,
      totalCost: 175000,
      multiplier: 1,
      isMultiplying: false,
      totalBeamsCount: 8,
    },
    data: {
      beamSubtype: "grade_beam",
      multiplier: 1,
      isMultiplying: false,
      beams: [
        {
          nos: 8,
          name: "GB1",
          width: 12,
          depth: 18,
          length: 22,
          stirrupSpacing: 6,
          mix: "1:1.5:3",
          subtype: "grade_beam",
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

  // 1b. FLOOR BEAM (Superstructure - Multiplied by Storeys)
  const floorBeamCostPerFloor = 198000;
  const floorBeamTotalCost = floorBeamCostPerFloor * s;
  const floorBeamItem: ProjectEstimateItem = {
    id: "est_floor_beam_init_" + (Date.now() + 1),
    type: "beam",
    name: `Floor Beams FB1-FB10 (${s} ${s === 1 ? "Storey" : "Storeys"} × Multiplied)`,
    date: now,
    totalCost: floorBeamTotalCost,
    summary: {
      beamSubtype: "floor_beam",
      cementBags: 72 * s,
      sandCft: 135 * s,
      aggCft: 270 * s,
      totalSteelKg: 1220 * s,
      wetVolCft: Number((175.0 * s).toFixed(1)),
      dryVolCft: Number((282.5 * s).toFixed(1)),
      totalCost: floorBeamTotalCost,
      multiplier: s,
      isMultiplying: s > 1,
      totalBeamsCount: 10 * s,
    },
    data: {
      beamSubtype: "floor_beam",
      multiplier: s,
      isMultiplying: s > 1,
      beams: [
        {
          nos: 10,
          name: "FB1",
          width: 12,
          depth: 18,
          length: 22,
          stirrupSpacing: 6,
          mix: "1:1.5:3",
          subtype: "floor_beam",
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
          category: "combined",
          size: "12x15",
          shortOffset: 3.0,
          clearCover: 1.5,
          shortClearCover: 2.5,
          height: 10,
          shortHeight: 4.0,
          longHeight: 10.0,
          footingBend: 1.5,
          lapLength: 2.5,
          shortStirrupSpacing: 4,
          longStirrupSpacing: 6,
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
    name: `Foundation Isolated Footings F1-F8 (Substructure 1x)`,
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

  // 8. CONTRACTOR & LABOUR SCHEDULE
  const contractorItems = generateDefaultContractorItems(s, 1500);
  const contractorGrandTotal = contractorItems.reduce((sum, item) => sum + item.totalCost, 0);
  const contractorCivilTotal = contractorItems
    .filter((i) => i.category === "civil_floor")
    .reduce((sum, item) => sum + item.totalCost, 0);
  const contractorElTotal = contractorItems
    .filter((i) => i.category === "electrical")
    .reduce((sum, item) => sum + item.totalCost, 0);
  const contractorPlTotal = contractorItems
    .filter((i) => i.category === "plumbing")
    .reduce((sum, item) => sum + item.totalCost, 0);
  const contractorPtTotal = contractorItems
    .filter((i) => i.category === "painting")
    .reduce((sum, item) => sum + item.totalCost, 0);

  const contractorItem: ProjectEstimateItem = {
    id: "est_contractor_init_" + Date.now(),
    type: "contractor",
    name: `Contractor & Labour Schedule (${s} ${s === 1 ? "Storey" : "Storeys"} Covered)`,
    date: now,
    totalCost: contractorGrandTotal,
    summary: {
      civilFloorTotal: contractorCivilTotal,
      electricalTotal: contractorElTotal,
      plumbingTotal: contractorPlTotal,
      paintingTotal: contractorPtTotal,
      customTotal: 0,
      grandTotalCost: contractorGrandTotal,
      totalCost: contractorGrandTotal,
      totalBuiltupAreaSft: 1500 * s,
      totalPaintingWallAreaSft: Math.round(1500 * s * 3.5),
      itemsCount: contractorItems.length,
      stories: s,
      multiplier: s,
      isMultiplying: s > 1,
    },
    data: {
      items: contractorItems,
      batchFloorArea: 1500,
      wallAreaMultiplier: 3.5,
      stories: s,
      multiplier: s,
      isMultiplying: s > 1,
    },
  };

  return [
    gradeBeamItem,
    floorBeamItem,
    columnItem,
    footingItem,
    slabItem,
    stairItem,
    tileItem,
    brickItem,
    contractorItem,
  ];
}

/**
 * Rescales all estimates in a project when the project storey count changes.
 * Ensures total bricks, beams, columns, slabs, stairs, tiles, cement, steel, etc.,
 * match the exact new storey count.
 * Grade beams remain locked to 1 storey, while floor beams scale as per storeys.
 * Contractor and labour rate schedule dynamically adjusts every floor item, electrical, plumbing,
 * and painting tasks to accurately compute the real labour rate total.
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
  defaultTemplates.forEach((t) => {
    templateMap.set(t.type, t);
    if (t.data?.beamSubtype) {
      templateMap.set(t.data.beamSubtype, t);
    }
  });

  return estimates.map((est) => {
    // Foundation elements (Footing, Situ Pile, Sand Pile), Grade Beams, and Short Columns are substructure used only once: NEVER scale with storeys!
    const isGradeBeam =
      est.type === "beam" &&
      (est.data?.beamSubtype === "grade_beam" ||
        est.summary?.beamSubtype === "grade_beam" ||
        est.name?.toLowerCase().includes("grade") ||
        est.name?.toLowerCase().includes("gb"));
    const isShortCol =
      est.type === "column" &&
      (est.data?.colMode === "short" ||
        est.summary?.colMode === "short" ||
        est.name?.toLowerCase().includes("short"));

    if (
      est.type === "footing" ||
      est.type === "situ_pile" ||
      est.type === "sand_pile" ||
      isGradeBeam ||
      isShortCol
    ) {
      return {
        ...est,
        summary: {
          ...est.summary,
          multiplier: 1,
          isMultiplying: false,
          ...(isGradeBeam ? { beamSubtype: "grade_beam" } : {}),
          ...(isShortCol ? { colMode: "short" } : {}),
        },
        data: {
          ...est.data,
          multiplier: 1,
          isMultiplying: false,
          ...(isGradeBeam ? { beamSubtype: "grade_beam" } : {}),
          ...(isShortCol ? { colMode: "short" } : {}),
        },
      };
    }

    // ACCURATE DEDICATED RESCALING FOR CONTRACTOR & LABOUR RATE SCHEDULE
    if (est.type === "contractor") {
      const d = est.data || {};
      const prevSummary = est.summary || {};
      const floorArea = Number(d.batchFloorArea) || 1500;
      const wallMult = Number(d.wallAreaMultiplier) || 3.5;
      const existingItems: ContractorRateItem[] = Array.isArray(d.items) ? d.items : [];

      const rescaled = rescaleContractorItems(existingItems, s, floorArea, wallMult);

      let updatedName = est.name;
      const storeyRegex = /\(\s*\d+\s*(?:Floors?|Storeys?)\s*(?:[×x]\s*Multiplied|Schedule|Covered)?\s*\)/i;
      if (storeyRegex.test(updatedName)) {
        updatedName = updatedName.replace(
          storeyRegex,
          `(${s} ${s === 1 ? "Storey" : "Storeys"} Covered)`
        );
      } else if (!updatedName.includes(`${s} Storey`)) {
        updatedName = `${updatedName} (${s} ${s === 1 ? "Storey" : "Storeys"} Covered)`;
      }

      return {
        ...est,
        name: updatedName,
        totalCost: rescaled.grandTotalCost,
        summary: {
          ...prevSummary,
          civilFloorTotal: rescaled.civilFloorTotal,
          electricalTotal: rescaled.electricalTotal,
          plumbingTotal: rescaled.plumbingTotal,
          paintingTotal: rescaled.paintingTotal,
          customTotal: rescaled.customTotal,
          grandTotalCost: rescaled.grandTotalCost,
          totalCost: rescaled.grandTotalCost,
          totalBuiltupAreaSft: rescaled.totalBuiltupArea,
          totalPaintingWallAreaSft: rescaled.wallArea,
          itemsCount: rescaled.items.length,
          stories: s,
          multiplier: s,
          isMultiplying: s > 1,
        },
        data: {
          ...d,
          items: rescaled.items,
          batchFloorArea: floorArea,
          wallAreaMultiplier: wallMult,
          stories: s,
          multiplier: s,
          isMultiplying: s > 1,
        },
      };
    }

    const isStandardInit =
      est.id.includes("_init_") ||
      est.id.startsWith("est_beam_01") ||
      est.id.startsWith("est_col_01");

    const templateKey =
      est.type === "beam"
        ? (est.data?.beamSubtype || (est.id.includes("floor") ? "floor_beam" : "beam"))
        : est.type;
    const template = templateMap.get(templateKey) || templateMap.get(est.type);

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
