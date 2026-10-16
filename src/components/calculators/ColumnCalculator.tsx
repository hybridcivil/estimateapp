import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, ColumnItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import { Plus, Trash2, RotateCcw, Copy, Edit3, Check, X, Building2, ShieldCheck, Layers, ArrowRight } from "lucide-react";

interface ColumnCalculatorProps {
  activeProject: Project | null;
  loadedEstimate?: ProjectEstimateItem | null;
  onClearLoadedEstimate?: () => void;
  onSaveEstimate: (data: {
    id?: string;
    type: string;
    name: string;
    totalCost: number;
    summary: Record<string, any>;
    data: Record<string, any>;
  }) => Promise<void>;
  onDeleteEstimate: (id: string) => Promise<void>;
}

export const ColumnCalculator: React.FC<ColumnCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  // Category Mode: "combined" (Short 1x + Long xStoreys), "short" (Plinth 1x Fixed), "long" (Storeys Multiplied)
  const [colMode, setColMode] = useState<"combined" | "short" | "long">("combined");
  const [estimateName, setEstimateName] = useState("Reinforced Concrete Columns (Short & Long)");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  // Building Multiplier (for Superstructure Long Columns)
  const projectStories = activeProject?.stories || 1;
  const [multiplier, setMultiplier] = useState(1);
  const [isMultiplying, setIsMultiplying] = useState(false);

  useEffect(() => {
    if (activeProject?.stories) {
      setMultiplier(activeProject.stories);
      setIsMultiplying(activeProject.stories > 1);
    }
  }, [activeProject?.id, activeProject?.stories]);

  const [columns, setColumns] = useState<ColumnItem[]>([
    {
      nos: 8,
      name: "C1",
      type: "rectangular",
      category: "combined",
      size: "12x15",
      height: 10,
      shortHeight: 4.0, // 4 ft Footing to Grade Beam (plinth)
      longHeight: 10.0, // 10 ft floor-to-floor
      footingBend: 1.5, // 1.5 ft (18 in) L-bend into footing mat
      lapLength: 2.5, // 2.5 ft (30 in) lap splice extension
      shortStirrupSpacing: 4, // 4" c/c for short column
      longStirrupSpacing: 6, // 6" c/c for floor column
      rebars: [
        { dia: 20, nos: 4 },
        { dia: 16, nos: 4 },
      ],
      mix: "1:1.5:3",
      stirrupDia: 10,
      stirrupSpacing: 6,
    },
  ]);

  // Form Inputs
  const [colName, setColName] = useState("C2");
  const [mixRatio, setMixRatio] = useState("1:1.5:3");
  const [colType, setColType] = useState<"rectangular" | "circular">("rectangular");
  const [colCategory, setColCategory] = useState<"combined" | "short" | "long">("combined");
  const [colNos, setColNos] = useState(4);
  const [colX, setColX] = useState(12);
  const [colY, setColY] = useState(15);
  const [colDia, setColDia] = useState(14);

  // Short & Long Column Heights & Lapping
  const [shortHeight, setShortHeight] = useState(4.0);
  const [longHeight, setLongHeight] = useState(10.0);
  const [footingBend, setFootingBend] = useState(1.5);
  const [lapLength, setLapLength] = useState(2.5);
  const [shortStirrupSpacing, setShortStirrupSpacing] = useState(4);
  const [longStirrupSpacing, setLongStirrupSpacing] = useState(6);

  // Main rebar rows
  const [rebars, setRebars] = useState<{ dia: number; nos: number }[]>([
    { dia: 20, nos: 4 },
    { dia: 16, nos: 4 },
  ]);

  // Stirrups
  const [stirrupDia, setStirrupDia] = useState(10);

  // Base
  const [baseType, setBaseType] = useState<"none" | "picket">("none");
  const [brickRate, setBrickRate] = useState(15);
  const [bricksPerCft, setBricksPerCft] = useState(10);

  // Material Rates
  const [cementRate, setCementRate] = useState(() => activeProject?.rates?.cementRate || 550);
  const [sandRate, setSandRate] = useState(() => activeProject?.rates?.sandRate || 45);
  const [aggRate, setAggRate] = useState(() => activeProject?.rates?.aggRate || 120);
  const [steelRate, setSteelRate] = useState(() => activeProject?.rates?.steelRate || 95);

  useEffect(() => {
    if (activeProject?.rates) {
      if (activeProject.rates.cementRate) setCementRate(activeProject.rates.cementRate);
      if (activeProject.rates.sandRate) setSandRate(activeProject.rates.sandRate);
      if (activeProject.rates.aggRate) setAggRate(activeProject.rates.aggRate);
      if (activeProject.rates.steelRate) setSteelRate(activeProject.rates.steelRate);
      if (activeProject.rates.brickRate) setBrickRate(activeProject.rates.brickRate);
    }
  }, [activeProject?.rates]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);

  const handleSwitchMode = (mode: "combined" | "short" | "long") => {
    setColMode(mode);
    setColCategory(mode);
    setEditingColIndex(null);
    if (!editingEstimateId) {
      if (mode === "short") {
        setEstimateName("Short Column Estimate (Footing to Plinth - 1x Fixed)");
      } else if (mode === "long") {
        setEstimateName(`Long Column Estimate (${projectStories} Storeys Superstructure)`);
      } else {
        setEstimateName(`Reinforced Concrete Columns (Short & ${projectStories} Storeys Long)`);
      }
    }
  };

  const addRebarRow = () => {
    setRebars([...rebars, { dia: 16, nos: 4 }]);
  };

  const delRebarRow = (index: number) => {
    if (rebars.length > 1) {
      setRebars(rebars.filter((_, i) => i !== index));
    }
  };

  const getCurrentFormColumn = (): ColumnItem => {
    const validRebars = rebars.filter((r) => r.dia > 0 && r.nos > 0);
    const size = colType === "rectangular" ? `${colX}x${colY}` : `⌀${colDia}`;
    const effectiveHeight = colCategory === "short" ? shortHeight : longHeight;

    return {
      nos: Math.max(1, colNos),
      name: colName.trim() || `C${columns.length + 1}`,
      type: colType,
      category: colCategory,
      size,
      height: effectiveHeight,
      shortHeight: colCategory === "long" ? 0 : shortHeight,
      longHeight: colCategory === "short" ? 0 : longHeight,
      footingBend: colCategory === "long" ? 0 : footingBend,
      lapLength,
      shortStirrupSpacing,
      longStirrupSpacing,
      rebars: validRebars.length > 0 ? validRebars : [{ dia: 16, nos: 8 }],
      mix: mixRatio,
      stirrupDia,
      stirrupSpacing: colCategory === "short" ? shortStirrupSpacing : longStirrupSpacing,
    };
  };

  const loadColIntoForm = (c: ColumnItem, idx: number) => {
    setEditingColIndex(idx);
    setColName(c.name);
    setColNos(c.nos);
    setColType(c.type);
    setColCategory(c.category || "combined");
    setMixRatio(c.mix || "1:1.5:3");
    setStirrupDia(c.stirrupDia || 10);

    if (c.shortHeight !== undefined && c.shortHeight > 0) setShortHeight(c.shortHeight);
    else if (c.category === "short") setShortHeight(c.height || 4.0);

    if (c.longHeight !== undefined && c.longHeight > 0) setLongHeight(c.longHeight);
    else if (c.category === "long") setLongHeight(c.height || 10.0);

    if (c.footingBend !== undefined) setFootingBend(c.footingBend);
    if (c.lapLength !== undefined) setLapLength(c.lapLength);
    if (c.shortStirrupSpacing !== undefined) setShortStirrupSpacing(c.shortStirrupSpacing);
    if (c.longStirrupSpacing !== undefined) setLongStirrupSpacing(c.longStirrupSpacing);

    if (c.type === "rectangular" && c.size) {
      const parts = c.size.split("x");
      if (parts[0]) setColX(parseFloat(parts[0]) || 12);
      if (parts[1]) setColY(parseFloat(parts[1]) || 15);
    } else if (c.size) {
      const d = parseFloat(c.size.replace("⌀", "")) || 14;
      setColDia(d);
    }

    if (Array.isArray(c.rebars) && c.rebars.length > 0) {
      setRebars(c.rebars);
    }
    setErrorMsg("");
  };

  const handleAddNewColumn = () => {
    setErrorMsg("");
    const validRebars = rebars.filter((r) => r.dia > 0 && r.nos > 0);
    if (validRebars.length === 0) {
      setErrorMsg("Add at least one valid main rebar row.");
      return;
    }
    const current = getCurrentFormColumn();
    const nextList = [...columns, current];
    setColumns(nextList);
    calculate(nextList);

    setEditingColIndex(null);
    setColName(`C${nextList.length + 1}`);
    setSuccessMsg(`✓ Added ${current.name} to column list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateColumn = () => {
    setErrorMsg("");
    if (editingColIndex === null || editingColIndex < 0 || editingColIndex >= columns.length) {
      handleAddNewColumn();
      return;
    }
    const validRebars = rebars.filter((r) => r.dia > 0 && r.nos > 0);
    if (validRebars.length === 0) {
      setErrorMsg("Add at least one valid main rebar row.");
      return;
    }
    const current = getCurrentFormColumn();
    const nextList = [...columns];
    nextList[editingColIndex] = current;
    setColumns(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleStartNewColumn = () => {
    setEditingColIndex(null);
    setColName(`C${columns.length + 1}`);
    setColNos(4);
    setErrorMsg("");
  };

  const handleDuplicateColumn = (idx: number) => {
    const original = columns[idx];
    if (!original) return;
    const duplicated: ColumnItem = {
      ...original,
      name: `${original.name} (Copy)`,
    };
    const nextList = [...columns, duplicated];
    setColumns(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${original.name} as ${duplicated.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleResetFormFields = () => {
    setEditingColIndex(null);
    setColName(`C${columns.length + 1}`);
    setColNos(4);
    setColType("rectangular");
    setColCategory(colMode);
    setColX(12);
    setColY(15);
    setColDia(14);
    setShortHeight(4.0);
    setLongHeight(10.0);
    setFootingBend(1.5);
    setLapLength(2.5);
    setShortStirrupSpacing(4);
    setLongStirrupSpacing(6);
    setStirrupDia(10);
    setMixRatio("1:1.5:3");
    setRebars([
      { dia: 20, nos: 4 },
      { dia: 16, nos: 4 },
    ]);
    setErrorMsg("");
  };

  const deleteColumn = (index: number) => {
    const nextList = columns.filter((_, i) => i !== index);
    setColumns(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingColIndex === index) {
        setEditingColIndex(null);
        setColName(`C${nextList.length + 1}`);
      } else if (editingColIndex !== null && editingColIndex > index) {
        setEditingColIndex(editingColIndex - 1);
      }
    } else {
      setEditingColIndex(null);
      setColName("C1");
      setResults(null);
    }
  };

  // Comprehensive Civil Engineering Calculation for Short & Long Columns
  const calculate = (list = columns) => {
    setErrorMsg("");
    if (list.length === 0) {
      setResults(null);
      return null;
    }

    const COVER_IN = 1.5;
    const isPicket = baseType === "picket";
    const storiesMult = isMultiplying ? Math.max(1, multiplier) : 1;

    // Substructure Short Column accumulators (strictly 1x fixed)
    let shortWetVol = 0;
    let shortSteelKg = 0;
    let shortTiesCount = 0;
    const shortSteelByDia: Record<number, number> = {};

    // Superstructure Long Column accumulators (per single floor)
    let longSingleFloorWetVol = 0;
    let longSingleFloorSteelKg = 0;
    let longSingleFloorTiesCount = 0;
    const longSingleFloorSteelByDia: Record<number, number> = {};

    // Grand Combined totals (Short 1x + Long x Storeys)
    const mixVolumes: Record<string, number> = {};
    const totalSteelByDia: Record<number, number> = {};

    list.forEach((c) => {
      const category = c.category || colMode;
      const hasShort = category === "combined" || category === "short";
      const hasLong = category === "combined" || category === "long";

      // Section Area and Stirrup Perimeter
      let areaSqft = 0;
      let stirrupPerimeterFt = 0;

      if (c.type === "rectangular") {
        const parts = c.size.split("x");
        const x = parseFloat(parts[0]) || 12;
        const y = parseFloat(parts[1]) || 15;
        areaSqft = (x * y) / 144;
        const coreX = Math.max(0, x - 2 * COVER_IN);
        const coreY = Math.max(0, y - 2 * COVER_IN);
        stirrupPerimeterFt = (2 * coreX + 2 * coreY + 6) / 12; // 6" standard hooks
      } else {
        const d = parseFloat(c.size.replace("⌀", "")) || 14;
        areaSqft = (Math.PI * Math.pow(d / 2, 2)) / 144;
        const coreD = Math.max(0, d - 2 * COVER_IN);
        stirrupPerimeterFt = (Math.PI * coreD + 6) / 12;
      }

      const stDia = c.stirrupDia || 10;
      const stSpacingShort = c.shortStirrupSpacing || 4;
      const stSpacingLong = c.longStirrupSpacing || c.stirrupSpacing || 6;
      const bend = c.footingBend !== undefined ? c.footingBend : 1.5;
      const lap = c.lapLength !== undefined ? c.lapLength : 2.5;

      // 1. SHORT COLUMN CALCULATION (Footing to Grade Beam, 1x Fixed Substructure)
      if (hasShort) {
        const hShort = c.shortHeight !== undefined && c.shortHeight > 0 ? c.shortHeight : (c.category === "short" ? c.height : 4.0);
        const colShortWetVol = areaSqft * hShort * c.nos;
        shortWetVol += colShortWetVol;

        // Concrete dry volume contribution (1x)
        const dryVolContribution = colShortWetVol * 1.05 * 1.54;
        const mix = c.mix || "1:1.5:3";
        mixVolumes[mix] = (mixVolumes[mix] || 0) + dryVolContribution;

        // Cutting Length: Short Height + Footing L-Bend (1.5') + Lap Extension (2.5')
        const cuttingLenShort = hShort + bend + lap;

        // Main rebar weight (5% wastage)
        c.rebars.forEach((r) => {
          const dia = Number(r.dia) || 0;
          const nos = Number(r.nos) || 0;
          if (dia > 0 && nos > 0) {
            const w = ((nos * cuttingLenShort * dia * dia) / 533) * c.nos * 1.05;
            shortSteelKg += w;
            shortSteelByDia[dia] = (shortSteelByDia[dia] || 0) + w;
            totalSteelByDia[dia] = (totalSteelByDia[dia] || 0) + w;
          }
        });

        // Ties (Stirrups) in short column (3% wastage)
        const nTiesShort = (Math.ceil((hShort * 12) / stSpacingShort) + 1) * c.nos;
        shortTiesCount += nTiesShort;
        const tieWeightShort = nTiesShort * stirrupPerimeterFt * ((stDia * stDia) / 533) * 1.03;
        shortSteelKg += tieWeightShort;
        shortSteelByDia[stDia] = (shortSteelByDia[stDia] || 0) + tieWeightShort;
        totalSteelByDia[stDia] = (totalSteelByDia[stDia] || 0) + tieWeightShort;
      }

      // 2. LONG COLUMN CALCULATION (Floor Superstructure, multiplied by S storeys)
      if (hasLong) {
        const hLong = c.longHeight !== undefined && c.longHeight > 0 ? c.longHeight : (c.category === "long" ? c.height : 10.0);
        const colLongWetVol = areaSqft * hLong * c.nos;
        longSingleFloorWetVol += colLongWetVol;

        // Multiply dry volume across S storeys
        const dryVolContribution = colLongWetVol * storiesMult * 1.05 * 1.54;
        const mix = c.mix || "1:1.5:3";
        mixVolumes[mix] = (mixVolumes[mix] || 0) + dryVolContribution;

        // Cutting Length per floor: Floor Height + Lap Splice Length (2.5')
        const cuttingLenLong = hLong + lap;

        // Main rebar weight per floor (5% wastage)
        c.rebars.forEach((r) => {
          const dia = Number(r.dia) || 0;
          const nos = Number(r.nos) || 0;
          if (dia > 0 && nos > 0) {
            const wPerFloor = ((nos * cuttingLenLong * dia * dia) / 533) * c.nos * 1.05;
            longSingleFloorSteelKg += wPerFloor;
            longSingleFloorSteelByDia[dia] = (longSingleFloorSteelByDia[dia] || 0) + wPerFloor;

            const wTotal = wPerFloor * storiesMult;
            totalSteelByDia[dia] = (totalSteelByDia[dia] || 0) + wTotal;
          }
        });

        // Ties (Stirrups) in long column (3% wastage)
        const nTiesLong = Math.ceil((hLong * 12) / stSpacingLong) * c.nos;
        longSingleFloorTiesCount += nTiesLong;
        const tieWeightLong = nTiesLong * stirrupPerimeterFt * ((stDia * stDia) / 533) * 1.03;
        longSingleFloorSteelKg += tieWeightLong;
        longSingleFloorSteelByDia[stDia] = (longSingleFloorSteelByDia[stDia] || 0) + tieWeightLong;

        const tieWeightTotal = tieWeightLong * storiesMult;
        totalSteelByDia[stDia] = (totalSteelByDia[stDia] || 0) + tieWeightTotal;
      }
    });

    // Combined Concrete Volumes
    const totalLongWetVol = longSingleFloorWetVol * storiesMult;
    const grandWetVol = shortWetVol + totalLongWetVol;
    const grandWastageVol = grandWetVol * 0.05;
    const grandDryVol = (grandWetVol + grandWastageVol) * 1.54;

    // Cement, Sand, Stone calculations from mixVolumes
    let cementBags = 0;
    let sandCft = 0;
    let aggCft = 0;

    Object.keys(mixVolumes).forEach((mix) => {
      const dryVol = mixVolumes[mix];
      const ratio = mix.split(":").map(Number);
      const cR = ratio[0] || 1;
      const sR = ratio[1] || 1.5;
      const aR = ratio[2] || 3;
      const totalParts = cR + sR + aR;

      cementBags += (dryVol * (cR / totalParts)) / 1.25;
      sandCft += dryVol * (sR / totalParts);
      aggCft += dryVol * (aR / totalParts);
    });
    cementBags = Math.ceil(cementBags);

    // Total Steel across building
    const grandSteelKg = shortSteelKg + longSingleFloorSteelKg * storiesMult;

    // Picket brick alternative
    let brickQty = 0;
    let picketCost = 0;
    if (isPicket) {
      brickQty = Math.ceil(aggCft * bricksPerCft * 1.1);
      picketCost = brickQty * brickRate;
    }

    const useAggregate = !isPicket;
    const cementCost = cementBags * cementRate;
    const sandCost = sandCft * sandRate;
    const aggCost = useAggregate ? aggCft * aggRate : 0;
    const steelCost = grandSteelKg * steelRate;
    const totalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    const totalColsCount = list.reduce((sum, c) => sum + c.nos, 0);

    const calcResult = {
      // General quantities
      cementBags,
      sandCft: Number(sandCft.toFixed(1)),
      aggCft: Number(aggCft.toFixed(1)),
      brickQty,
      useAggregate,
      totalSteelKg: Number(grandSteelKg.toFixed(1)),
      steelBreakdown: Object.fromEntries(
        Object.entries(totalSteelByDia).map(([d, w]) => [d, Number(w.toFixed(1))])
      ),
      totalWetVol: Number(grandWetVol.toFixed(2)),
      totalWastageVol: Number(grandWastageVol.toFixed(2)),
      totalDryVol: Number(grandDryVol.toFixed(2)),
      totalCost: Math.round(totalCost),

      // Costs
      cementCost: Math.round(cementCost),
      sandCost: Math.round(sandCost),
      aggCost: Math.round(aggCost),
      steelCost: Math.round(steelCost),
      picketCost: Math.round(picketCost),

      // Substructure Short Column Specifics (1x Fixed)
      shortColumn: {
        wetVol: Number(shortWetVol.toFixed(2)),
        steelKg: Number(shortSteelKg.toFixed(1)),
        tiesCount: shortTiesCount,
        steelBreakdown: Object.fromEntries(
          Object.entries(shortSteelByDia).map(([d, w]) => [d, Number(w.toFixed(1))])
        ),
      },

      // Superstructure Long Column Specifics (Multiplied by Storeys)
      longColumn: {
        singleFloorWetVol: Number(longSingleFloorWetVol.toFixed(2)),
        singleFloorSteelKg: Number(longSingleFloorSteelKg.toFixed(1)),
        singleFloorTiesCount: longSingleFloorTiesCount,
        totalWetVol: Number(totalLongWetVol.toFixed(2)),
        totalSteelKg: Number((longSingleFloorSteelKg * storiesMult).toFixed(1)),
        totalTiesCount: longSingleFloorTiesCount * storiesMult,
        stories: storiesMult,
        steelBreakdown: Object.fromEntries(
          Object.entries(longSingleFloorSteelByDia).map(([d, w]) => [d, Number((w * storiesMult).toFixed(1))])
        ),
      },

      // Meta
      colMode,
      totalColsCount: colMode === "short" ? totalColsCount : totalColsCount * storiesMult,
      singleFloorColsCount: totalColsCount,
      multiplier: storiesMult,
      isMultiplying,
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(columns);
  }, [colMode, multiplier, isMultiplying, cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft, baseType]);

  const handleClearAllColumns = () => {
    if (columns.length === 0) return;
    if (window.confirm("Remove all columns from current list?")) {
      setColumns([]);
      handleResetFormFields();
      setResults(null);
    }
  };

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentCols = [...columns];
    if (currentCols.length === 0) {
      currentCols = [getCurrentFormColumn()];
      setColumns(currentCols);
    }
    const boq = calculate(currentCols);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : (editingEstimateId || undefined),
      type: "column",
      name: asNewCopy ? `${estimateName} (Copy)` : estimateName,
      totalCost: boq.totalCost || 0,
      summary: boq,
      data: {
        columns: currentCols,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
        colMode,
        multiplier: colMode === "short" ? 1 : (isMultiplying ? Math.max(1, multiplier) : 1),
        isMultiplying: colMode === "short" ? false : isMultiplying,
      },
    });
  };

  const handleSaveAsCopy = async () => {
    await handleSaveToProject(true);
  };

  const handleClearEstimate = () => {
    setEditingEstimateId(null);
    setEstimateName(
      colMode === "short"
        ? "Short Column Estimate (Footing to Plinth - 1x Fixed)"
        : colMode === "long"
        ? `Long Column Estimate (${projectStories} Storeys Superstructure)`
        : `Reinforced Concrete Columns (Short & ${projectStories} Storeys Long)`
    );
    setColumns([]);
    handleResetFormFields();
    setResults(null);
    if (onClearLoadedEstimate) onClearLoadedEstimate();
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);

    const loadedColMode =
      est.data?.colMode ||
      est.summary?.colMode ||
      (est.name.toLowerCase().includes("short") ? "short" : est.name.toLowerCase().includes("long") ? "long" : "combined");

    setColMode(loadedColMode as any);
    setColCategory(loadedColMode as any);

    if (loadedColMode === "short") {
      setMultiplier(1);
      setIsMultiplying(false);
    } else {
      const loadedMultiplier = est.data?.multiplier || est.summary?.multiplier || projectStories;
      setMultiplier(loadedMultiplier);
      setIsMultiplying(est.data?.isMultiplying !== undefined ? Boolean(est.data.isMultiplying) : projectStories > 1);
    }

    if (est.data?.columns && est.data.columns.length > 0) {
      setColumns(est.data.columns);
      setEditingColIndex(null);
      setColName(`C${est.data.columns.length + 1}`);
      if (est.data.rates) {
        setCementRate(est.data.rates.cementRate || 550);
        setSandRate(est.data.rates.sandRate || 45);
        setAggRate(est.data.rates.aggRate || 120);
        setSteelRate(est.data.rates.steelRate || 95);
        if (est.data.rates.brickRate) setBrickRate(est.data.rates.brickRate);
        if (est.data.rates.bricksPerCft) setBricksPerCft(est.data.rates.bricksPerCft);
      }
      if (est.data.baseType) setBaseType(est.data.baseType);
      calculate(est.data.columns);
    }
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "column" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="column"
        typeLabel={colMode === "short" ? "Short Column" : colMode === "long" ? "Long Column" : "Columns (Short & Long)"}
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={handleSaveAsCopy}
        onClearEstimate={handleClearEstimate}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: {
            columns,
            baseType,
            rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
            colMode,
            multiplier: colMode === "short" ? 1 : (isMultiplying ? Math.max(1, multiplier) : 1),
            isMultiplying: colMode === "short" ? false : isMultiplying,
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.columns) {
            setColumns(payload.data.columns);
            calculate(payload.data.columns);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
        <div className="max-w-3xl mx-auto space-y-3">
          {errorMsg && (
            <div className="bg-[#ff4d6d]/15 border border-[#ff4d6d] text-[#ffb3c1] p-2 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#2ecc71]/15 border border-[#2ecc71] text-[#2ecc71] p-2 rounded-lg text-xs font-semibold animate-in fade-in duration-200">
              {successMsg}
            </div>
          )}

          {/* Column System Mode Selector: Combined vs Short Column Only vs Long Column Only */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-2.5 shadow-md space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Column Estimation Mode:
                </span>
                <span className="text-[10px] text-[#8ba3c1] hidden sm:inline">
                  (Short Column = 1× Substructure Fixed · Long Column = ×Storeys Superstructure)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#0e1624] text-[#00c2c7] border border-[#2d4a6a]">
                {colMode === "short"
                  ? "1 Storey Fixed (Substructure)"
                  : colMode === "long"
                  ? `${projectStories} Storeys (Superstructure)`
                  : `Combined (Short 1× + Long ×${projectStories})`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Combined Full Building Takeoff */}
              <button
                type="button"
                onClick={() => handleSwitchMode("combined")}
                className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                  colMode === "combined"
                    ? "bg-gradient-to-r from-[#17334f] to-[#12283e] border-[#00c2c7] shadow-md ring-1 ring-[#00c2c7]/40"
                    : "bg-[#101928] border-[#24374e] hover:border-[#00c2c7]/50 text-[#8ba3c1] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${colMode === "combined" ? "text-[#00c2c7]" : "text-white"}`}>
                    <span className={`w-2 h-2 rounded-full ${colMode === "combined" ? "bg-[#00c2c7]" : "bg-slate-500"}`} />
                    1. Combined (Short + Long)
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#00c2c7]/15 text-[#00c2c7] border border-[#00c2c7]/30">
                    Full Building
                  </span>
                </div>
                <p className="text-[10px] text-[#8ba3c1] mt-1 leading-tight">
                  Short Col (1× Plinth) + Long Col (×{projectStories} Storeys) calculated together.
                </p>
              </button>

              {/* Option 2: Short Column Only */}
              <button
                type="button"
                onClick={() => handleSwitchMode("short")}
                className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                  colMode === "short"
                    ? "bg-gradient-to-r from-[#17334f] to-[#12283e] border-[#38bdf8] shadow-md ring-1 ring-[#38bdf8]/40"
                    : "bg-[#101928] border-[#24374e] hover:border-[#38bdf8]/50 text-[#8ba3c1] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${colMode === "short" ? "text-[#38bdf8]" : "text-white"}`}>
                    <span className={`w-2 h-2 rounded-full ${colMode === "short" ? "bg-[#38bdf8]" : "bg-slate-500"}`} />
                    2. Short Column Only
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    1× Fixed
                  </span>
                </div>
                <p className="text-[10px] text-[#8ba3c1] mt-1 leading-tight">
                  Footing to Grade Beam (Plinth Substructure, constructed once).
                </p>
              </button>

              {/* Option 3: Long Column Only */}
              <button
                type="button"
                onClick={() => handleSwitchMode("long")}
                className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                  colMode === "long"
                    ? "bg-gradient-to-r from-[#17334f] to-[#12283e] border-[#f5a623] shadow-md ring-1 ring-[#f5a623]/40"
                    : "bg-[#101928] border-[#24374e] hover:border-[#f5a623]/50 text-[#8ba3c1] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${colMode === "long" ? "text-[#f5a623]" : "text-white"}`}>
                    <span className={`w-2 h-2 rounded-full ${colMode === "long" ? "bg-[#f5a623]" : "bg-slate-500"}`} />
                    3. Long Column Only
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30">
                    ×{projectStories} Storeys
                  </span>
                </div>
                <p className="text-[10px] text-[#8ba3c1] mt-1 leading-tight">
                  Floor-to-floor superstructure columns multiplied as per building storeys.
                </p>
              </button>
            </div>
          </div>

          {/* Contextual Multiplier Control */}
          {colMode === "short" ? (
            <div className="bg-[#152033] border border-[#38bdf8]/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <div>
                  <span className="font-bold text-[#38bdf8]">Short Column Substructure Notice:</span>
                  <span className="text-[#8ba3c1] ml-1.5">
                    Short columns are poured from footing top to Grade Beam (Plinth level). Locked strictly to <strong>1× Storey</strong> (foundation is built once).
                  </span>
                </div>
              </div>
              <span className="bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ml-2">
                1 Storey Fixed
              </span>
            </div>
          ) : (
            <StoreyMultiplierBar
              projectStories={projectStories}
              multiplier={multiplier}
              setMultiplier={setMultiplier}
              isMultiplying={isMultiplying}
              setIsMultiplying={setIsMultiplying}
              itemTypeLabel={colMode === "combined" ? "Long Column Storeys (Short Column remains 1x)" : "Long Columns"}
            />
          )}

          {/* Active Mode Banner: Editing vs Add New */}
          {editingColIndex !== null && editingColIndex < columns.length ? (
            <div className="bg-[#1a2b42] border border-[#00c2c7]/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00c2c7] animate-pulse" />
                <span className="text-white font-bold">
                  Editing: <span className="text-[#00c2c7]">{colName}</span>{" "}
                  <span className="text-[#8ba3c1] font-normal text-[11px]">
                    (Item #{editingColIndex + 1} of {columns.length})
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartNewColumn}
                className="text-[11px] bg-[#243b55] hover:bg-[#2d4a6a] text-[#00c2c7] hover:text-white px-2.5 py-1 rounded-lg border border-[#00c2c7]/40 flex items-center gap-1 font-semibold transition cursor-pointer"
                title="Switch back to creating a new column"
              >
                <Plus className="w-3 h-3" />
                <span>+ Create New</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#8ba3c1]">
                Mode: <strong className="text-[#00c2c7]">Creating New Column</strong> ({colName})
              </span>
              <span className="text-[10px] text-[#8ba3c1]">
                {columns.length} column position{columns.length !== 1 ? "s" : ""} in list
              </span>
            </div>
          )}

          {/* Column Inputs Form */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 sm:p-4 shadow-lg space-y-3">
            <div className="text-xs font-bold text-[#00c2c7] border-b border-[#2d4a6a] pb-1.5 flex items-center justify-between">
              <span>Column Geometry & Specifications</span>
              <span className="text-[10px] text-[#8ba3c1] font-normal">
                Configure section dimensions, short/long heights & rebars
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Column Mark / Name</label>
                <input
                  type="text"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="e.g. C1"
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Number of Columns</label>
                <NumericInput
                  value={colNos}
                  min="1"
                  onChange={(v) => setColNos(Math.max(1, v))}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Column Shape</label>
                <select
                  value={colType}
                  onChange={(e) => setColType(e.target.value as any)}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
                >
                  <option value="rectangular">Rectangular</option>
                  <option value="circular">Circular</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Concrete Mix Ratio</label>
                <select
                  value={mixRatio}
                  onChange={(e) => setMixRatio(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                >
                  <option value="1:1.5:3">1 : 1.5 : 3 (Standard M20)</option>
                  <option value="1:2:4">1 : 2 : 4 (Nominal M15)</option>
                </select>
              </div>

              {colType === "rectangular" ? (
                <>
                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1">Width X (in)</label>
                    <NumericInput
                      value={colX}
                      step="0.5"
                      onChange={setColX}
                      className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1">Depth Y (in)</label>
                    <NumericInput
                      value={colY}
                      step="0.5"
                      onChange={setColY}
                      className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Diameter (in)</label>
                  <NumericInput
                    value={colDia}
                    step="0.5"
                    onChange={setColDia}
                    className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Category Type</label>
                <select
                  value={colCategory}
                  onChange={(e) => setColCategory(e.target.value as any)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
                >
                  <option value="combined">Combined (Short + Long)</option>
                  <option value="short">Short Column Only (1x)</option>
                  <option value="long">Long Column Only (Storeys)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Ties / Stirrup Dia</label>
                <select
                  value={stirrupDia}
                  onChange={(e) => setStirrupDia(Number(e.target.value))}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                >
                  <option value={10}>10 mm (3 Suta)</option>
                  <option value={8}>8 mm (2.5 Suta)</option>
                  <option value={12}>12 mm (4 Suta)</option>
                </select>
              </div>
            </div>

            {/* SHORT COLUMN PARAMETERS (Footing to Grade Beam) */}
            {(colCategory === "combined" || colCategory === "short") && (
              <div className="bg-[#121c2d] border border-[#38bdf8]/40 rounded-xl p-2.5 sm:p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#38bdf8]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Short Column (Plinth Substructure — 1 Storey Fixed)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    Cutting Length = {shortHeight} + {footingBend} + {lapLength} = {(shortHeight + footingBend + lapLength).toFixed(2)} ft
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Clear height from top of footing up to bottom/top of Grade Beam">
                      Short Ht (ft)
                    </label>
                    <NumericInput
                      value={shortHeight}
                      step="0.1"
                      onChange={setShortHeight}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono font-bold"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">Footing to Grade Beam</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="90° development L-bend of vertical rebar onto footing mesh">
                      Footing Bend (ft)
                    </label>
                    <NumericInput
                      value={footingBend}
                      step="0.1"
                      onChange={setFootingBend}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">L-bend (18" standard)</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Rebar extension above Grade Beam for lap splice into ground floor column">
                      Lap Length above GB (ft)
                    </label>
                    <NumericInput
                      value={lapLength}
                      step="0.1"
                      onChange={setLapLength}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">40d-50d splice extension</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Ties spacing in short column (often 4 inches c/c)">
                      Ties Spacing (in)
                    </label>
                    <NumericInput
                      value={shortStirrupSpacing}
                      step="0.5"
                      onChange={setShortStirrupSpacing}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">Close spacing in short col</span>
                  </div>
                </div>
              </div>
            )}

            {/* LONG COLUMN PARAMETERS (Superstructure Floor to Floor) */}
            {(colCategory === "combined" || colCategory === "long") && (
              <div className="bg-[#121c2d] border border-[#f5a623]/40 rounded-xl p-2.5 sm:p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#f5a623]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Long Column (Floor Superstructure — Multiplied as per Storeys)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30">
                    Cutting Length / Floor = {longHeight} + {lapLength} = {(longHeight + lapLength).toFixed(2)} ft
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Clear floor-to-floor height per storey">
                      Floor-to-Floor Height (ft)
                    </label>
                    <NumericInput
                      value={longHeight}
                      step="0.1"
                      onChange={setLongHeight}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono font-bold"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">Standard 10 ft / storey</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Lap splice length between successive floors">
                      Floor Lap Length (ft)
                    </label>
                    <NumericInput
                      value={lapLength}
                      step="0.1"
                      onChange={setLapLength}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">30" (45d splicing)</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8ba3c1] block mb-1" title="Ties spacing in long column">
                      Ties Spacing (in)
                    </label>
                    <NumericInput
                      value={longStirrupSpacing}
                      step="0.5"
                      onChange={setLongStirrupSpacing}
                      className="w-full h-8 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none font-mono"
                    />
                    <span className="text-[9px] text-[#8ba3c1]/70">6" c/c standard</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Longitudinal Rebar Rows */}
            <div className="space-y-2 pt-1 border-t border-[#2d4a6a]/60">
              <div className="text-xs font-semibold text-[#00c2c7] flex justify-between items-center">
                <span>Main Longitudinal Rebar Bars</span>
                <button
                  type="button"
                  onClick={addRebarRow}
                  className="text-[10px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  + Add Bar Row
                </button>
              </div>

              <div className="space-y-1.5">
                {rebars.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#121c2d] p-1.5 rounded-lg border border-[#2d4a6a]">
                    <div className="flex-1">
                      <label className="text-[9px] text-[#8ba3c1] block">Diameter (mm)</label>
                      <select
                        value={r.dia}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const next = [...rebars];
                          next[i].dia = val;
                          setRebars(next);
                        }}
                        className="w-full h-7 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded text-xs text-white font-mono"
                      >
                        <option value={12}>12 mm (4 Suta)</option>
                        <option value={16}>16 mm (5 Suta)</option>
                        <option value={20}>20 mm (6 Suta)</option>
                        <option value={22}>22 mm (7 Suta)</option>
                        <option value={25}>25 mm (8 Suta)</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="text-[9px] text-[#8ba3c1] block">Nos of Bars</label>
                      <NumericInput
                        value={r.nos}
                        min="1"
                        onChange={(v) => {
                          const next = [...rebars];
                          next[i].nos = Math.max(1, v);
                          setRebars(next);
                        }}
                        className="w-full h-7 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded text-xs text-white font-mono font-bold"
                      />
                    </div>

                    {rebars.length > 1 && (
                      <button
                        type="button"
                        onClick={() => delRebarRow(i)}
                        className="p-1.5 text-[#ff4d6d] hover:bg-[#ff4d6d]/20 rounded mt-3 cursor-pointer"
                        title="Delete bar row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Base Aggregate Options & Unit Rates */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#2d4a6a]/60">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Base Aggregate</label>
                <select
                  value={baseType}
                  onChange={(e) => setBaseType(e.target.value as any)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                >
                  <option value="none">Stone Aggregate</option>
                  <option value="picket">Picket Brick Chips</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (৳/bag)</label>
                <NumericInput
                  value={cementRate}
                  onChange={setCementRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (৳/cft)</label>
                <NumericInput
                  value={sandRate}
                  onChange={setSandRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Stone/Khoa (৳/cft)</label>
                <NumericInput
                  value={aggRate}
                  onChange={setAggRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Steel (৳/kg)</label>
                <NumericInput
                  value={steelRate}
                  onChange={setSteelRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#2d4a6a]/60">
              <button
                type="button"
                onClick={handleResetFormFields}
                className="flex-1 h-9 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset input fields"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              {editingColIndex !== null && editingColIndex < columns.length ? (
                <div className="flex-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateColumn}
                    className="flex-1 h-9 bg-[#2ecc71] hover:bg-[#27ae60] text-[#0f1c2e] font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Update Column in List
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewColumn}
                    className="px-3 h-9 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center cursor-pointer"
                    title="Cancel editing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNewColumn}
                  className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Column to List</span>
                </button>
              )}
            </div>
          </div>

          {/* Added Columns Table */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] border-b border-[#2d4a6a] pb-1.5">
              <div className="flex items-center gap-2">
                <span>Added Column Positions</span>
                <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                  {columns.length} items · {results?.totalColsCount || columns.length} total columns
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleStartNewColumn}
                  className="text-[10px] bg-[#00c2c7]/20 hover:bg-[#00c2c7]/30 text-[#00c2c7] border border-[#00c2c7]/40 px-2 py-0.5 rounded font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Switch form to enter a new column"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New</span>
                </button>
                {columns.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllColumns}
                    className="text-[10px] text-[#ff4d6d] hover:bg-[#ff4d6d]/15 border border-[#ff4d6d]/30 px-2 py-0.5 rounded transition font-semibold cursor-pointer"
                    title="Remove all columns from current list"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {columns.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No columns in list yet. Enter details above and click <strong className="text-[#00c2c7]">"+ Add Column to List"</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {columns.map((c, idx) => {
                  const isBeingEdited = editingColIndex === idx;
                  const cat = c.category || colMode;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-3 transition cursor-pointer ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/15 border-[#00c2c7] shadow-sm ring-1 ring-[#00c2c7]/40"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/50"
                      }`}
                      onClick={() => loadColIntoForm(c, idx)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {c.nos} × {c.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-[#0e1624] text-[#00c2c7] border border-[#2d4a6a]">
                              {c.size}"
                            </span>
                            {cat === "combined" ? (
                              <span className="text-[9px] bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                Combined: Short 1× + Long ×{multiplier}
                              </span>
                            ) : cat === "short" ? (
                              <span className="text-[9px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                Short Col: 1× Fixed Substructure
                              </span>
                            ) : (
                              <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                Long Col: ×{multiplier} Storeys
                              </span>
                            )}
                            {isBeingEdited && (
                              <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                Editing
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1.5 text-[11px] text-[#8ba3c1]">
                            {(cat === "combined" || cat === "short") && (
                              <div className="text-[#38bdf8] font-mono text-[10px]">
                                <strong>Short Col:</strong> {c.shortHeight || 4.0}ft ht + {c.footingBend ?? 1.5}ft footing bend + {c.lapLength ?? 2.5}ft lap = {((c.shortHeight || 4.0) + (c.footingBend ?? 1.5) + (c.lapLength ?? 2.5)).toFixed(2)}ft cut length (Ties @{c.shortStirrupSpacing || 4}")
                              </div>
                            )}
                            {(cat === "combined" || cat === "long") && (
                              <div className="text-[#f5a623] font-mono text-[10px]">
                                <strong>Long Col:</strong> {c.longHeight || 10.0}ft floor ht + {c.lapLength ?? 2.5}ft lap = {((c.longHeight || 10.0) + (c.lapLength ?? 2.5)).toFixed(2)}ft cut length / floor (Ties @{c.longStirrupSpacing || 6}")
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] text-[#8ba3c1] font-mono mt-1">
                            Main: {c.rebars.map((r) => `${r.nos}Ø${r.dia}mm`).join(" + ")} · Ties: ⌀{c.stirrupDia || 10}mm · Mix: {c.mix || "1:1.5:3"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => loadColIntoForm(c, idx)}
                            className="px-2 py-1 bg-[#243b55] hover:bg-[#00c2c7] text-[#00c2c7] hover:text-[#0f1c2e] rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Edit this column"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateColumn(idx)}
                            className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Duplicate this column"
                          >
                            <Copy className="w-3 h-3 text-[#f5a623]" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteColumn(idx)}
                            className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
                            title="Delete this column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comprehensive Results Breakdown */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#00c2c7] flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Column Takeoff & Material Engineering Results
                  </h3>
                  <p className="text-[10px] text-[#8ba3c1]">
                    Accurate separation of Substructure (Short Column 1×) and Superstructure (Long Column ×{multiplier} Storeys)
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-[#2ecc71] bg-[#2ecc71]/15 px-2 py-0.5 rounded border border-[#2ecc71]/30">
                  ৳ {results.totalCost.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Substructure vs Superstructure Comparative Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Short Column Substructure (1x Fixed) */}
                <div className="bg-[#152033] border border-[#38bdf8]/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#38bdf8]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      1. Short Column Substructure
                    </span>
                    <span className="bg-[#38bdf8]/20 text-[#38bdf8] text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-[#38bdf8]/40">
                      1× Fixed (Ground Level)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Wet Concrete</div>
                      <div className="font-bold text-white text-xs font-mono">{results.shortColumn.wetVol} cft</div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Total Steel</div>
                      <div className="font-bold text-[#38bdf8] text-xs font-mono">{results.shortColumn.steelKg} kg</div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Total Ties / Rings</div>
                      <div className="font-bold text-white text-xs font-mono">{results.shortColumn.tiesCount} pcs</div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Rebar Diameters</div>
                      <div className="font-bold text-[#8ba3c1] text-[10px] font-mono truncate">
                        {Object.entries(results.shortColumn.steelBreakdown)
                          .map(([d, w]) => `${d}mm:${w}k`)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#8ba3c1] italic">
                    Includes footing embedment (1.5' L-bend) + Grade Beam splice lap (2.5')
                  </div>
                </div>

                {/* 2. Long Column Superstructure (xStoreys) */}
                <div className="bg-[#152033] border border-[#f5a623]/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#f5a623]">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      2. Long Column Superstructure
                    </span>
                    <span className="bg-[#f5a623]/20 text-[#f5a623] text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-[#f5a623]/40">
                      ×{results.longColumn.stories} Storeys Multiplied
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Concrete (Total)</div>
                      <div className="font-bold text-white text-xs font-mono">
                        {results.longColumn.totalWetVol} cft
                        <span className="text-[9px] text-[#8ba3c1] font-normal ml-1">
                          ({results.longColumn.singleFloorWetVol} / floor)
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Steel (Total)</div>
                      <div className="font-bold text-[#f5a623] text-xs font-mono">
                        {results.longColumn.totalSteelKg} kg
                        <span className="text-[9px] text-[#8ba3c1] font-normal ml-1">
                          ({results.longColumn.singleFloorSteelKg} / floor)
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Ties / Rings (Total)</div>
                      <div className="font-bold text-white text-xs font-mono">
                        {results.longColumn.totalTiesCount} pcs
                        <span className="text-[9px] text-[#8ba3c1] font-normal ml-1">
                          ({results.longColumn.singleFloorTiesCount} / floor)
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#101928] p-1.5 rounded border border-[#24374e]">
                      <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Rebar Diameters</div>
                      <div className="font-bold text-[#8ba3c1] text-[10px] font-mono truncate">
                        {Object.entries(results.longColumn.steelBreakdown)
                          .map(([d, w]) => `${d}mm:${w}k`)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#8ba3c1] italic">
                    Includes floor height (10') + 2.5' floor splicing lapping per floor
                  </div>
                </div>
              </div>

              {/* Consolidated Materials Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1] font-medium">Total Cement</div>
                  <div className="text-base font-bold text-[#f5a623] font-mono mt-0.5">
                    {results.cementBags} bags
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]/70">৳ {results.cementCost.toLocaleString("en-IN")}</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f1f5f9]/20 rounded-xl p-2.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1] font-medium">Total Sand</div>
                  <div className="text-base font-bold text-[#f1f5f9] font-mono mt-0.5">
                    {results.sandCft} cft
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]/70">৳ {results.sandCost.toLocaleString("en-IN")}</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#38bdf8]/40 rounded-xl p-2.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1] font-medium">
                    {results.useAggregate ? "Stone Aggregate" : "Picket Brick"}
                  </div>
                  <div className="text-base font-bold text-[#38bdf8] font-mono mt-0.5">
                    {results.useAggregate ? `${results.aggCft} cft` : `${results.brickQty} pcs`}
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]/70">
                    ৳ {(results.useAggregate ? results.aggCost : results.picketCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-xl p-2.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1] font-medium">Total Rebar Steel</div>
                  <div className="text-base font-bold text-[#00c2c7] font-mono mt-0.5">
                    {results.totalSteelKg} kg
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]/70">৳ {results.steelCost.toLocaleString("en-IN")}</div>
                </div>
              </div>

              {/* Steel Diameter Detailed Breakdown */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-semibold text-[#8ba3c1] flex items-center justify-between">
                  <span>Rebar Diameter Breakdown (Combined Total):</span>
                  <span className="font-mono text-[#00c2c7]">{(results.totalSteelKg / 1000).toFixed(2)} Metric Tons</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 text-center">
                  {Object.keys(results.steelBreakdown)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((dia) => (
                      <div key={dia} className="bg-[#152033] border border-[#2d4a6a] rounded-lg p-1.5">
                        <div className="text-[9px] text-[#8ba3c1]">
                          {dia === 10 || dia === 8 ? `Ties ${dia}mm` : `${dia} mm Rebar`}
                        </div>
                        <div className="text-xs font-bold text-white font-mono">
                          {results.steelBreakdown[dia].toFixed(1)} kg
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Volume Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-[#2d4a6a]/60">
                <div className="bg-[#101928] p-2 rounded-lg border border-[#24374e]">
                  <div className="text-[#8ba3c1]">Wet Volume</div>
                  <div className="font-bold text-[#c4b5fd] font-mono text-xs">{results.totalWetVol} cft</div>
                </div>
                <div className="bg-[#101928] p-2 rounded-lg border border-[#24374e]">
                  <div className="text-[#8ba3c1]">+5% Wastage</div>
                  <div className="font-bold text-[#c4b5fd] font-mono text-xs">{results.totalWastageVol} cft</div>
                </div>
                <div className="bg-[#101928] p-2 rounded-lg border border-[#24374e]">
                  <div className="text-[#8ba3c1]">Dry Vol (×1.54 factor)</div>
                  <div className="font-bold text-[#c4b5fd] font-mono text-xs">{results.totalDryVol} cft</div>
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="bg-gradient-to-r from-[#17334f] via-[#1a3a2a] to-[#0f2a1e] border-2 border-[#2ecc71] rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[10px] text-[#a3e4bd] font-semibold uppercase tracking-wider">
                    Total Column Valuation (Short 1× + Long ×{results.multiplier} Storeys)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#2ecc71] font-mono">
                    ৳ {results.totalCost.toLocaleString("en-IN")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveToProject(false)}
                  className="bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] hover:to-[#00989d] text-[#0f1c2e] px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Save to Project</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
