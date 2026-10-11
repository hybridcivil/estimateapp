import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, BrickWallItem } from "../../types";
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
  Building2,
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
      length: 30,
      width: 20,
      lengthSpans: 2,
      widthSpans: 2,
      height: 10,
      wallThickness: 10,
      windowCount: 4,
      windowWidth: 4,
      windowHeight: 4,
      doorCount: 2,
      doorWidth: 3,
      doorHeight: 7,
      brickLengthIn: 9.5,
      brickWidthIn: 4.5,
      brickHeightIn: 2.75,
      brickMix: "1:4",
      plasterMix: "1:4",
      plasterThicknessMm: 12,
    },
  ]);
  const [editingWallIndex, setEditingWallIndex] = useState<number | null>(null);

  // Form Inputs
  const [wallName, setWallName] = useState("Outer Perimeter Wall 10\"");
  const [wallNos, setWallNos] = useState(1);
  const [length, setLength] = useState(30);
  const [width, setWidth] = useState(20);
  const [lengthSpans, setLengthSpans] = useState(2);
  const [widthSpans, setWidthSpans] = useState(2);
  const [height, setHeight] = useState(10);
  const [wallThickness, setWallThickness] = useState(10); // 10" or 5"

  // Openings
  const [windowCount, setWindowCount] = useState(4);
  const [windowWidth, setWindowWidth] = useState(4);
  const [windowHeight, setWindowHeight] = useState(4);

  const [doorCount, setDoorCount] = useState(2);
  const [doorWidth, setDoorWidth] = useState(3);
  const [doorHeight, setDoorHeight] = useState(7);

  // Brick Details
  const [brickLengthIn, setBrickLengthIn] = useState(9.5);
  const [brickWidthIn, setBrickWidthIn] = useState(4.5);
  const [brickHeightIn, setBrickHeightIn] = useState(2.75);

  // Mortar & Plaster
  const [brickMix, setBrickMix] = useState("1:4");
  const [plasterMix, setPlasterMix] = useState("1:4");
  const [plasterThicknessMm, setPlasterThicknessMm] = useState(12);

  // Rates
  const [brickRate, setBrickRate] = useState(15);
  const [cementRate, setCementRate] = useState(550);
  const [sandRate, setSandRate] = useState(45);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  const getCurrentFormWall = (): BrickWallItem => ({
    id: editingWallIndex !== null ? walls[editingWallIndex]?.id : "wall_" + Date.now(),
    nos: wallNos > 0 ? wallNos : 1,
    name: wallName.trim() || `Wall ${walls.length + 1}`,
    length: length > 0 ? length : 1,
    width: width >= 0 ? width : 0,
    lengthSpans: lengthSpans > 0 ? lengthSpans : 1,
    widthSpans: widthSpans >= 0 ? widthSpans : 0,
    height: height > 0 ? height : 10,
    wallThickness: wallThickness > 0 ? wallThickness : 10,
    windowCount: windowCount >= 0 ? windowCount : 0,
    windowWidth: windowWidth >= 0 ? windowWidth : 0,
    windowHeight: windowHeight >= 0 ? windowHeight : 0,
    doorCount: doorCount >= 0 ? doorCount : 0,
    doorWidth: doorWidth >= 0 ? doorWidth : 0,
    doorHeight: doorHeight >= 0 ? doorHeight : 0,
    brickLengthIn,
    brickWidthIn,
    brickHeightIn,
    brickMix,
    plasterMix,
    plasterThicknessMm,
  });

  const loadWallIntoForm = (w: BrickWallItem, idx: number) => {
    setEditingWallIndex(idx);
    setWallName(w.name);
    setWallNos(w.nos);
    setLength(w.length);
    setWidth(w.width);
    setLengthSpans(w.lengthSpans);
    setWidthSpans(w.widthSpans);
    setHeight(w.height);
    setWallThickness(w.wallThickness);
    setWindowCount(w.windowCount);
    setWindowWidth(w.windowWidth);
    setWindowHeight(w.windowHeight);
    setDoorCount(w.doorCount);
    setDoorWidth(w.doorWidth);
    setDoorHeight(w.doorHeight);
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
    if (length <= 0 || height <= 0) {
      setErrorMsg("Please enter valid wall length and height.");
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
    setWallName("Wall 1");
    setWallNos(1);
    setLength(30);
    setWidth(20);
    setLengthSpans(2);
    setWidthSpans(2);
    setHeight(10);
    setWallThickness(10);
    setWindowCount(4);
    setWindowWidth(4);
    setWindowHeight(4);
    setDoorCount(2);
    setDoorWidth(3);
    setDoorHeight(7);
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

    list.forEach((w) => {
      const nos = w.nos > 0 ? w.nos : 1;
      const totalWallLength = (w.length * (w.lengthSpans || 1) + (w.width || 0) * (w.widthSpans || 0)) * nos;
      const grossArea = totalWallLength * w.height;
      const windowArea = (w.windowCount || 0) * (w.windowWidth || 0) * (w.windowHeight || 0) * nos;
      const doorArea = (w.doorCount || 0) * (w.doorWidth || 0) * (w.doorHeight || 0) * nos;
      const deduction = windowArea + doorArea;
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
      totalWallArea: Number(((isMultiplying ? totalNetArea * effMultiplier : totalNetArea)).toFixed(1)),
      grossArea: Number(((isMultiplying ? totalGrossArea * effMultiplier : totalGrossArea)).toFixed(1)),
      deductions: Number(((isMultiplying ? totalDeductions * effMultiplier : totalDeductions)).toFixed(1)),
      totalNetVol: Number(((isMultiplying ? totalNetVol * effMultiplier : totalNetVol)).toFixed(2)),
      totalBricks: isMultiplying ? totalBricks * effMultiplier : totalBricks,
      brickQty: isMultiplying ? totalBricks * effMultiplier : totalBricks,
      totalCementBags: isMultiplying ? Math.ceil(totalCementBags * effMultiplier) : totalCementBags,
      cementBags: isMultiplying ? Math.ceil(totalCementBags * effMultiplier) : totalCementBags,
      totalSandCft: Number(((isMultiplying ? totalSandCft * effMultiplier : totalSandCft)).toFixed(1)),
      sandCft: Number(((isMultiplying ? totalSandCft * effMultiplier : totalSandCft)).toFixed(1)),
      brickCementBags: Math.ceil((isMultiplying ? totalBrickCement * effMultiplier : totalBrickCement)),
      brickSandCft: Number(((isMultiplying ? totalBrickSand * effMultiplier : totalBrickSand)).toFixed(1)),
      plasterCementBags: Math.ceil((isMultiplying ? totalPlasterCement * effMultiplier : totalPlasterCement)),
      plasterSandCft: Number(((isMultiplying ? totalPlasterSand * effMultiplier : totalPlasterSand)).toFixed(1)),
      totalWallsCount: (list.reduce((sum, w) => sum + w.nos, 0)) * effMultiplier,
      singleFloorWallsCount: list.reduce((sum, w) => sum + w.nos, 0),
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
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(walls);
  }, [multiplier, isMultiplying, brickRate, cementRate, sandRate]);

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
        rates: { brickRate, cementRate, sandRate },
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
          data: { walls, multiplier, isMultiplying, rates: { brickRate, cementRate, sandRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.walls) {
            setWalls(payload.data.walls);
            calculate(payload.data.walls);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
        <div className="max-w-2xl mx-auto space-y-3">
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
                className="text-xs underline hover:text-white"
              >
                Cancel / Switch to New
              </button>
            </div>
          )}

          {/* Wall Form Inputs */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <BrickWall className="w-3.5 h-3.5" />
                {editingWallIndex !== null ? "Edit Wall Section" : "Masonry Wall Dimensions & Openings"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">Brick & Plaster Quantities</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Wall Identification</label>
                <input
                  type="text"
                  value={wallName}
                  onChange={(e) => setWallName(e.target.value)}
                  placeholder="e.g. 10&quot; Exterior Wall"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Quantity (Nos)</label>
                <NumericInput
                  value={wallNos}
                  onChange={setWallNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Thickness</label>
                <select
                  value={wallThickness}
                  onChange={(e) => setWallThickness(Number(e.target.value))}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none font-bold text-[#f5a623]"
                >
                  <option value={10}>10 inch (Main Wall)</option>
                  <option value={5}>5 inch (Partition)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
                <NumericInput
                  value={length}
                  onChange={setLength}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Height (ft)</label>
                <NumericInput
                  value={height}
                  onChange={setHeight}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Length Spans</label>
                <NumericInput
                  value={lengthSpans}
                  onChange={setLengthSpans}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Cross Spans (Width)</label>
                <NumericInput
                  value={widthSpans}
                  onChange={setWidthSpans}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Openings Deductions */}
            <div className="border-t border-[#2d4a6a] pt-2 space-y-2">
              <span className="text-[11px] font-bold text-[#f5a623] block">
                Openings Deduction (Doors & Windows)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Windows</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Count</label>
                      <NumericInput
                        value={windowCount}
                        onChange={setWindowCount}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">W (ft)</label>
                      <NumericInput
                        value={windowWidth}
                        onChange={setWindowWidth}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">H (ft)</label>
                      <NumericInput
                        value={windowHeight}
                        onChange={setWindowHeight}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Doors</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Count</label>
                      <NumericInput
                        value={doorCount}
                        onChange={setDoorCount}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">W (ft)</label>
                      <NumericInput
                        value={doorWidth}
                        onChange={setDoorWidth}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">H (ft)</label>
                      <NumericInput
                        value={doorHeight}
                        onChange={setDoorHeight}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mortar & Plaster Mix Ratio */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2d4a6a]">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick Mortar Mix</label>
                <select
                  value={brickMix}
                  onChange={(e) => setBrickMix(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                >
                  <option value="1:4">1:4 (Standard 10" Wall)</option>
                  <option value="1:3">1:3 (High Strength)</option>
                  <option value="1:5">1:5 (Light Partition)</option>
                  <option value="1:6">1:6 (Economical)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Plaster Mix (12mm)</label>
                <select
                  value={plasterMix}
                  onChange={(e) => setPlasterMix(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
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
                className="flex-1 h-9 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
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
              <span>Added Masonry Walls Schedule</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {walls.length} section{walls.length !== 1 ? "s" : ""}
              </span>
            </div>

            {walls.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No walls in list yet. Enter dimensions and click "+ Add Wall to List".
              </div>
            ) : (
              <div className="space-y-1.5">
                {walls.map((w, idx) => {
                  const isBeingEdited = editingWallIndex === idx;
                  return (
                    <div
                      key={w.id || idx}
                      className={`border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/10 border-[#00c2c7] shadow-sm"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {w.nos} × {w.name}
                          </span>
                          <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] px-1.5 py-0.2 rounded font-bold">
                            {w.wallThickness}" Thk
                          </span>
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-1.5 py-0.2 rounded">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8ba3c1] truncate mt-0.5">
                          {w.length}'×{w.height}' · {w.windowCount || 0} Windows, {w.doorCount || 0} Doors · Mortar {w.brickMix} · Plaster {w.plasterMix}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadWallIntoForm(w, idx)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
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
                          className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a]"
                          title="Duplicate wall"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWall(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition"
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
            <span className="text-xs font-semibold text-[#00c2c7] block">Material Rates</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick (per piece)</label>
                <NumericInput
                  value={brickRate}
                  onChange={setBrickRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (per bag)</label>
                <NumericInput
                  value={cementRate}
                  onChange={setCementRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (per cft)</label>
                <NumericInput
                  value={sandRate}
                  onChange={setSandRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-3">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.totalWallsCount} Wall Sections · {results.totalWallArea} sq.ft Net Area
                </span>
              </div>

              {/* Material Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Bricks Total</div>
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
                  <div className="text-[9px] text-[#8ba3c1]">Cement (Mortar+Plaster)</div>
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
                  <div className="text-[9px] text-[#8ba3c1]">Sand Total</div>
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
