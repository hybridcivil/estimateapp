import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, SlabItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import {
  RotateCcw,
  Calculator,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Layers,
  Building2,
  ChevronDown,
} from "lucide-react";

interface SlabCalculatorProps {
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

export const SlabCalculator: React.FC<SlabCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Two-Way Slab Estimate");
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

  // Added Slabs List
  const [slabs, setSlabs] = useState<SlabItem[]>([
    {
      id: "slab_1",
      nos: 1,
      name: "S1 (Living/Dining)",
      length: 20,
      width: 15,
      thicknessIn: 6,
      mixRatio: "1:1.5:3",
      mainBar: 12,
      spacingIn: 6,
      distBar: 10,
      distSpacingIn: 6,
      extraBar: 10,
      extraBarsNum: 1,
    },
  ]);
  const [editingSlabIndex, setEditingSlabIndex] = useState<number | null>(null);

  // Form Inputs
  const [slabName, setSlabName] = useState("S1 (Living/Dining)");
  const [slabNos, setSlabNos] = useState(1);
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(15);
  const [thicknessIn, setThicknessIn] = useState(6);
  const [mixRatio, setMixRatio] = useState("1:1.5:3");

  const [mainBar, setMainBar] = useState(12);
  const [spacingIn, setSpacingIn] = useState(6);

  const [distBar, setDistBar] = useState(10);
  const [distSpacingIn, setDistSpacingIn] = useState(6);

  const [extraBar, setExtraBar] = useState(10);
  const [extraBarsNum, setExtraBarsNum] = useState(1);

  // Base / Material Rates
  const [baseType, setBaseType] = useState<"none" | "picket">("none");
  const [brickRate, setBrickRate] = useState(15);
  const [bricksPerCft, setBricksPerCft] = useState(10);

  const [cementRate, setCementRate] = useState(550);
  const [sandRate, setSandRate] = useState(45);
  const [aggRate, setAggRate] = useState(120);
  const [steelRate, setSteelRate] = useState(95);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  const getCurrentFormSlab = (): SlabItem => ({
    id: editingSlabIndex !== null ? slabs[editingSlabIndex]?.id : "slab_" + Date.now(),
    nos: slabNos > 0 ? slabNos : 1,
    name: slabName.trim() || `S${slabs.length + 1}`,
    length: length > 0 ? length : 1,
    width: width > 0 ? width : 1,
    thicknessIn: thicknessIn > 0 ? thicknessIn : 6,
    mixRatio,
    mainBar,
    spacingIn,
    distBar,
    distSpacingIn,
    extraBar,
    extraBarsNum,
  });

  const loadSlabIntoForm = (s: SlabItem, idx: number) => {
    setEditingSlabIndex(idx);
    setSlabName(s.name);
    setSlabNos(s.nos);
    setLength(s.length);
    setWidth(s.width);
    setThicknessIn(s.thicknessIn);
    setMixRatio(s.mixRatio || "1:1.5:3");
    setMainBar(s.mainBar || 12);
    setSpacingIn(s.spacingIn || 6);
    setDistBar(s.distBar || 10);
    setDistSpacingIn(s.distSpacingIn || 6);
    setExtraBar(s.extraBar || 10);
    setExtraBarsNum(s.extraBarsNum !== undefined ? s.extraBarsNum : 1);
    setErrorMsg("");
  };

  const handleAddNewSlab = () => {
    setErrorMsg("");
    if (length <= 0 || width <= 0 || thicknessIn <= 0) {
      setErrorMsg("Please enter valid slab dimensions (Length, Width, Thickness > 0).");
      return;
    }
    const current = getCurrentFormSlab();
    const nextList = [...slabs, current];
    setSlabs(nextList);
    calculate(nextList);

    setEditingSlabIndex(null);
    setSlabName(`S${nextList.length + 1}`);
    setSlabNos(1);
    setSuccessMsg(`✓ Added ${current.name} to slab list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateSlab = () => {
    setErrorMsg("");
    if (editingSlabIndex === null || editingSlabIndex < 0 || editingSlabIndex >= slabs.length) {
      handleAddNewSlab();
      return;
    }
    if (length <= 0 || width <= 0 || thicknessIn <= 0) {
      setErrorMsg("Please enter valid slab dimensions.");
      return;
    }
    const current = getCurrentFormSlab();
    const nextList = [...slabs];
    nextList[editingSlabIndex] = current;
    setSlabs(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDuplicateSlab = (idx: number) => {
    const orig = slabs[idx];
    if (!orig) return;
    const duplicated: SlabItem = {
      ...orig,
      id: "slab_" + Date.now(),
      name: `${orig.name} (Copy)`,
    };
    const nextList = [...slabs, duplicated];
    setSlabs(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${orig.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteSlab = (idx: number) => {
    const nextList = slabs.filter((_, i) => i !== idx);
    setSlabs(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingSlabIndex === idx) {
        setEditingSlabIndex(null);
        setSlabName(`S${nextList.length + 1}`);
      } else if (editingSlabIndex !== null && editingSlabIndex > idx) {
        setEditingSlabIndex(editingSlabIndex - 1);
      }
    } else {
      setEditingSlabIndex(null);
      setSlabName("S1");
      setResults(null);
    }
  };

  const resetForm = () => {
    setSlabName("S1");
    setSlabNos(1);
    setLength(20);
    setWidth(15);
    setThicknessIn(6);
    setMixRatio("1:1.5:3");
    setMainBar(12);
    setSpacingIn(6);
    setDistBar(10);
    setDistSpacingIn(6);
    setExtraBar(10);
    setExtraBarsNum(1);
    setEditingSlabIndex(null);
    setErrorMsg("");
  };

  // Calculate BOQ across all slabs in list
  const calculate = (list = slabs) => {
    setErrorMsg("");
    if (!list || list.length === 0) {
      setResults(null);
      return null;
    }

    let totalArea = 0;
    let totalWetVol = 0;
    let totalDryVol = 0;
    let totalCementBags = 0;
    let totalSandCft = 0;
    let totalAggCft = 0;

    let totalMainSteel = 0;
    let totalDistSteel = 0;
    let totalExtraSteel = 0;

    const isPicket = baseType === "picket";

    list.forEach((s) => {
      const nos = s.nos > 0 ? s.nos : 1;
      const thFt = s.thicknessIn / 12;
      const sArea = s.length * s.width * nos;
      const sVol = sArea * thFt;
      const sDryVol = sVol * 1.54;

      totalArea += sArea;
      totalWetVol += sVol;
      totalDryVol += sDryVol;

      // Mix Ratio
      const parts = (s.mixRatio || "1:1.5:3").split(":").map(Number);
      const cR = parts[0] || 1;
      const sR = parts[1] || 1.5;
      const aR = parts[2] || 3;
      const ratioSum = cR + sR + aR;

      const cVol = sDryVol * (cR / ratioSum);
      const sVolume = sDryVol * (sR / ratioSum);
      const aVolume = sDryVol * (aR / ratioSum);

      totalCementBags += cVol / 1.25;
      totalSandCft += sVolume;
      totalAggCft += aVolume;

      // Main Steel
      const spacingFt = (s.spacingIn || 6) / 12;
      const numMainBars = Math.floor(s.length / spacingFt) + 1;
      const totalMainBarLength = numMainBars * s.width * nos;
      const mainBarWt = (((s.mainBar * s.mainBar) / 162) * (totalMainBarLength * 0.3048));
      totalMainSteel += mainBarWt;

      // Distribution Steel
      const dSpacingFt = (s.distSpacingIn || 6) / 12;
      const numDistBars = Math.floor(s.width / dSpacingFt) + 1;
      const totalDistBarLength = numDistBars * s.length * nos;
      const distBarWt = (((s.distBar * s.distBar) / 162) * (totalDistBarLength * 0.3048));
      totalDistSteel += distBarWt;

      // Extra Top Bars
      const mainDistLen = totalMainBarLength + totalDistBarLength;
      const totalExtraLen = (mainDistLen / 3) * Math.max(0, s.extraBarsNum !== undefined ? s.extraBarsNum : 1);
      const extraBarWt = (((s.extraBar * s.extraBar) / 162) * (totalExtraLen * 0.3048));
      totalExtraSteel += extraBarWt;
    });

    const cementBags = Math.ceil(totalCementBags);
    const sandVolume = Number(totalSandCft.toFixed(1));
    const aggregateVolume = Number(totalAggCft.toFixed(1));
    const totalSteel = Number((totalMainSteel + totalDistSteel + totalExtraSteel).toFixed(1));

    let brickQty = 0;
    let picketCost = 0;
    if (isPicket) {
      brickQty = Math.ceil(aggregateVolume * bricksPerCft * 1.1);
      picketCost = brickQty * brickRate;
    }

    const useAggregate = !isPicket;
    const cementCost = cementBags * cementRate;
    const sandCost = sandVolume * sandRate;
    const aggCost = useAggregate ? aggregateVolume * aggRate : 0;
    const steelCost = totalSteel * steelRate;
    const singleFloorTotalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    // Apply Storey Multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    const calcResult = {
      area: Number(((isMultiplying ? totalArea * effMultiplier : totalArea)).toFixed(1)),
      volume: Number(((isMultiplying ? totalWetVol * effMultiplier : totalWetVol)).toFixed(2)),
      dryVolume: Number(((isMultiplying ? totalDryVol * effMultiplier : totalDryVol)).toFixed(2)),
      cementBags: isMultiplying ? Math.ceil(cementBags * effMultiplier) : cementBags,
      sandVolume: Number(((isMultiplying ? sandVolume * effMultiplier : sandVolume)).toFixed(1)),
      aggregateVolume: Number(((isMultiplying ? aggregateVolume * effMultiplier : aggregateVolume)).toFixed(1)),
      brickQty: isMultiplying ? brickQty * effMultiplier : brickQty,
      useAggregate,
      mainBarWeight: Number(((isMultiplying ? totalMainSteel * effMultiplier : totalMainSteel)).toFixed(1)),
      distBarWeight: Number(((isMultiplying ? totalDistSteel * effMultiplier : totalDistSteel)).toFixed(1)),
      extraBarWeight: Number(((isMultiplying ? totalExtraSteel * effMultiplier : totalExtraSteel)).toFixed(1)),
      totalSteel: Number(((isMultiplying ? totalSteel * effMultiplier : totalSteel)).toFixed(1)),
      totalSlabsCount: (list.reduce((sum, s) => sum + s.nos, 0)) * effMultiplier,
      singleFloorSlabsCount: list.reduce((sum, s) => sum + s.nos, 0),
      // Single floor details
      singleFloorCementBags: cementBags,
      singleFloorSandVolume: sandVolume,
      singleFloorAggVolume: aggregateVolume,
      singleFloorSteel: totalSteel,
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      singleFloorTotalCost,
      // Storey multiplier details
      multiplier: effMultiplier,
      isMultiplying,
      totalCost: multipliedCost,
      // Multiplied materials for full building
      multipliedCementBags: Math.ceil(cementBags * effMultiplier),
      multipliedSandCft: Number((sandVolume * effMultiplier).toFixed(1)),
      multipliedAggCft: Number((aggregateVolume * effMultiplier).toFixed(1)),
      multipliedSteelKg: Number((totalSteel * effMultiplier).toFixed(1)),
      multipliedBricks: brickQty * effMultiplier,
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(slabs);
  }, [
    multiplier,
    isMultiplying,
    baseType,
    brickRate,
    bricksPerCft,
    cementRate,
    sandRate,
    aggRate,
    steelRate,
  ]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentSlabs = [...slabs];
    if (editingSlabIndex !== null && editingSlabIndex < currentSlabs.length) {
      currentSlabs[editingSlabIndex] = getCurrentFormSlab();
    } else if (currentSlabs.length === 0) {
      currentSlabs = [getCurrentFormSlab()];
    }
    setSlabs(currentSlabs);
    const boq = calculate(currentSlabs);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : editingEstimateId || undefined,
      type: "slab",
      name: estimateName.trim() || "Two-Way Slab Estimate",
      totalCost: boq.totalCost,
      summary: boq,
      data: {
        slabs: currentSlabs,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.slabs && est.data.slabs.length > 0) {
      setSlabs(est.data.slabs);
      loadSlabIntoForm(est.data.slabs[0], 0);
    }
    if (est.data?.rates) {
      setCementRate(est.data.rates.cementRate || 550);
      setSandRate(est.data.rates.sandRate || 45);
      setAggRate(est.data.rates.aggRate || 120);
      setSteelRate(est.data.rates.steelRate || 95);
    }
    if (est.data?.baseType) setBaseType(est.data.baseType);
    if (est.data?.multiplier) {
      setMultiplier(est.data.multiplier);
      setIsMultiplying(Boolean(est.data.isMultiplying));
    }
    calculate(est.data?.slabs || slabs);
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "slab" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="slab"
        typeLabel="Two-Way Slab"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Slab Estimate");
          setSlabs([]);
          resetForm();
          setResults(null);
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { slabs, baseType, multiplier, isMultiplying, rates: { cementRate, sandRate, aggRate, steelRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.slabs) {
            setSlabs(payload.data.slabs);
            calculate(payload.data.slabs);
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
            itemTypeLabel="Floor Slabs"
          />

          {/* Editing Mode Banner */}
          {editingSlabIndex !== null && editingSlabIndex < slabs.length && (
            <div className="bg-[#00c2c7]/10 border border-[#00c2c7] text-[#00c2c7] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
              <span>
                Editing: <strong>{slabs[editingSlabIndex].name}</strong> (Item {editingSlabIndex + 1} of {slabs.length})
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

          {/* Slab Form Inputs */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {editingSlabIndex !== null ? "Edit Slab Panel" : "Slab Panel Dimensions"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">Reinforced Two-Way Slab</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Slab Identification</label>
                <input
                  type="text"
                  value={slabName}
                  onChange={(e) => setSlabName(e.target.value)}
                  placeholder="e.g. S1 (Living Area)"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Quantity (Nos)</label>
                <NumericInput
                  value={slabNos}
                  onChange={setSlabNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Concrete Mix</label>
                <select
                  value={mixRatio}
                  onChange={(e) => setMixRatio(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                >
                  <option value="1:1.5:3">1:1.5:3 (M20)</option>
                  <option value="1:2:4">1:2:4 (M15)</option>
                  <option value="1:1:2">1:1:2 (M25)</option>
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
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (ft)</label>
                <NumericInput
                  value={width}
                  onChange={setWidth}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Thickness (inch)</label>
                <NumericInput
                  value={thicknessIn}
                  onChange={setThicknessIn}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Panel Area</label>
                <div className="w-full h-8 px-2 bg-[#0e1624] border border-[#2d4a6a] rounded text-xs text-[#00c2c7] font-mono flex items-center font-bold">
                  {(length * width * slabNos).toFixed(0)} sq.ft
                </div>
              </div>
            </div>

            {/* Reinforcement Details */}
            <div className="border-t border-[#2d4a6a] pt-2 space-y-2">
              <span className="text-[11px] font-bold text-[#f5a623] block">
                Slab Rebar Specification (Main, Distribution & Extra Top)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Main Bar (Shorter Span)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Dia (mm)</label>
                      <select
                        value={mainBar}
                        onChange={(e) => setMainBar(Number(e.target.value))}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      >
                        <option value={10}>10 mm</option>
                        <option value={12}>12 mm</option>
                        <option value={16}>16 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Spacing (in)</label>
                      <NumericInput
                        value={spacingIn}
                        onChange={setSpacingIn}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Distribution Bar (Long Span)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Dia (mm)</label>
                      <select
                        value={distBar}
                        onChange={(e) => setDistBar(Number(e.target.value))}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      >
                        <option value={8}>8 mm</option>
                        <option value={10}>10 mm</option>
                        <option value={12}>12 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Spacing (in)</label>
                      <NumericInput
                        value={distSpacingIn}
                        onChange={setDistSpacingIn}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a] col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-[#f5a623] font-bold block mb-1">Extra Top Bar @ Supports</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Dia (mm)</label>
                      <select
                        value={extraBar}
                        onChange={(e) => setExtraBar(Number(e.target.value))}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      >
                        <option value={10}>10 mm</option>
                        <option value={12}>12 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8ba3c1] block">Ratio / Span</label>
                      <NumericInput
                        value={extraBarsNum}
                        onChange={setExtraBarsNum}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
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
                onClick={editingSlabIndex !== null && editingSlabIndex < slabs.length ? handleUpdateSlab : handleAddNewSlab}
                className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {editingSlabIndex !== null && editingSlabIndex < slabs.length ? "Update Slab in List" : "+ Add Slab to List"}
              </button>
            </div>
          </div>

          {/* Slabs List Schedule */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Slabs Schedule</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {slabs.length} slab panel{slabs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {slabs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No slabs in list yet. Enter dimensions and click "+ Add Slab to List".
              </div>
            ) : (
              <div className="space-y-1.5">
                {slabs.map((s, idx) => {
                  const isBeingEdited = editingSlabIndex === idx;
                  return (
                    <div
                      key={s.id || idx}
                      className={`border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/10 border-[#00c2c7] shadow-sm"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {s.nos} × {s.name}
                          </span>
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-1.5 py-0.2 rounded">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8ba3c1] truncate mt-0.5">
                          {s.length}' × {s.width}' · {s.thicknessIn}" thk · Main {s.mainBar}mm@{s.spacingIn}" · Dist {s.distBar}mm@{s.distSpacingIn}" · Mix {s.mixRatio}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadSlabIntoForm(s, idx)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit slab in form"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSlab(idx)}
                          className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a]"
                          title="Duplicate this slab"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSlab(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition"
                          title="Delete slab"
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

          {/* Material Rates Settings */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-[#00c2c7] block">Material Rates & Base Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Aggregate (per cft)</label>
                <NumericInput
                  value={aggRate}
                  onChange={setAggRate}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Rebar (per kg)</label>
                <NumericInput
                  value={steelRate}
                  onChange={setSteelRate}
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
                  {results.totalSlabsCount} Total Panels · {results.area} sq.ft
                </span>
              </div>

              {/* Material Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {isMultiplying ? results.multipliedCementBags : results.cementBags} bags
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.cementBags} bags / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {isMultiplying ? results.multipliedSandCft : results.sandVolume} cft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.sandVolume} cft / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Aggregate</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {isMultiplying ? results.multipliedAggCft : results.aggregateVolume} cft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.aggregateVolume} cft / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Rebar Total</div>
                  <div className="text-sm font-bold text-[#00c2c7]">
                    {isMultiplying ? results.multipliedSteelKg : results.totalSteel} kg
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalSteel} kg / floor)
                    </div>
                  )}
                </div>
              </div>

              {/* Total Cost Display with Multiplier Breakdown */}
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
                <div>
                  <div className="text-[10px] text-[#8ba3c1] uppercase font-bold tracking-wider">
                    {isMultiplying
                      ? `Full Building Slab Budget (×${multiplier} Storeys)`
                      : "Typical Floor Slab Budget"}
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
