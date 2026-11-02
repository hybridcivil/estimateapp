import React, { useState, useEffect, useMemo } from "react";
import { Project, ProjectEstimateItem, BrickWallItem, WallOpening } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import {
  RotateCcw,
  BrickWall,
  Plus,
  Trash2,
  Edit3,
  Copy,
  DoorOpen,
  AppWindow,
  CheckCircle2,
  Info,
} from "lucide-react";

interface BrickCalculatorProps {
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

export const BrickCalculator: React.FC<BrickCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Brickwork & Plaster Estimate");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  // Multi-Storey Building Multiplier
  const projectStories = activeProject?.stories || 1;
  const [multiplier, setMultiplier] = useState(projectStories);
  const [isMultiplying, setIsMultiplying] = useState(projectStories > 1);

  // Sync multiplier when project changes
  useEffect(() => {
    if (activeProject?.stories) {
      setMultiplier(activeProject.stories);
      setIsMultiplying(activeProject.stories > 1);
    }
  }, [activeProject?.id, activeProject?.stories]);

  // Added Walls List
  const [walls, setWalls] = useState<BrickWallItem[]>([
    {
      id: "wall_1",
      nos: 1,
      name: "Outer Perimeter Wall 10\"",
      totalLength: 100,
      length: 100,
      height: 10,
      wallThickness: 10,
      openings: [
        {
          id: "op_d1",
          type: "door",
          name: "Main Door D1",
          count: 1,
          width: 3.5,
          height: 7,
        },
        {
          id: "op_d2",
          type: "door",
          name: "Room Door D2",
          count: 2,
          width: 3,
          height: 7,
        },
        {
          id: "op_w1",
          type: "window",
          name: "Bedroom Window W1",
          count: 4,
          width: 5,
          height: 4.5,
        },
      ],
      brickLengthIn: 9.5,
      brickWidthIn: 4.5,
      brickHeightIn: 2.75,
      brickMix: "1:4",
      plasterMix: "1:4",
      plasterThicknessMm: 12,
    },
  ]);
  const [editingWallIndex, setEditingWallIndex] = useState<number | null>(null);

  // Form Inputs (Simplified: Only Wall Name, Nos, Total Wall Length, Height, Thickness)
  const [wallName, setWallName] = useState("Outer Perimeter Wall 10\"");
  const [wallNos, setWallNos] = useState(1);
  const [totalLength, setTotalLength] = useState(100);
  const [height, setHeight] = useState(10);
  const [wallThickness, setWallThickness] = useState(10); // 10" or 5"

  // Openings (Dynamic Doors & Windows Add System)
  const [openings, setOpenings] = useState<WallOpening[]>([
    {
      id: "op_d1",
      type: "door",
      name: "Main Door D1",
      count: 1,
      width: 3.5,
      height: 7,
    },
    {
      id: "op_d2",
      type: "door",
      name: "Room Door D2",
      count: 2,
      width: 3,
      height: 7,
    },
    {
      id: "op_w1",
      type: "window",
      name: "Bedroom Window W1",
      count: 4,
      width: 5,
      height: 4.5,
    },
  ]);

  // Brick Details
  const [brickLengthIn, setBrickLengthIn] = useState(9.5);
  const [brickWidthIn, setBrickWidthIn] = useState(4.5);
  const [brickHeightIn, setBrickHeightIn] = useState(2.75);

  // Mortar & Plaster
  const [brickMix, setBrickMix] = useState("1:4");
  const [plasterMix, setPlasterMix] = useState("1:4");
  const [plasterThicknessMm, setPlasterThicknessMm] = useState(12);

  // Rates initialized from activeProject.rates or defaults
  const [brickRate, setBrickRate] = useState(() => activeProject?.rates?.brickRate || 15);
  const [cementRate, setCementRate] = useState(() => activeProject?.rates?.cementRate || 550);
  const [sandRate, setSandRate] = useState(() => activeProject?.rates?.sandRate || 45);
  const [grillRate, setGrillRate] = useState(() => activeProject?.rates?.grillRatePerSft || 180);
  const [aluminiumRate, setAluminiumRate] = useState(() => activeProject?.rates?.aluminiumGlassRatePerSft || 450);

  useEffect(() => {
    if (activeProject?.rates) {
      if (activeProject.rates.brickRate) setBrickRate(activeProject.rates.brickRate);
      if (activeProject.rates.cementRate) setCementRate(activeProject.rates.cementRate);
      if (activeProject.rates.sandRate) setSandRate(activeProject.rates.sandRate);
      if (activeProject.rates.grillRatePerSft) setGrillRate(activeProject.rates.grillRatePerSft);
      if (activeProject.rates.aluminiumGlassRatePerSft) setAluminiumRate(activeProject.rates.aluminiumGlassRatePerSft);
    }
  }, [activeProject?.rates]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  // Live calculations for current active form
  const formGrossArea = useMemo(() => {
    const nos = wallNos > 0 ? wallNos : 1;
    const len = totalLength > 0 ? totalLength : 0;
    const h = height > 0 ? height : 0;
    return len * h * nos;
  }, [wallNos, totalLength, height]);

  const formDeductionBreakdown = useMemo(() => {
    const nos = wallNos > 0 ? wallNos : 1;
    let doorArea = 0;
    let doorCount = 0;
    let winArea = 0;
    let winCount = 0;

    openings.forEach((op) => {
      const c = op.count || 0;
      const w = op.width || 0;
      const h = op.height || 0;
      const area = c * w * h;
      if (op.type === "door") {
        doorArea += area;
        doorCount += c;
      } else {
        winArea += area;
        winCount += c;
      }
    });

    const totalDed = (doorArea + winArea) * nos;
    const netArea = Math.max(0, formGrossArea - totalDed);
    return {
      doorArea: doorArea * nos,
      doorCount: doorCount * nos,
      winArea: winArea * nos,
      winCount: winCount * nos,
      totalDeduction: totalDed,
      netArea,
    };
  }, [openings, formGrossArea, wallNos]);

  // Openings Add System functions
  const handleAddDoor = (preset?: { name: string; width: number; height: number }) => {
    const nextNum = openings.filter((o) => o.type === "door").length + 1;
    const newOpening: WallOpening = {
      id: "op_door_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
      type: "door",
      name: preset ? preset.name : `Door D${nextNum}`,
      count: 1,
      width: preset ? preset.width : 3.25,
      height: preset ? preset.height : 7,
    };
    setOpenings((prev) => [...prev, newOpening]);
  };

  const handleAddWindow = (preset?: { name: string; width: number; height: number }) => {
    const nextNum = openings.filter((o) => o.type === "window").length + 1;
    const newOpening: WallOpening = {
      id: "op_win_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
      type: "window",
      name: preset ? preset.name : `Window W${nextNum}`,
      count: 1,
      width: preset ? preset.width : 4.5,
      height: preset ? preset.height : 4.5,
    };
    setOpenings((prev) => [...prev, newOpening]);
  };

  const handleUpdateOpening = (id: string, updates: Partial<WallOpening>) => {
    setOpenings((prev) => prev.map((op) => (op.id === id ? { ...op, ...updates } : op)));
  };

  const handleDeleteOpening = (id: string) => {
    setOpenings((prev) => prev.filter((op) => op.id !== id));
  };

  const getCurrentFormWall = (): BrickWallItem => {
    const doorList = openings.filter((o) => o.type === "door");
    const winList = openings.filter((o) => o.type !== "door");
    const totalDoorCount = doorList.reduce((s, o) => s + (o.count || 0), 0);
    const totalWinCount = winList.reduce((s, o) => s + (o.count || 0), 0);

    return {
      id: editingWallIndex !== null ? walls[editingWallIndex]?.id : "wall_" + Date.now(),
      nos: wallNos > 0 ? wallNos : 1,
      name: wallName.trim() || `Wall ${walls.length + 1}`,
      totalLength: totalLength > 0 ? totalLength : 1,
      length: totalLength > 0 ? totalLength : 1, // for full backward compatibility
      height: height > 0 ? height : 10,
      wallThickness: wallThickness > 0 ? wallThickness : 10,
      openings: [...openings],
      // Summary fields for backward compatibility
      windowCount: totalWinCount,
      windowWidth: winList[0]?.width || 4,
      windowHeight: winList[0]?.height || 4,
      doorCount: totalDoorCount,
      doorWidth: doorList[0]?.width || 3.25,
      doorHeight: doorList[0]?.height || 7,
      brickLengthIn,
      brickWidthIn,
      brickHeightIn,
      brickMix,
      plasterMix,
      plasterThicknessMm,
    };
  };

  const loadWallIntoForm = (w: BrickWallItem, idx: number) => {
    setEditingWallIndex(idx);
    setWallName(w.name);
    setWallNos(w.nos || 1);

    // Calculate total length if loading an older estimate that had length + spans
    const calculatedLen =
      w.totalLength !== undefined
        ? w.totalLength
        : w.lengthSpans
        ? (w.length || 0) * (w.lengthSpans || 1) + (w.width || 0) * (w.widthSpans || 0)
        : w.length || 100;

    setTotalLength(calculatedLen > 0 ? calculatedLen : 100);
    setHeight(w.height || 10);
    setWallThickness(w.wallThickness || 10);

    // Load openings or rebuild from legacy fields
    if (w.openings && Array.isArray(w.openings) && w.openings.length > 0) {
      setOpenings(w.openings);
    } else {
      const reconstructed: WallOpening[] = [];
      if (w.doorCount && w.doorCount > 0) {
        reconstructed.push({
          id: "door_legacy_" + Date.now(),
          type: "door",
          name: "Doors",
          count: w.doorCount,
          width: w.doorWidth || 3.25,
          height: w.doorHeight || 7,
        });
      }
      if (w.windowCount && w.windowCount > 0) {
        reconstructed.push({
          id: "win_legacy_" + Date.now(),
          type: "window",
          name: "Windows",
          count: w.windowCount,
          width: w.windowWidth || 4.5,
          height: w.windowHeight || 4.5,
        });
      }
      setOpenings(reconstructed);
    }

    setBrickLengthIn(w.brickLengthIn || 9.5);
    setBrickWidthIn(w.brickWidthIn || 4.5);
    setBrickHeightIn(w.brickHeightIn || 2.75);
    setBrickMix(w.brickMix || "1:4");
    setPlasterMix(w.plasterMix || "1:4");
    setPlasterThicknessMm(w.plasterThicknessMm || 12);
    setErrorMsg("");
  };

  const handleAddNewWall = () => {
    setErrorMsg("");
    if (totalLength <= 0 || height <= 0) {
      setErrorMsg("Please enter valid total wall length and height.");
      return;
    }
    const current = getCurrentFormWall();
    const nextList = [...walls, current];
    setWalls(nextList);
    calculate(nextList);

    setEditingWallIndex(null);
    setWallName(`Wall ${nextList.length + 1}`);
    setWallNos(1);
    setSuccessMsg(`✓ Added ${current.name} to wall list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateWall = () => {
    setErrorMsg("");
    if (editingWallIndex === null || editingWallIndex < 0 || editingWallIndex >= walls.length) {
      handleAddNewWall();
      return;
    }
    const current = getCurrentFormWall();
    const nextList = [...walls];
    nextList[editingWallIndex] = current;
    setWalls(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDuplicateWall = (idx: number) => {
    const orig = walls[idx];
    if (!orig) return;
    const duplicated: BrickWallItem = {
      ...orig,
      id: "wall_" + Date.now(),
      name: `${orig.name} (Copy)`,
    };
    const nextList = [...walls, duplicated];
    setWalls(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${orig.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteWall = (idx: number) => {
    const nextList = walls.filter((_, i) => i !== idx);
    setWalls(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingWallIndex === idx) {
        setEditingWallIndex(null);
        setWallName(`Wall ${nextList.length + 1}`);
      } else if (editingWallIndex !== null && editingWallIndex > idx) {
        setEditingWallIndex(editingWallIndex - 1);
      }
    } else {
      setEditingWallIndex(null);
      setWallName("Wall 1");
      setResults(null);
    }
  };

  const resetForm = () => {
    setWallName(`Wall ${walls.length + 1}`);
    setWallNos(1);
    setTotalLength(100);
    setHeight(10);
    setWallThickness(10);
    setOpenings([
      {
        id: "op_d1",
        type: "door",
        name: "Main Door D1",
        count: 1,
        width: 3.5,
        height: 7,
      },
      {
        id: "op_d2",
        type: "door",
        name: "Room Door D2",
        count: 2,
        width: 3,
        height: 7,
      },
      {
        id: "op_w1",
        type: "window",
        name: "Bedroom Window W1",
        count: 4,
        width: 5,
        height: 4.5,
      },
    ]);
    setEditingWallIndex(null);
    setErrorMsg("");
  };

  const getMixRatio = (mixStr: string) => {
    const parts = mixStr.split(":").map(Number);
    const c = parts[0] || 1;
    const s = parts[1] || 4;
    return { cement: c, sand: s, total: c + s };
  };

  const calculate = (list = walls) => {
    setErrorMsg("");
    if (!list || list.length === 0) {
      setResults(null);
      return null;
    }

    let totalGrossArea = 0;
    let totalDeductions = 0;
    let totalNetArea = 0;
    let totalNetVol = 0;
    let totalBricks = 0;
    let totalBrickCement = 0;
    let totalBrickSand = 0;
    let totalPlasterCement = 0;
    let totalPlasterSand = 0;
    let totalWindowArea = 0;
    let totalDoorArea = 0;

    list.forEach((w) => {
      const nos = w.nos > 0 ? w.nos : 1;
      // Total running length
      const wallLen =
        w.totalLength !== undefined
          ? w.totalLength
          : w.lengthSpans
          ? (w.length || 0) * (w.lengthSpans || 1) + (w.width || 0) * (w.widthSpans || 0)
          : w.length || 0;

      const grossArea = wallLen * (w.height || 10) * nos;

      let deduction = 0;
      if (w.openings && Array.isArray(w.openings) && w.openings.length > 0) {
        w.openings.forEach((op) => {
          const a = (op.count || 0) * (op.width || 0) * (op.height || 0) * nos;
          deduction += a;
          if (op.type === "window") totalWindowArea += a;
          else if (op.type === "door") totalDoorArea += a;
        });
      } else {
        const windowArea = (w.windowCount || 0) * (w.windowWidth || 0) * (w.windowHeight || 0) * nos;
        const doorArea = (w.doorCount || 0) * (w.doorWidth || 0) * (w.doorHeight || 0) * nos;
        deduction = windowArea + doorArea;
        totalWindowArea += windowArea;
        totalDoorArea += doorArea;
      }

      const netArea = Math.max(0, grossArea - deduction);
      const thicknessFt = (w.wallThickness || 10) / 12;
      const netVol = netArea * thicknessFt;

      totalGrossArea += grossArea;
      totalDeductions += deduction;
      totalNetArea += netArea;
      totalNetVol += netVol;

      // Brick Count Calculation
      const bL = (w.brickLengthIn || 9.5) / 12;
      const bW = (w.brickWidthIn || 4.5) / 12;
      const bH = (w.brickHeightIn || 2.75) / 12;

      // With 0.5" (12.5mm) mortar joint
      const bL_m = bL + 0.5 / 12;
      const bW_m = bW + 0.5 / 12;
      const bH_m = bH + 0.5 / 12;
      const volPerBrickWithMortar = bL_m * bW_m * bH_m;

      const numBricks = Math.ceil((netVol / volPerBrickWithMortar) * 1.05); // 5% wastage
      totalBricks += numBricks;

      // Mortar volume = total wall volume - actual bricks volume
      const actualBricksVol = numBricks * (bL * bW * bH);
      const wetMortarVol = Math.max(0, netVol - actualBricksVol);
      const dryMortarVol = wetMortarVol * 1.5; // Dry factor

      const bMix = getMixRatio(w.brickMix || "1:4");
      const cVol = dryMortarVol * (bMix.cement / bMix.total);
      const sVol = dryMortarVol * (bMix.sand / bMix.total);

      totalBrickCement += cVol / 1.25;
      totalBrickSand += sVol;

      // Plaster Calculation (both sides of wall)
      const plasterArea = netArea * 2;
      const plasterThicknessFt = ((w.plasterThicknessMm || 12) / 25.4) / 12;
      const wetPlasterVol = plasterArea * plasterThicknessFt;
      const dryPlasterVol = wetPlasterVol * 1.35;

      const pMix = getMixRatio(w.plasterMix || "1:4");
      const pCVol = dryPlasterVol * (pMix.cement / pMix.total);
      const pSVol = dryPlasterVol * (pMix.sand / pMix.total);

      totalPlasterCement += pCVol / 1.25;
      totalPlasterSand += pSVol;
    });

    const totalCementBags = Math.ceil(totalBrickCement + totalPlasterCement);
    const totalSandCft = Number((totalBrickSand + totalPlasterSand).toFixed(1));

    const brickCost = totalBricks * brickRate;
    const cementCost = totalCementBags * cementRate;
    const sandCost = totalSandCft * sandRate;
    const singleFloorTotalCost = brickCost + cementCost + sandCost;

    // Apply Storey Multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    const calcResult = {
      totalWallArea: Number((isMultiplying ? totalNetArea * effMultiplier : totalNetArea).toFixed(1)),
      grossArea: Number((isMultiplying ? totalGrossArea * effMultiplier : totalGrossArea).toFixed(1)),
      deductions: Number((isMultiplying ? totalDeductions * effMultiplier : totalDeductions).toFixed(1)),
      totalNetVol: Number((isMultiplying ? totalNetVol * effMultiplier : totalNetVol).toFixed(2)),
      totalBricks: isMultiplying ? totalBricks * effMultiplier : totalBricks,
      brickQty: isMultiplying ? totalBricks * effMultiplier : totalBricks,
      totalCementBags: isMultiplying ? Math.ceil(totalCementBags * effMultiplier) : totalCementBags,
      cementBags: isMultiplying ? Math.ceil(totalCementBags * effMultiplier) : totalCementBags,
      totalSandCft: Number((isMultiplying ? totalSandCft * effMultiplier : totalSandCft).toFixed(1)),
      sandCft: Number((isMultiplying ? totalSandCft * effMultiplier : totalSandCft).toFixed(1)),
      brickCementBags: Math.ceil(isMultiplying ? totalBrickCement * effMultiplier : totalBrickCement),
      brickSandCft: Number((isMultiplying ? totalBrickSand * effMultiplier : totalBrickSand).toFixed(1)),
      plasterCementBags: Math.ceil(isMultiplying ? totalPlasterCement * effMultiplier : totalPlasterCement),
      plasterSandCft: Number((isMultiplying ? totalPlasterSand * effMultiplier : totalPlasterSand).toFixed(1)),
      totalWallsCount: list.reduce((sum, w) => sum + (w.nos || 1), 0) * effMultiplier,
      singleFloorWallsCount: list.reduce((sum, w) => sum + (w.nos || 1), 0),
      // Single floor details
      singleFloorBricks: totalBricks,
      singleFloorCementBags: totalCementBags,
      singleFloorSandCft: totalSandCft,
      brickCost,
      cementCost,
      sandCost,
      singleFloorTotalCost,
      // Storey multiplier details
      multiplier: effMultiplier,
      isMultiplying,
      totalCost: multipliedCost,
      // Multiplied materials for full building
      multipliedBricks: totalBricks * effMultiplier,
      multipliedCementBags: Math.ceil(totalCementBags * effMultiplier),
      multipliedSandCft: Number((totalSandCft * effMultiplier).toFixed(1)),
      // Window & Door Openings with Grill & Aluminium costing
      totalWindowArea: Number((isMultiplying ? totalWindowArea * effMultiplier : totalWindowArea).toFixed(1)),
      totalDoorArea: Number((isMultiplying ? totalDoorArea * effMultiplier : totalDoorArea).toFixed(1)),
      singleFloorWindowArea: Number(totalWindowArea.toFixed(1)),
      singleFloorDoorArea: Number(totalDoorArea.toFixed(1)),
      grillCost: Math.round(Number(isMultiplying ? totalWindowArea * effMultiplier : totalWindowArea) * grillRate),
      aluminiumGlassCost: Math.round(Number(isMultiplying ? totalWindowArea * effMultiplier : totalWindowArea) * aluminiumRate),
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(walls);
  }, [multiplier, isMultiplying, brickRate, cementRate, sandRate, grillRate, aluminiumRate]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentWalls = [...walls];
    if (editingWallIndex !== null && editingWallIndex < currentWalls.length) {
      currentWalls[editingWallIndex] = getCurrentFormWall();
    } else if (currentWalls.length === 0) {
      currentWalls = [getCurrentFormWall()];
    }
    setWalls(currentWalls);
    const boq = calculate(currentWalls);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : editingEstimateId || undefined,
      type: "brick",
      name: estimateName.trim() || "Brickwork & Plaster Estimate",
      totalCost: boq.totalCost,
      summary: boq,
      data: {
        walls: currentWalls,
        rates: { brickRate, cementRate, sandRate, grillRate, aluminiumRate },
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.walls && est.data.walls.length > 0) {
      setWalls(est.data.walls);
      loadWallIntoForm(est.data.walls[0], 0);
    }
    if (est.data?.rates) {
      setBrickRate(est.data.rates.brickRate || 15);
      setCementRate(est.data.rates.cementRate || 550);
      setSandRate(est.data.rates.sandRate || 45);
      if (est.data.rates.grillRate) setGrillRate(est.data.rates.grillRate);
      if (est.data.rates.aluminiumRate) setAluminiumRate(est.data.rates.aluminiumRate);
    }
    if (est.data?.multiplier) {
      setMultiplier(est.data.multiplier);
      setIsMultiplying(Boolean(est.data.isMultiplying));
    }
    calculate(est.data?.walls || walls);
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "brick" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="brick"
        typeLabel="Brickwork"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Brickwork Estimate");
          setWalls([]);
          resetForm();
          setResults(null);
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { walls, multiplier, isMultiplying, rates: { brickRate, cementRate, sandRate, grillRate, aluminiumRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.walls) {
            setWalls(payload.data.walls);
            calculate(payload.data.walls);
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

          {/* Storey Multiplier Bar */}
          <StoreyMultiplierBar
            projectStories={projectStories}
            multiplier={multiplier}
            setMultiplier={setMultiplier}
            isMultiplying={isMultiplying}
            setIsMultiplying={setIsMultiplying}
            itemTypeLabel="Brickwork Walls"
          />

          {/* Editing Banner */}
          {editingWallIndex !== null && editingWallIndex < walls.length && (
            <div className="bg-[#00c2c7]/10 border border-[#00c2c7] text-[#00c2c7] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
              <span>
                Editing: <strong>{walls[editingWallIndex].name}</strong> (Wall {editingWallIndex + 1} of {walls.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs underline hover:text-white cursor-pointer"
              >
                Cancel / Switch to New Wall
              </button>
            </div>
          )}

          {/* Simplified Wall Form: Only Total Wall Length and Height */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <BrickWall className="w-3.5 h-3.5" />
                {editingWallIndex !== null ? "Edit Wall Section" : "Masonry Wall Dimensions"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">Only Total Length & Height</span>
            </div>

            {/* Basic Wall Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="col-span-2 sm:col-span-2">
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Wall Identification (দেয়ালের নাম)
                </label>
                <input
                  type="text"
                  value={wallName}
                  onChange={(e) => setWallName(e.target.value)}
                  placeholder="e.g. 10&quot; Perimeter Wall"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Quantity (সংখ্যা)
                </label>
                <NumericInput
                  value={wallNos}
                  onChange={setWallNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Thickness (পুরুত্ব)
                </label>
                <select
                  value={wallThickness}
                  onChange={(e) => setWallThickness(Number(e.target.value))}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none font-bold text-[#f5a623] cursor-pointer"
                >
                  <option value={10}>10 inch (Main Wall)</option>
                  <option value={5}>5 inch (Partition)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#00c2c7] block mb-1">
                  Total Wall Length (ft)
                </label>
                <NumericInput
                  value={totalLength}
                  onChange={setTotalLength}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#00c2c7]/60 rounded text-xs text-white font-bold outline-none focus:border-[#00c2c7]"
                  placeholder="Total length ft"
                />
                <span className="text-[9px] text-[#8ba3c1] block mt-0.5">মোট দৈর্ঘ্য (ফিট)</span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-[#00c2c7] block mb-1">
                  Wall Height (ft)
                </label>
                <NumericInput
                  value={height}
                  onChange={setHeight}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#00c2c7]/60 rounded text-xs text-white font-bold outline-none focus:border-[#00c2c7]"
                  placeholder="Height ft"
                />
                <span className="text-[9px] text-[#8ba3c1] block mt-0.5">উচ্চতা (ফিট)</span>
              </div>
            </div>

            {/* Live Gross Area & Net Preview Banner */}
            <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8ba3c1]">Gross Wall Area:</span>
                <span className="font-mono font-bold text-white">
                  {formGrossArea.toFixed(1)} sq.ft
                </span>
                <span className="text-[10px] text-[#8ba3c1]">
                  ({totalLength}' × {height}' × {wallNos} nos)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#f5a623]">Deductions:</span>
                <span className="font-mono font-bold text-[#f5a623]">
                  -{formDeductionBreakdown.totalDeduction.toFixed(1)} sq.ft
                </span>
                <span className="text-[11px] text-[#2ecc71] font-bold border-l border-[#2d4a6a] pl-2">
                  Net Masonry: {formDeductionBreakdown.netArea.toFixed(1)} sq.ft
                </span>
              </div>
            </div>

            {/* Window and Door Add System */}
            <div className="border-t border-[#2d4a6a] pt-2.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#f5a623] flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" />
                    Window & Door Add System (জানালা ও দরজা ডিডাকশন)
                  </span>
                  <span className="text-[10px] text-[#8ba3c1] block">
                    Add custom windows, doors, and vents with custom counts and dimensions to deduct from wall area.
                  </span>
                </div>

                {/* Add Opening Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddDoor()}
                    className="h-7 px-2.5 bg-[#2ecc71]/20 hover:bg-[#2ecc71] text-[#2ecc71] hover:text-[#0f1c2e] border border-[#2ecc71]/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <DoorOpen className="w-3 h-3" />
                    + Add Door
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddWindow()}
                    className="h-7 px-2.5 bg-[#00c2c7]/20 hover:bg-[#00c2c7] text-[#00c2c7] hover:text-[#0f1c2e] border border-[#00c2c7]/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <AppWindow className="w-3 h-3" />
                    + Add Window
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="bg-[#101b2b] p-2 rounded-lg border border-[#2d4a6a]/60 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-[#2ecc71] uppercase tracking-wide">
                    Door Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddDoor({ name: "Main Door (3.5'×7')", width: 3.5, height: 7 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#2ecc71]/20 hover:text-[#2ecc71] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Main Door 3.5' × 7'
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDoor({ name: "Room Door (3'×7')", width: 3, height: 7 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#2ecc71]/20 hover:text-[#2ecc71] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Room Door 3' × 7'
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDoor({ name: "Toilet Door (2.5'×7')", width: 2.5, height: 7 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#2ecc71]/20 hover:text-[#2ecc71] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Toilet Door 2.5' × 7'
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#2d4a6a]/40">
                  <span className="text-[10px] font-bold text-[#00c2c7] uppercase tracking-wide">
                    Window Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddWindow({ name: "Master Window (5'×4.5')", width: 5, height: 4.5 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#00c2c7]/20 hover:text-[#00c2c7] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Large Window 5' × 4.5'
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWindow({ name: "Std Window (4'×4')", width: 4, height: 4 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#00c2c7]/20 hover:text-[#00c2c7] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Std Window 4' × 4'
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWindow({ name: "Toilet Vent (2'×2')", width: 2, height: 2 })}
                    className="px-2 py-0.5 bg-[#243b55] hover:bg-[#00c2c7]/20 hover:text-[#00c2c7] text-[#cbd5e1] rounded text-[10px] border border-[#2d4a6a] transition cursor-pointer"
                  >
                    + Toilet Vent 2' × 2'
                  </button>
                </div>
              </div>

              {/* Added Openings List */}
              {openings.length === 0 ? (
                <div className="border border-dashed border-[#2d4a6a] rounded-lg p-3 text-center text-xs text-[#8ba3c1]">
                  No doors or windows added. No deductions will be subtracted from this wall.
                  <div className="mt-1 text-[11px] text-[#00c2c7]">
                    Click "+ Add Door" or "+ Add Window" above to deduct openings.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-[#8ba3c1] px-2 py-1 bg-[#1a2b42] rounded">
                    <div className="col-span-1">Type</div>
                    <div className="col-span-4">Item Name / Tag</div>
                    <div className="col-span-2 text-center">Count (Nos)</div>
                    <div className="col-span-2 text-center">W × H (ft)</div>
                    <div className="col-span-2 text-right">Deduction (sft)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {openings.map((op, opIdx) => {
                    const isDoor = op.type === "door";
                    const area = (op.count || 0) * (op.width || 0) * (op.height || 0);
                    return (
                      <div
                        key={op.id || opIdx}
                        className={`grid grid-cols-12 gap-1 items-center p-1.5 rounded-lg border text-xs transition ${
                          isDoor
                            ? "bg-[#142334] border-[#2ecc71]/30 hover:border-[#2ecc71]/60"
                            : "bg-[#14263a] border-[#00c2c7]/30 hover:border-[#00c2c7]/60"
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div className="col-span-1 flex items-center justify-center">
                          {isDoor ? (
                            <span
                              className="px-1.5 py-0.5 bg-[#2ecc71]/20 text-[#2ecc71] rounded font-bold text-[9px] flex items-center gap-0.5"
                              title="Door"
                            >
                              <DoorOpen className="w-2.5 h-2.5" />
                              D
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 bg-[#00c2c7]/20 text-[#00c2c7] rounded font-bold text-[9px] flex items-center gap-0.5"
                              title="Window"
                            >
                              <AppWindow className="w-2.5 h-2.5" />
                              W
                            </span>
                          )}
                        </div>

                        {/* Name Input */}
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={op.name}
                            onChange={(e) => handleUpdateOpening(op.id, { name: e.target.value })}
                            placeholder={isDoor ? "Door Name" : "Window Name"}
                            className="w-full h-7 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                          />
                        </div>

                        {/* Count */}
                        <div className="col-span-2">
                          <NumericInput
                            value={op.count}
                            onChange={(val) => handleUpdateOpening(op.id, { count: Math.max(0, val) })}
                            className="w-full h-7 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-center text-white outline-none focus:border-[#00c2c7]"
                          />
                        </div>

                        {/* Dimensions: Width and Height */}
                        <div className="col-span-2 flex items-center gap-1">
                          <NumericInput
                            value={op.width}
                            onChange={(val) => handleUpdateOpening(op.id, { width: Math.max(0, val) })}
                            className="w-1/2 h-7 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-center text-white outline-none focus:border-[#00c2c7]"
                            title="Width in feet"
                          />
                          <span className="text-[#8ba3c1] text-[10px]">×</span>
                          <NumericInput
                            value={op.height}
                            onChange={(val) => handleUpdateOpening(op.id, { height: Math.max(0, val) })}
                            className="w-1/2 h-7 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-center text-white outline-none focus:border-[#00c2c7]"
                            title="Height in feet"
                          />
                        </div>

                        {/* Area Subtotal */}
                        <div className="col-span-2 text-right font-mono font-bold text-[#f5a623] text-[11px] pr-1">
                          -{area.toFixed(1)} sft
                        </div>

                        {/* Delete button */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteOpening(op.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[#ff4d6d] hover:bg-[#ff4d6d]/20 transition cursor-pointer"
                            title="Remove opening"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mortar & Plaster Mix Ratio */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2d4a6a]">
              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Brick Mortar Mix (মশলার অনুপাত)
                </label>
                <select
                  value={brickMix}
                  onChange={(e) => setBrickMix(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none cursor-pointer"
                >
                  <option value="1:4">1:4 (Standard 10" Wall)</option>
                  <option value="1:3">1:3 (High Strength)</option>
                  <option value="1:5">1:5 (Light Partition)</option>
                  <option value="1:6">1:6 (Economical)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Plaster Mix (প্লাস্টার অনুপাত 12mm)
                </label>
                <select
                  value={plasterMix}
                  onChange={(e) => setPlasterMix(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none cursor-pointer"
                >
                  <option value="1:4">1:4 (Both Sides Plaster)</option>
                  <option value="1:5">1:5 (Standard Plaster)</option>
                  <option value="1:6">1:6 (Internal Plaster)</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#2d4a6a]">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 h-9 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Form
              </button>
              <button
                type="button"
                onClick={editingWallIndex !== null && editingWallIndex < walls.length ? handleUpdateWall : handleAddNewWall}
                className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {editingWallIndex !== null && editingWallIndex < walls.length ? "Update Wall in List" : "+ Add Wall to List"}
              </button>
            </div>
          </div>

          {/* Walls List Schedule */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Masonry Walls Schedule (দেয়াল শিডিউল)</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {walls.length} section{walls.length !== 1 ? "s" : ""}
              </span>
            </div>

            {walls.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No walls in list yet. Enter total wall length, height and click "+ Add Wall to List".
              </div>
            ) : (
              <div className="space-y-2">
                {walls.map((w, idx) => {
                  const isBeingEdited = editingWallIndex === idx;
                  const wallLen =
                    w.totalLength !== undefined
                      ? w.totalLength
                      : w.lengthSpans
                      ? (w.length || 0) * (w.lengthSpans || 1) + (w.width || 0) * (w.widthSpans || 0)
                      : w.length || 0;
                  const grossArea = wallLen * (w.height || 10) * (w.nos || 1);

                  let totalDed = 0;
                  let dCount = 0;
                  let wCount = 0;
                  if (w.openings && Array.isArray(w.openings) && w.openings.length > 0) {
                    w.openings.forEach((op) => {
                      const a = (op.count || 0) * (op.width || 0) * (op.height || 0);
                      totalDed += a;
                      if (op.type === "door") dCount += op.count || 0;
                      else wCount += op.count || 0;
                    });
                    totalDed = totalDed * (w.nos || 1);
                  } else {
                    const winArea = (w.windowCount || 0) * (w.windowWidth || 0) * (w.windowHeight || 0);
                    const doorArea = (w.doorCount || 0) * (w.doorWidth || 0) * (w.doorHeight || 0);
                    totalDed = (winArea + doorArea) * (w.nos || 1);
                    dCount = (w.doorCount || 0) * (w.nos || 1);
                    wCount = (w.windowCount || 0) * (w.nos || 1);
                  }
                  const netArea = Math.max(0, grossArea - totalDed);

                  return (
                    <div
                      key={w.id || idx}
                      className={`border rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/10 border-[#00c2c7] shadow-sm"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {w.nos} × {w.name}
                          </span>
                          <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] px-1.5 py-0.5 rounded font-bold">
                            {w.wallThickness}" Wall
                          </span>
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-1.5 py-0.5 rounded">
                              Editing
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#cbd5e1] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>
                            Length: <strong>{wallLen} ft</strong> · Height: <strong>{w.height} ft</strong>
                          </span>
                          <span className="text-[#8ba3c1]">· Gross: {grossArea.toFixed(1)} sft</span>
                          <span className="text-[#f5a623]">
                            · Openings: {dCount} Doors, {wCount} Windows (-{totalDed.toFixed(1)} sft)
                          </span>
                          <span className="text-[#2ecc71] font-bold">
                            · Net Area: {netArea.toFixed(1)} sft
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => loadWallIntoForm(w, idx)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit wall in form"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateWall(idx)}
                          className="px-2.5 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a] cursor-pointer"
                          title="Duplicate wall"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWall(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
                          title="Delete wall"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rates Settings */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-[#00c2c7] block">Material & Fitting Rates (দর ও রেট)</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick (প্রতি পিস ৳)</label>
                <NumericInput
                  value={brickRate}
                  onChange={setBrickRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (প্রতি ব্যাগ ৳)</label>
                <NumericInput
                  value={cementRate}
                  onChange={setCementRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (প্রতি cft ৳)</label>
                <NumericInput
                  value={sandRate}
                  onChange={setSandRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#ec4899] font-semibold block mb-1">Square Bar Grill (৳/sft)</label>
                <NumericInput
                  value={grillRate}
                  onChange={setGrillRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#ec4899]/40 rounded text-xs text-white outline-none focus:border-[#ec4899]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#818cf8] font-semibold block mb-1">Alum + Glass (৳/sft)</label>
                <NumericInput
                  value={aluminiumRate}
                  onChange={setAluminiumRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#818cf8]/40 rounded text-xs text-white outline-none focus:border-[#818cf8]"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-3">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary (হিসাবের সারসংক্ষেপ)</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.totalWallsCount} Wall Sections · {results.totalWallArea} sq.ft Net Area
                </span>
              </div>

              {/* Material Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Bricks Total (ইট)</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {(isMultiplying ? results.multipliedBricks : results.totalBricks).toLocaleString("en-IN")} pcs
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalBricks.toLocaleString("en-IN")} pcs / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement (সিমেন্ট)</div>
                  <div className="text-sm font-bold text-[#00c2c7]">
                    {isMultiplying ? results.multipliedCementBags : results.totalCementBags} bags
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalCementBags} bags / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand Total (বালু)</div>
                  <div className="text-sm font-bold text-[#2ecc71]">
                    {isMultiplying ? results.multipliedSandCft : results.totalSandCft} cft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalSandCft} cft / floor)
                    </div>
                  )}
                </div>
              </div>

              {/* Window Fixtures & Fittings Takeoff (Square Bar Grill & Aluminium Frame with Glass) */}
              {results.totalWindowArea > 0 && (
                <div className="bg-[#1a2b42] border border-[#818cf8]/40 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5 text-[#818cf8]">
                      <span>🪟 Window Fixtures Takeoff (জানালা গ্রিল ও গ্লাস)</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#cbd5e1]">
                      Total Window Area: <strong>{results.totalWindowArea} sq.ft</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#121c2d] p-2 rounded-lg border border-[#ec4899]/30">
                      <div className="text-[9px] text-[#ec4899] font-bold">Square Bar Grill (এমএস গ্রিল)</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        ৳ {results.grillCost.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] text-[#8ba3c1]">
                        {results.totalWindowArea} sft @ ৳{grillRate}/sft
                      </div>
                    </div>
                    <div className="bg-[#121c2d] p-2 rounded-lg border border-[#818cf8]/30">
                      <div className="text-[9px] text-[#818cf8] font-bold">Aluminium Frame + Glass (গ্লাস ফ্রেম)</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        ৳ {results.aluminiumGlassCost.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] text-[#8ba3c1]">
                        {results.totalWindowArea} sft @ ৳{aluminiumRate}/sft
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Cost Display with Multiplier Breakdown */}
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
                <div>
                  <div className="text-[10px] text-[#8ba3c1] uppercase font-bold tracking-wider">
                    {isMultiplying
                      ? `Full Building Brickwork Budget (×${multiplier} Storeys)`
                      : "Typical Floor Brickwork Budget"}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#2ecc71]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                </div>

                {isMultiplying && (
                  <div className="text-right sm:border-l sm:border-[#2ecc71]/30 sm:pl-3">
                    <div className="text-[10px] text-[#8ba3c1]">Per Typical Floor</div>
                    <div className="text-sm font-bold text-white">
                      ৳ {Math.round(results.singleFloorTotalCost).toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
