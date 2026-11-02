import React, { useState, useEffect, useMemo } from "react";
import { Project, ProjectEstimateItem, PaintAreaItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import {
  RotateCcw,
  Paintbrush,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Building2,
  Sparkles,
  Layers,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface PaintCalculatorProps {
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

export const PaintCalculator: React.FC<PaintCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Painting & Finishing Estimate");
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

  // Initial paint surface items
  const [items, setItems] = useState<PaintAreaItem[]>([
    {
      id: "paint_1",
      name: "Living & Dining Room (Internal)",
      nos: 1,
      category: "interior",
      paintType: "plastic_emulsion",
      calcMode: "room",
      length: 22,
      width: 16,
      height: 10,
      includeCeiling: true,
      deductionArea: 85, // 2 doors, 3 windows
      paintCoats: 2,
      applyPrimer: true,
      applyPutty: true,
    },
    {
      id: "paint_2",
      name: "Bedrooms (Master & Guest Bed)",
      nos: 2,
      category: "interior",
      paintType: "plastic_emulsion",
      calcMode: "room",
      length: 14,
      width: 13,
      height: 10,
      includeCeiling: true,
      deductionArea: 65,
      paintCoats: 2,
      applyPrimer: true,
      applyPutty: true,
    },
    {
      id: "paint_3",
      name: "Exterior Front & Side Facade",
      nos: 1,
      category: "exterior",
      paintType: "weather_coat",
      calcMode: "direct",
      length: 0,
      width: 0,
      height: 0,
      directArea: 1850,
      includeCeiling: false,
      deductionArea: 120,
      paintCoats: 2,
      applyPrimer: true,
      applyPutty: false,
    },
  ]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form States
  const [itemName, setItemName] = useState("New Wall Paint Area");
  const [nos, setNos] = useState(1);
  const [category, setCategory] = useState<"interior" | "exterior" | "ceiling" | "general">("interior");
  const [paintType, setPaintType] = useState<"plastic_emulsion" | "weather_coat" | "distemper" | "enamel" | "luxury_silk">("plastic_emulsion");
  const [calcMode, setCalcMode] = useState<"room" | "direct">("room");
  const [length, setLength] = useState(14);
  const [width, setWidth] = useState(12);
  const [height, setHeight] = useState(10);
  const [directArea, setDirectArea] = useState(500);
  const [includeCeiling, setIncludeCeiling] = useState(true);
  const [deductionArea, setDeductionArea] = useState(50);
  const [paintCoats, setPaintCoats] = useState(2);
  const [applyPrimer, setApplyPrimer] = useState(true);
  const [applyPutty, setApplyPutty] = useState(true);

  // Material Unit Rates
  const [paintRate, setPaintRate] = useState(480); // ৳ per liter
  const [primerRate, setPrimerRate] = useState(220); // ৳ per liter
  const [puttyRate, setPuttyRate] = useState(45); // ৳ per kg

  // Coverage specifications (sq.ft covered per unit)
  // Plastic Emulsion: ~130 sqft/L for 2 coats
  // Weathercoat: ~100 sqft/L for 2 coats
  // Distemper: ~65 sqft/L for 2 coats
  // Luxury Silk: ~120 sqft/L for 2 coats
  // Enamel: ~110 sqft/L for 2 coats
  // Primer: ~150 sqft/L for 1 coat
  // Wall Putty: ~18 sqft/kg for 2 coats
  const [coveragePaint, setCoveragePaint] = useState(130);
  const [coveragePrimer, setCoveragePrimer] = useState(150);
  const [coveragePutty, setCoveragePutty] = useState(18);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  // Update default paint rate and coverage when paint type changes
  const handlePaintTypeChange = (newType: any) => {
    setPaintType(newType);
    if (newType === "weather_coat") {
      setCoveragePaint(100);
      setPaintRate(550);
      setCategory("exterior");
      setApplyPutty(false); // Exterior usually doesn't need internal wall putty
    } else if (newType === "distemper") {
      setCoveragePaint(65);
      setPaintRate(250);
      setCategory("interior");
    } else if (newType === "luxury_silk") {
      setCoveragePaint(120);
      setPaintRate(680);
      setCategory("interior");
      setApplyPutty(true);
    } else if (newType === "enamel") {
      setCoveragePaint(110);
      setPaintRate(520);
      setCategory("general");
      setApplyPutty(false);
    } else {
      // plastic_emulsion
      setCoveragePaint(130);
      setPaintRate(480);
      setCategory("interior");
      setApplyPutty(true);
    }
  };

  // Live active form area calculation
  const formPreviewArea = useMemo(() => {
    const q = nos > 0 ? nos : 1;
    if (calcMode === "direct") {
      const net = Math.max(0, (directArea || 0) - (deductionArea || 0)) * q;
      return {
        wallArea: directArea * q,
        ceilingArea: 0,
        deduction: (deductionArea || 0) * q,
        netArea: net,
      };
    } else {
      const l = length > 0 ? length : 0;
      const w = width > 0 ? width : 0;
      const h = height > 0 ? height : 0;
      const wallA = 2 * (l + w) * h * q;
      const ceilA = includeCeiling ? l * w * q : 0;
      const ded = (deductionArea || 0) * q;
      const net = Math.max(0, wallA + ceilA - ded);
      return {
        wallArea: wallA,
        ceilingArea: ceilA,
        deduction: ded,
        netArea: net,
      };
    }
  }, [calcMode, directArea, deductionArea, nos, length, width, height, includeCeiling]);

  // Check if active project has brickwork or floor area to sync
  const brickPlasterArea = useMemo(() => {
    if (!activeProject || !Array.isArray(activeProject.estimates)) return null;
    const brickEst = activeProject.estimates.find((e) => e.type === "brick");
    if (!brickEst) return null;
    const s = brickEst.summary || {};
    const d = brickEst.data || {};
    // Total net wall area or plaster area (both sides = 2x wall net area)
    const wallArea = s.totalWallArea || s.singleFloorNetArea || 0;
    return wallArea > 0 ? Math.round(wallArea * 2) : null;
  }, [activeProject]);

  const getCurrentFormItem = (): PaintAreaItem => ({
    id: editingIndex !== null ? items[editingIndex]?.id : "paint_" + Date.now(),
    name: itemName.trim() || `Paint Area ${items.length + 1}`,
    nos: nos > 0 ? nos : 1,
    category,
    paintType,
    calcMode,
    length: length > 0 ? length : 1,
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 10,
    directArea: directArea > 0 ? directArea : 0,
    includeCeiling,
    deductionArea: deductionArea >= 0 ? deductionArea : 0,
    paintCoats: paintCoats > 0 ? paintCoats : 2,
    applyPrimer,
    applyPutty,
    paintRate,
    primerRate,
    puttyRate,
  });

  const loadItemIntoForm = (it: PaintAreaItem, idx: number) => {
    setEditingIndex(idx);
    setItemName(it.name);
    setNos(it.nos || 1);
    setCategory(it.category || "interior");
    setPaintType(it.paintType || "plastic_emulsion");
    setCalcMode(it.calcMode || "room");
    setLength(it.length || 14);
    setWidth(it.width || 12);
    setHeight(it.height || 10);
    setDirectArea(it.directArea || 500);
    setIncludeCeiling(it.includeCeiling !== undefined ? it.includeCeiling : true);
    setDeductionArea(it.deductionArea || 0);
    setPaintCoats(it.paintCoats || 2);
    setApplyPrimer(it.applyPrimer !== undefined ? it.applyPrimer : true);
    setApplyPutty(it.applyPutty !== undefined ? it.applyPutty : true);
    if (it.paintRate) setPaintRate(it.paintRate);
    if (it.primerRate) setPrimerRate(it.primerRate);
    if (it.puttyRate) setPuttyRate(it.puttyRate);
    setErrorMsg("");
  };

  const handleAddNewItem = () => {
    setErrorMsg("");
    if (calcMode === "room" && (length <= 0 || width <= 0 || height <= 0)) {
      setErrorMsg("Please enter valid room length, width, and height.");
      return;
    }
    if (calcMode === "direct" && directArea <= 0) {
      setErrorMsg("Please enter a valid surface area.");
      return;
    }

    const current = getCurrentFormItem();
    const nextList = [...items, current];
    setItems(nextList);
    calculate(nextList);

    setEditingIndex(null);
    setItemName(`Paint Area ${nextList.length + 1}`);
    setNos(1);
    setSuccessMsg(`✓ Added ${current.name} to paint schedule!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateItem = () => {
    setErrorMsg("");
    if (editingIndex === null || editingIndex < 0 || editingIndex >= items.length) {
      handleAddNewItem();
      return;
    }
    const current = getCurrentFormItem();
    const nextList = [...items];
    nextList[editingIndex] = current;
    setItems(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in schedule!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDuplicateItem = (idx: number) => {
    const orig = items[idx];
    if (!orig) return;
    const duplicated: PaintAreaItem = {
      ...orig,
      id: "paint_" + Date.now(),
      name: `${orig.name} (Copy)`,
    };
    const nextList = [...items, duplicated];
    setItems(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${orig.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteItem = (idx: number) => {
    const nextList = items.filter((_, i) => i !== idx);
    setItems(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingIndex === idx) {
        resetForm();
      } else if (editingIndex !== null && editingIndex > idx) {
        setEditingIndex(editingIndex - 1);
      }
    } else {
      resetForm();
      setResults(null);
    }
  };

  const resetForm = () => {
    setItemName(`Paint Area ${items.length + 1}`);
    setNos(1);
    setCategory("interior");
    setPaintType("plastic_emulsion");
    setCalcMode("room");
    setLength(14);
    setWidth(12);
    setHeight(10);
    setDirectArea(500);
    setIncludeCeiling(true);
    setDeductionArea(50);
    setPaintCoats(2);
    setApplyPrimer(true);
    setApplyPutty(true);
    setEditingIndex(null);
    setErrorMsg("");
  };

  // 1-Click Sync from Brickwork Plaster Area
  const handleSyncFromBrickwork = () => {
    if (!brickPlasterArea) return;
    const newItem: PaintAreaItem = {
      id: "paint_sync_" + Date.now(),
      name: "All Plastered Wall Surfaces (Synced from Brickwork)",
      nos: 1,
      category: "interior",
      paintType: "plastic_emulsion",
      calcMode: "direct",
      length: 0,
      width: 0,
      height: 0,
      directArea: brickPlasterArea,
      includeCeiling: false,
      deductionArea: 0,
      paintCoats: 2,
      applyPrimer: true,
      applyPutty: true,
      paintRate,
      primerRate,
      puttyRate,
    };
    const nextList = [...items, newItem];
    setItems(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Synced ${brickPlasterArea.toLocaleString()} sq.ft plaster surface from Brickwork!`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Calculate Materials and Cost
  const calculate = (list = items) => {
    setErrorMsg("");
    if (!list || list.length === 0) {
      setResults(null);
      return null;
    }

    let totalSurfaceArea = 0;
    let totalGrossArea = 0;
    let totalDeductions = 0;
    let totalPaintLiters = 0;
    let totalPrimerLiters = 0;
    let totalPuttyKg = 0;

    let totalPaintCost = 0;
    let totalPrimerCost = 0;
    let totalPuttyCost = 0;

    list.forEach((it) => {
      const q = it.nos > 0 ? it.nos : 1;
      let netArea = 0;
      let gross = 0;
      const ded = (it.deductionArea || 0) * q;

      if (it.calcMode === "direct") {
        gross = (it.directArea || 0) * q;
        netArea = Math.max(0, gross - ded);
      } else {
        const l = it.length || 0;
        const w = it.width || 0;
        const h = it.height || 0;
        const wallA = 2 * (l + w) * h * q;
        const ceilA = it.includeCeiling ? l * w * q : 0;
        gross = wallA + ceilA;
        netArea = Math.max(0, gross - ded);
      }

      totalGrossArea += gross;
      totalDeductions += ded;
      totalSurfaceArea += netArea;

      // Paint consumption:
      // coveragePaint covers for 2 coats. If 3 coats: multiply consumption by 1.45
      const coatsFactor = (it.paintCoats || 2) / 2;
      const cov = coveragePaint > 0 ? coveragePaint : 130;
      const pLiters = (netArea / cov) * coatsFactor;
      totalPaintLiters += pLiters;

      // Primer consumption (1 coat)
      let primLiters = 0;
      if (it.applyPrimer) {
        const pCov = coveragePrimer > 0 ? coveragePrimer : 150;
        primLiters = netArea / pCov;
        totalPrimerLiters += primLiters;
      }

      // Putty consumption (2 coats)
      let putKg = 0;
      if (it.applyPutty) {
        const putCov = coveragePutty > 0 ? coveragePutty : 18;
        putKg = netArea / putCov;
        totalPuttyKg += putKg;
      }

      // Costs for this item
      const itemPaintRate = it.paintRate || paintRate;
      const itemPrimerRate = it.primerRate || primerRate;
      const itemPuttyRate = it.puttyRate || puttyRate;

      totalPaintCost += pLiters * itemPaintRate;
      totalPrimerCost += primLiters * itemPrimerRate;
      totalPuttyCost += putKg * itemPuttyRate;
    });

    const singleFloorPaintCost = Math.round(totalPaintCost);
    const singleFloorPrimerCost = Math.round(totalPrimerCost);
    const singleFloorPuttyCost = Math.round(totalPuttyCost);
    const singleFloorTotalCost = singleFloorPaintCost + singleFloorPrimerCost + singleFloorPuttyCost;

    // Apply Storey Multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    // Packaging conversions
    const roundedPaintLiters = Math.ceil(totalPaintLiters);
    const paintDrums = Math.ceil(roundedPaintLiters / 18.2); // standard 18.2L bucket
    const paintGallons = (roundedPaintLiters / 3.785).toFixed(1);

    const roundedPrimerLiters = Math.ceil(totalPrimerLiters);
    const primerDrums = Math.ceil(roundedPrimerLiters / 18.2);

    const roundedPuttyKg = Math.ceil(totalPuttyKg);
    const puttyBags = Math.ceil(roundedPuttyKg / 20); // standard 20kg bag

    const calcResult = {
      totalSurfaceArea: Number((isMultiplying ? totalSurfaceArea * effMultiplier : totalSurfaceArea).toFixed(1)),
      grossArea: Number((isMultiplying ? totalGrossArea * effMultiplier : totalGrossArea).toFixed(1)),
      deductions: Number((isMultiplying ? totalDeductions * effMultiplier : totalDeductions).toFixed(1)),
      paintLiters: isMultiplying ? Math.ceil(totalPaintLiters * effMultiplier) : roundedPaintLiters,
      paintDrums: isMultiplying ? Math.ceil(paintDrums * effMultiplier) : paintDrums,
      primerLiters: isMultiplying ? Math.ceil(totalPrimerLiters * effMultiplier) : roundedPrimerLiters,
      primerDrums: isMultiplying ? Math.ceil(primerDrums * effMultiplier) : primerDrums,
      puttyKg: isMultiplying ? Math.ceil(totalPuttyKg * effMultiplier) : roundedPuttyKg,
      puttyBags: isMultiplying ? Math.ceil(puttyBags * effMultiplier) : puttyBags,
      // Single floor values
      singleFloorArea: Math.round(totalSurfaceArea),
      singleFloorPaintLiters: roundedPaintLiters,
      singleFloorPrimerLiters: roundedPrimerLiters,
      singleFloorPuttyKg: roundedPuttyKg,
      singleFloorPaintCost,
      singleFloorPrimerCost,
      singleFloorPuttyCost,
      singleFloorTotalCost,
      // Total cost
      paintCost: isMultiplying ? Math.round(singleFloorPaintCost * effMultiplier) : singleFloorPaintCost,
      primerCost: isMultiplying ? Math.round(singleFloorPrimerCost * effMultiplier) : singleFloorPrimerCost,
      puttyCost: isMultiplying ? Math.round(singleFloorPuttyCost * effMultiplier) : singleFloorPuttyCost,
      totalCost: multipliedCost,
      multiplier: effMultiplier,
      isMultiplying,
      itemsCount: list.length,
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(items);
  }, [multiplier, isMultiplying, paintRate, primerRate, puttyRate, coveragePaint, coveragePrimer, coveragePutty]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentItems = [...items];
    if (editingIndex !== null && editingIndex < currentItems.length) {
      currentItems[editingIndex] = getCurrentFormItem();
    } else if (currentItems.length === 0) {
      currentItems = [getCurrentFormItem()];
    }
    setItems(currentItems);
    const boq = calculate(currentItems);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : editingEstimateId || undefined,
      type: "paint",
      name: estimateName.trim() || "Painting & Finishing Estimate",
      totalCost: boq.totalCost,
      summary: boq,
      data: {
        items: currentItems,
        rates: { paintRate, primerRate, puttyRate },
        coverage: { coveragePaint, coveragePrimer, coveragePutty },
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.items && est.data.items.length > 0) {
      setItems(est.data.items);
      loadItemIntoForm(est.data.items[0], 0);
    }
    if (est.data?.rates) {
      if (est.data.rates.paintRate) setPaintRate(est.data.rates.paintRate);
      if (est.data.rates.primerRate) setPrimerRate(est.data.rates.primerRate);
      if (est.data.rates.puttyRate) setPuttyRate(est.data.rates.puttyRate);
    }
    if (est.data?.coverage) {
      if (est.data.coverage.coveragePaint) setCoveragePaint(est.data.coverage.coveragePaint);
      if (est.data.coverage.coveragePrimer) setCoveragePrimer(est.data.coverage.coveragePrimer);
      if (est.data.coverage.coveragePutty) setCoveragePutty(est.data.coverage.coveragePutty);
    }
    if (est.data?.multiplier) {
      setMultiplier(est.data.multiplier);
      setIsMultiplying(Boolean(est.data.isMultiplying));
    }
    calculate(est.data?.items || items);
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "paint" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="paint"
        typeLabel="Paintwork"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Paintwork Estimate");
          setItems([]);
          resetForm();
          setResults(null);
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: {
            items,
            multiplier,
            isMultiplying,
            rates: { paintRate, primerRate, puttyRate },
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.items) {
            setItems(payload.data.items);
            calculate(payload.data.items);
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
            itemTypeLabel="Paint Surfaces"
          />

          {/* Quick Area Auto-Fill Toolbar */}
          {brickPlasterArea && (
            <div className="bg-gradient-to-r from-[#142334] to-[#152033] border border-[#00c2c7]/40 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00c2c7] shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-white">Project Takeoff Available: </span>
                  <span className="text-[#cbd5e1]">
                    Brickwork Plaster Area = <strong>{brickPlasterArea.toLocaleString()} sq.ft</strong> (both sides)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncFromBrickwork}
                className="h-7 px-3 bg-[#00c2c7]/20 hover:bg-[#00c2c7] text-[#00c2c7] hover:text-[#0f1c2e] border border-[#00c2c7]/50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                1-Click Add Plaster Surface
              </button>
            </div>
          )}

          {/* Editing Banner */}
          {editingIndex !== null && editingIndex < items.length && (
            <div className="bg-[#00c2c7]/10 border border-[#00c2c7] text-[#00c2c7] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
              <span>
                Editing: <strong>{items[editingIndex].name}</strong> (Surface {editingIndex + 1} of {items.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs underline hover:text-white cursor-pointer"
              >
                Cancel / Switch to New Surface
              </button>
            </div>
          )}

          {/* Paint Surface Form */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <Paintbrush className="w-3.5 h-3.5" />
                {editingIndex !== null ? "Edit Paint Surface" : "Add Paint Surface (রং করার পরিমাপ)"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">Putty, Primer & Emulsion Takeoff</span>
            </div>

            {/* Basic Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Surface / Room Name (জায়গার নাম)
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Master Bed & Living Room"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Quantity (সংখ্যা)
                </label>
                <NumericInput
                  value={nos}
                  onChange={setNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#8ba3c1] block mb-1">
                  Paint Type (রঙের ধরন)
                </label>
                <select
                  value={paintType}
                  onChange={(e) => handlePaintTypeChange(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-bold text-[#f5a623] cursor-pointer"
                >
                  <option value="plastic_emulsion">Plastic Emulsion (ইমালশন)</option>
                  <option value="weather_coat">Weathercoat (বহিঃস্থ ওয়েদারকোট)</option>
                  <option value="distemper">Distemper (ডিসটেম্পার)</option>
                  <option value="luxury_silk">Luxury Silk (লাক্সারি সিল্ক)</option>
                  <option value="enamel">Synthetic Enamel (এনামেল পেইন্ট)</option>
                </select>
              </div>
            </div>

            {/* Calculation Mode Toggle: Room Mode vs Direct Area Mode */}
            <div className="bg-[#101b2b] p-2 rounded-lg border border-[#2d4a6a] flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#cbd5e1]">Dimension Input Mode:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCalcMode("room")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    calcMode === "room"
                      ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                      : "bg-[#243b55] text-[#8ba3c1] hover:text-white"
                  }`}
                >
                  Room Dimensions (L × W × H)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode("direct")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    calcMode === "direct"
                      ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                      : "bg-[#243b55] text-[#8ba3c1] hover:text-white"
                  }`}
                >
                  Direct Surface Area (sq.ft)
                </button>
              </div>
            </div>

            {/* Room Mode Inputs */}
            {calcMode === "room" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Room Length (ft)</label>
                  <NumericInput
                    value={length}
                    onChange={setLength}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Room Width (ft)</label>
                  <NumericInput
                    value={width}
                    onChange={setWidth}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Wall Height (ft)</label>
                  <NumericInput
                    value={height}
                    onChange={setHeight}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#f5a623] font-semibold block mb-1">
                    Openings Ded. (sq.ft)
                  </label>
                  <NumericInput
                    value={deductionArea}
                    onChange={setDeductionArea}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                    title="Deduct doors and windows area"
                  />
                  <span className="text-[9px] text-[#8ba3c1] block mt-0.5">দরজা-জানালা বাদ</span>
                </div>

                <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCeiling}
                      onChange={(e) => setIncludeCeiling(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2c7] bg-[#243b55] border-[#2d4a6a] cursor-pointer"
                    />
                    <span>
                      Include Ceiling Area in Paintwork (+{length} × {width} = <strong>{(length * width).toFixed(0)} sq.ft</strong> per room)
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              /* Direct Area Mode Inputs */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="text-[10px] text-[#00c2c7] font-bold block mb-1">
                    Gross Surface Area (sq.ft)
                  </label>
                  <NumericInput
                    value={directArea}
                    onChange={setDirectArea}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#00c2c7]/60 rounded text-xs text-white font-bold outline-none focus:border-[#00c2c7]"
                    placeholder="Enter total paintable area"
                  />
                  <span className="text-[9px] text-[#8ba3c1] block mt-0.5">মোট দেয়াল বা সিলিং এরিয়া</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#f5a623] font-semibold block mb-1">
                    Openings Ded. (sq.ft)
                  </label>
                  <NumericInput
                    value={deductionArea}
                    onChange={setDeductionArea}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                  />
                  <span className="text-[9px] text-[#8ba3c1] block mt-0.5">দরজা-জানালা বাদ</span>
                </div>
              </div>
            )}

            {/* Preparation & Coats Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#2d4a6a]">
              <div className="flex items-center gap-2 bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                <label className="text-xs text-white flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyPutty}
                    onChange={(e) => setApplyPutty(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00c2c7] bg-[#243b55] border-[#2d4a6a] cursor-pointer"
                  />
                  <span>Wall Putty (২ কোট পুটি)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                <label className="text-xs text-white flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyPrimer}
                    onChange={(e) => setApplyPrimer(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00c2c7] bg-[#243b55] border-[#2d4a6a] cursor-pointer"
                  />
                  <span>Wall Primer (১ কোট প্রাইমার)</span>
                </label>
              </div>

              <div className="flex items-center justify-between bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                <span className="text-xs text-white">Paint Coats:</span>
                <select
                  value={paintCoats}
                  onChange={(e) => setPaintCoats(Number(e.target.value))}
                  className="h-6 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white font-bold cursor-pointer"
                >
                  <option value={2}>2 Coats (Standard)</option>
                  <option value={3}>3 Coats (Premium)</option>
                </select>
              </div>
            </div>

            {/* Live Area Preview Banner */}
            <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8ba3c1]">Gross Area:</span>
                <span className="font-mono font-bold text-white">
                  {(formPreviewArea.wallArea + formPreviewArea.ceilingArea).toFixed(1)} sq.ft
                </span>
                {formPreviewArea.ceilingArea > 0 && (
                  <span className="text-[10px] text-[#8ba3c1]">
                    (Wall {formPreviewArea.wallArea.toFixed(0)} + Ceil {formPreviewArea.ceilingArea.toFixed(0)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#f5a623]">Deduction:</span>
                <span className="font-mono font-bold text-[#f5a623]">
                  -{formPreviewArea.deduction.toFixed(1)} sq.ft
                </span>
                <span className="text-[11px] text-[#2ecc71] font-bold border-l border-[#2d4a6a] pl-2">
                  Net Paint Surface: {formPreviewArea.netArea.toFixed(1)} sq.ft
                </span>
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
                onClick={editingIndex !== null && editingIndex < items.length ? handleUpdateItem : handleAddNewItem}
                className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {editingIndex !== null && editingIndex < items.length ? "Update Surface in Schedule" : "+ Add Surface to Schedule"}
              </button>
            </div>
          </div>

          {/* Schedule of Added Surfaces */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Paint Surfaces Schedule (রং এর তালিকা)</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {items.length} surface{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No surfaces added yet. Enter dimensions and click "+ Add Surface to Schedule".
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => {
                  const isBeingEdited = editingIndex === idx;
                  const q = it.nos || 1;
                  let netA = 0;
                  if (it.calcMode === "direct") {
                    netA = Math.max(0, (it.directArea || 0) * q - (it.deductionArea || 0) * q);
                  } else {
                    const wallA = 2 * (it.length + it.width) * it.height * q;
                    const ceilA = it.includeCeiling ? it.length * it.width * q : 0;
                    netA = Math.max(0, wallA + ceilA - (it.deductionArea || 0) * q);
                  }

                  const pLiters = (netA / (coveragePaint || 130)) * ((it.paintCoats || 2) / 2);

                  return (
                    <div
                      key={it.id || idx}
                      className={`border rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/10 border-[#00c2c7] shadow-sm"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {it.nos} × {it.name}
                          </span>
                          <span className="text-[9px] bg-[#00c2c7]/20 text-[#00c2c7] px-1.5 py-0.5 rounded font-bold capitalize">
                            {it.paintType.replace("_", " ")}
                          </span>
                          {it.applyPutty && (
                            <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] px-1.5 py-0.5 rounded font-bold">
                              Putty 2 Coats
                            </span>
                          )}
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-1.5 py-0.5 rounded">
                              Editing
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#cbd5e1] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {it.calcMode === "room" ? (
                            <span>
                              Room: <strong>{it.length}' × {it.width}' × {it.height}'</strong>
                            </span>
                          ) : (
                            <span>
                              Direct: <strong>{it.directArea} sq.ft</strong>
                            </span>
                          )}
                          <span className="text-[#2ecc71] font-bold">
                            · Net Area: {netA.toFixed(1)} sq.ft
                          </span>
                          <span className="text-[#38bdf8]">
                            · Paint: ~{pLiters.toFixed(1)} L
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => loadItemIntoForm(it, idx)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit surface"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(idx)}
                          className="px-2.5 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a] cursor-pointer"
                          title="Duplicate surface"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition cursor-pointer"
                          title="Delete surface"
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

          {/* Unit Rates and Coverage Settings */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-[#00c2c7] block">Material Rates & Coverage (পেইন্ট ও উপকরণের দর)</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Paint Rate (৳ / Liter)</label>
                <NumericInput
                  value={paintRate}
                  onChange={setPaintRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Primer Rate (৳ / Liter)</label>
                <NumericInput
                  value={primerRate}
                  onChange={setPrimerRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Wall Putty (৳ / kg)</label>
                <NumericInput
                  value={puttyRate}
                  onChange={setPuttyRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none focus:border-[#00c2c7]"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-3">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary (পেইন্ট ও পুটি হিসাব)</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.itemsCount} Surface Areas · {results.totalSurfaceArea.toLocaleString()} sq.ft Net Area
                </span>
              </div>

              {/* Material Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[#1a2b42] border border-[#38bdf8] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Paint Total (রঙ)</div>
                  <div className="text-sm font-bold text-[#38bdf8]">
                    {results.paintLiters} Liters
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    (~{results.paintDrums} Drums · 18.2L)
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Wall Primer (সিলার)</div>
                  <div className="text-sm font-bold text-[#00c2c7]">
                    {results.primerLiters} Liters
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    (~{results.primerDrums} Drums)
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Wall Putty (পুটি)</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.puttyKg} kg
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    (~{results.puttyBags} Bags · 20kg)
                  </div>
                </div>
              </div>

              {/* Cost Breakdown Pills */}
              <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[9px] text-[#8ba3c1] block">Paint Cost:</span>
                  <span className="font-mono font-bold text-white">৳ {results.paintCost.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8ba3c1] block">Primer Cost:</span>
                  <span className="font-mono font-bold text-white">৳ {results.primerCost.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8ba3c1] block">Putty Cost:</span>
                  <span className="font-mono font-bold text-white">৳ {results.puttyCost.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Total Cost Display with Multiplier Breakdown */}
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
                <div>
                  <div className="text-[10px] text-[#8ba3c1] uppercase font-bold tracking-wider">
                    {isMultiplying
                      ? `Full Building Paint Materials Budget (×${multiplier} Storeys)`
                      : "Typical Floor Paint Materials Budget"}
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
