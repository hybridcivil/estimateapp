import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, StairItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import {
  RotateCcw,
  Footprints,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Building2,
} from "lucide-react";

interface StairCalculatorProps {
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

export const StairCalculator: React.FC<StairCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Staircase Estimation");
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

  // Added Stairs List
  const [stairs, setStairs] = useState<StairItem[]>([
    {
      id: "stair_1",
      nos: 1,
      name: "Flight 1 (Main Flight)",
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
  ]);
  const [editingStairIndex, setEditingStairIndex] = useState<number | null>(null);

  // Form Inputs
  const [stairName, setStairName] = useState("Flight 1 (Main Flight)");
  const [stairNos, setStairNos] = useState(1);
  const [lengthFeet, setLengthFeet] = useState(16);
  const [lengthInches, setLengthInches] = useState(4);
  const [widthFeet, setWidthFeet] = useState(8);
  const [widthInches, setWidthInches] = useState(0);
  const [thicknessIn, setThicknessIn] = useState(6);
  const [mixRatio, setMixRatio] = useState("1:1.5:3");

  const [risers, setRisers] = useState(20);
  const [treads, setTreads] = useState(19);
  const [riserHeightIn, setRiserHeightIn] = useState(5.54);
  const [treadWidthIn, setTreadWidthIn] = useState(10);

  const [mainBar, setMainBar] = useState(12);
  const [mainSpacingIn, setMainSpacingIn] = useState(5);
  const [distBar, setDistBar] = useState(10);
  const [distSpacingIn, setDistSpacingIn] = useState(5);

  // Rates
  // Rates initialized from activeProject.rates or defaults
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
    }
  }, [activeProject?.rates]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  // Update treads when risers change
  const handleRisersChange = (val: number) => {
    setRisers(val);
    if (val > 1) setTreads(val - 1);
  };

  const getCurrentFormStair = (): StairItem => ({
    id: editingStairIndex !== null ? stairs[editingStairIndex]?.id : "stair_" + Date.now(),
    nos: stairNos > 0 ? stairNos : 1,
    name: stairName.trim() || `Flight ${stairs.length + 1}`,
    lengthFeet: lengthFeet >= 0 ? lengthFeet : 16,
    lengthInches: lengthInches >= 0 ? lengthInches : 0,
    widthFeet: widthFeet >= 0 ? widthFeet : 8,
    widthInches: widthInches >= 0 ? widthInches : 0,
    thicknessIn: thicknessIn > 0 ? thicknessIn : 6,
    mixRatio,
    risers: risers > 0 ? risers : 20,
    treads: treads > 0 ? treads : 19,
    riserHeightIn: riserHeightIn > 0 ? riserHeightIn : 5.5,
    treadWidthIn: treadWidthIn > 0 ? treadWidthIn : 10,
    mainBar,
    mainSpacingIn,
    distBar,
    distSpacingIn,
  });

  const loadStairIntoForm = (s: StairItem, idx: number) => {
    setEditingStairIndex(idx);
    setStairName(s.name);
    setStairNos(s.nos);
    setLengthFeet(s.lengthFeet);
    setLengthInches(s.lengthInches);
    setWidthFeet(s.widthFeet);
    setWidthInches(s.widthInches);
    setThicknessIn(s.thicknessIn);
    setMixRatio(s.mixRatio || "1:1.5:3");
    setRisers(s.risers);
    setTreads(s.treads);
    setRiserHeightIn(s.riserHeightIn);
    setTreadWidthIn(s.treadWidthIn);
    setMainBar(s.mainBar || 12);
    setMainSpacingIn(s.mainSpacingIn || 5);
    setDistBar(s.distBar || 10);
    setDistSpacingIn(s.distSpacingIn || 5);
    setErrorMsg("");
  };

  const handleAddNewStair = () => {
    setErrorMsg("");
    if ((lengthFeet <= 0 && lengthInches <= 0) || (widthFeet <= 0 && widthInches <= 0) || thicknessIn <= 0) {
      setErrorMsg("Please enter valid staircase dimensions.");
      return;
    }
    const current = getCurrentFormStair();
    const nextList = [...stairs, current];
    setStairs(nextList);
    calculate(nextList);

    setEditingStairIndex(null);
    setStairName(`Flight ${nextList.length + 1}`);
    setStairNos(1);
    setSuccessMsg(`✓ Added ${current.name} to staircase list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateStair = () => {
    setErrorMsg("");
    if (editingStairIndex === null || editingStairIndex < 0 || editingStairIndex >= stairs.length) {
      handleAddNewStair();
      return;
    }
    const current = getCurrentFormStair();
    const nextList = [...stairs];
    nextList[editingStairIndex] = current;
    setStairs(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDuplicateStair = (idx: number) => {
    const orig = stairs[idx];
    if (!orig) return;
    const duplicated: StairItem = {
      ...orig,
      id: "stair_" + Date.now(),
      name: `${orig.name} (Copy)`,
    };
    const nextList = [...stairs, duplicated];
    setStairs(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${orig.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteStair = (idx: number) => {
    const nextList = stairs.filter((_, i) => i !== idx);
    setStairs(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingStairIndex === idx) {
        setEditingStairIndex(null);
        setStairName(`Flight ${nextList.length + 1}`);
      } else if (editingStairIndex !== null && editingStairIndex > idx) {
        setEditingStairIndex(editingStairIndex - 1);
      }
    } else {
      setEditingStairIndex(null);
      setStairName("Flight 1");
      setResults(null);
    }
  };

  const resetForm = () => {
    setStairName("Flight 1");
    setStairNos(1);
    setLengthFeet(16);
    setLengthInches(4);
    setWidthFeet(8);
    setWidthInches(0);
    setThicknessIn(6);
    setMixRatio("1:1.5:3");
    setRisers(20);
    setTreads(19);
    setRiserHeightIn(5.54);
    setTreadWidthIn(10);
    setMainBar(12);
    setMainSpacingIn(5);
    setDistBar(10);
    setDistSpacingIn(5);
    setEditingStairIndex(null);
    setErrorMsg("");
  };

  const calculate = (list = stairs) => {
    setErrorMsg("");
    if (!list || list.length === 0) {
      setResults(null);
      return null;
    }

    let totalWetVol = 0;
    let totalDryVol = 0;
    let totalCementBags = 0;
    let totalSandCft = 0;
    let totalAggCft = 0;
    let totalMainSteel = 0;
    let totalDistSteel = 0;
    let totalRisersCount = 0;

    list.forEach((s) => {
      const nos = s.nos > 0 ? s.nos : 1;
      const lengthFt = s.lengthFeet + s.lengthInches / 12;
      const widthFt = s.widthFeet + s.widthInches / 12;
      const thicknessFt = s.thicknessIn / 12;
      const riserFt = s.riserHeightIn / 12;
      const treadFt = s.treadWidthIn / 12;

      // Waist Slab volume
      const waistVolume = lengthFt * widthFt * thicknessFt * nos;
      // Steps volume (triangular prisms)
      const stepVolume = 0.5 * riserFt * treadFt * widthFt * s.risers * nos;
      const sWetVol = waistVolume + stepVolume;
      const sDryVol = sWetVol * 1.54;

      totalWetVol += sWetVol;
      totalDryVol += sDryVol;
      totalRisersCount += s.risers * nos;

      // Mix Ratio
      const parts = (s.mixRatio || "1:1.5:3").split(":").map(Number);
      const cR = parts[0] || 1;
      const sR = parts[1] || 1.5;
      const aR = parts[2] || 3;
      const totalRatio = cR + sR + aR;

      totalCementBags += (sDryVol * (cR / totalRatio)) / 1.25;
      totalSandCft += sDryVol * (sR / totalRatio);
      totalAggCft += sDryVol * (aR / totalRatio);

      // Main Steel (runs longitudinally along waist slope)
      const mainSpacingFt = (s.mainSpacingIn || 5) / 12;
      const numMainBars = Math.floor(widthFt / mainSpacingFt) + 1;
      const totalMainLength = numMainBars * (lengthFt * 1.15) * nos; // 15% for slope & hooks
      const mainWeight = (((s.mainBar * s.mainBar) / 162) * (totalMainLength * 0.3048));
      totalMainSteel += mainWeight;

      // Distribution Steel (runs across staircase width)
      const distSpacingFt = (s.distSpacingIn || 5) / 12;
      const numDistBars = Math.floor(lengthFt / distSpacingFt) + 1;
      const totalDistLength = numDistBars * widthFt * nos;
      const distWeight = (((s.distBar * s.distBar) / 162) * (totalDistLength * 0.3048));
      totalDistSteel += distWeight;
    });

    const cementBags = Math.ceil(totalCementBags);
    const sandVolume = Number(totalSandCft.toFixed(1));
    const aggregateVolume = Number(totalAggCft.toFixed(1));
    const totalSteel = Number((totalMainSteel + totalDistSteel).toFixed(1));

    const cementCost = cementBags * cementRate;
    const sandCost = sandVolume * sandRate;
    const aggCost = aggregateVolume * aggRate;
    const steelCost = totalSteel * steelRate;
    const singleFloorTotalCost = cementCost + sandCost + aggCost + steelCost;

    // Apply Storey Multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    const calcResult = {
      volume: Number(((isMultiplying ? totalWetVol * effMultiplier : totalWetVol)).toFixed(2)),
      dryVolume: Number(((isMultiplying ? totalDryVol * effMultiplier : totalDryVol)).toFixed(2)),
      cementBags: isMultiplying ? Math.ceil(cementBags * effMultiplier) : cementBags,
      sandVolume: Number(((isMultiplying ? sandVolume * effMultiplier : sandVolume)).toFixed(1)),
      aggregateVolume: Number(((isMultiplying ? aggregateVolume * effMultiplier : aggregateVolume)).toFixed(1)),
      mainBarWeight: Number(((isMultiplying ? totalMainSteel * effMultiplier : totalMainSteel)).toFixed(1)),
      distBarWeight: Number(((isMultiplying ? totalDistSteel * effMultiplier : totalDistSteel)).toFixed(1)),
      totalSteel: Number(((isMultiplying ? totalSteel * effMultiplier : totalSteel)).toFixed(1)),
      totalRisersCount: isMultiplying ? totalRisersCount * effMultiplier : totalRisersCount,
      totalFlightsCount: (list.reduce((sum, s) => sum + s.nos, 0)) * effMultiplier,
      singleFloorFlightsCount: list.reduce((sum, s) => sum + s.nos, 0),
      // Single floor details
      singleFloorCementBags: cementBags,
      singleFloorSandVolume: sandVolume,
      singleFloorAggVolume: aggregateVolume,
      singleFloorSteel: totalSteel,
      cementCost,
      sandCost,
      aggCost,
      steelCost,
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
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(stairs);
  }, [multiplier, isMultiplying, cementRate, sandRate, aggRate, steelRate]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentStairs = [...stairs];
    if (editingStairIndex !== null && editingStairIndex < currentStairs.length) {
      currentStairs[editingStairIndex] = getCurrentFormStair();
    } else if (currentStairs.length === 0) {
      currentStairs = [getCurrentFormStair()];
    }
    setStairs(currentStairs);
    const boq = calculate(currentStairs);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : editingEstimateId || undefined,
      type: "stair",
      name: estimateName.trim() || "Staircase Estimation",
      totalCost: boq.totalCost,
      summary: boq,
      data: {
        stairs: currentStairs,
        rates: { cementRate, sandRate, aggRate, steelRate },
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.stairs && est.data.stairs.length > 0) {
      setStairs(est.data.stairs);
      loadStairIntoForm(est.data.stairs[0], 0);
    }
    if (est.data?.rates) {
      setCementRate(est.data.rates.cementRate || 550);
      setSandRate(est.data.rates.sandRate || 45);
      setAggRate(est.data.rates.aggRate || 120);
      setSteelRate(est.data.rates.steelRate || 95);
    }
    if (est.data?.multiplier) {
      setMultiplier(est.data.multiplier);
      setIsMultiplying(Boolean(est.data.isMultiplying));
    }
    calculate(est.data?.stairs || stairs);
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "stair" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="stair"
        typeLabel="Staircase"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Staircase Estimate");
          setStairs([]);
          resetForm();
          setResults(null);
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { stairs, multiplier, isMultiplying, rates: { cementRate, sandRate, aggRate, steelRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.stairs) {
            setStairs(payload.data.stairs);
            calculate(payload.data.stairs);
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
            itemTypeLabel="Stair Flights"
          />

          {/* Editing Banner */}
          {editingStairIndex !== null && editingStairIndex < stairs.length && (
            <div className="bg-[#00c2c7]/10 border border-[#00c2c7] text-[#00c2c7] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
              <span>
                Editing: <strong>{stairs[editingStairIndex].name}</strong> (Flight {editingStairIndex + 1} of {stairs.length})
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

          {/* Staircase Form */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5" />
                {editingStairIndex !== null ? "Edit Stair Flight" : "Staircase Flight Geometry"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">RCC Waist Slab & Steps</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Flight Name</label>
                <input
                  type="text"
                  value={stairName}
                  onChange={(e) => setStairName(e.target.value)}
                  placeholder="e.g. Flight 1 (Ground to 1st)"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Quantity (Nos)</label>
                <NumericInput
                  value={stairNos}
                  onChange={setStairNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
                <select
                  value={mixRatio}
                  onChange={(e) => setMixRatio(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                >
                  <option value="1:1.5:3">1:1.5:3 (M20)</option>
                  <option value="1:2:4">1:2:4 (M15)</option>
                </select>
              </div>

              {/* Length Feet & Inches */}
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (Feet)</label>
                <NumericInput
                  value={lengthFeet}
                  onChange={setLengthFeet}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (Inches)</label>
                <NumericInput
                  value={lengthInches}
                  onChange={setLengthInches}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              {/* Width Feet & Inches */}
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (Feet)</label>
                <NumericInput
                  value={widthFeet}
                  onChange={setWidthFeet}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (Inches)</label>
                <NumericInput
                  value={widthInches}
                  onChange={setWidthInches}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Waist Thk (in)</label>
                <NumericInput
                  value={thicknessIn}
                  onChange={setThicknessIn}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Risers (Nos)</label>
                <NumericInput
                  value={risers}
                  onChange={handleRisersChange}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Riser Height (in)</label>
                <NumericInput
                  value={riserHeightIn}
                  onChange={setRiserHeightIn}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Tread Width (in)</label>
                <NumericInput
                  value={treadWidthIn}
                  onChange={setTreadWidthIn}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Rebar Details */}
            <div className="border-t border-[#2d4a6a] pt-2 space-y-2">
              <span className="text-[11px] font-bold text-[#f5a623] block">
                Flight Rebar Specification
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Main Bar (Slope Longitude)</span>
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
                        value={mainSpacingIn}
                        onChange={setMainSpacingIn}
                        className="w-full h-7 px-1 bg-[#243b55] rounded text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2b42] p-2 rounded-lg border border-[#2d4a6a]">
                  <span className="text-[9px] text-[#00c2c7] font-bold block mb-1">Distribution Bar (Transverse)</span>
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
                onClick={editingStairIndex !== null && editingStairIndex < stairs.length ? handleUpdateStair : handleAddNewStair}
                className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {editingStairIndex !== null && editingStairIndex < stairs.length ? "Update Flight in List" : "+ Add Stair Flight to List"}
              </button>
            </div>
          </div>

          {/* Stairs List Schedule */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Stair Flights Schedule</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {stairs.length} flight{stairs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {stairs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No stair flights in list yet. Enter details and click "+ Add Stair Flight to List".
              </div>
            ) : (
              <div className="space-y-1.5">
                {stairs.map((s, idx) => {
                  const isBeingEdited = editingStairIndex === idx;
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
                          {s.lengthFeet}'{s.lengthInches}" × {s.widthFeet}'{s.widthInches}" · {s.risers} Risers · Main {s.mainBar}mm@{s.mainSpacingIn}" · Dist {s.distBar}mm@{s.distSpacingIn}"
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadStairIntoForm(s, idx)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit flight in form"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateStair(idx)}
                          className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a]"
                          title="Duplicate flight"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStair(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition"
                          title="Delete flight"
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
                  {results.totalFlightsCount} Flights · {results.totalRisersCount} Risers
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
                      ? `Full Building Staircase Budget (×${multiplier} Storeys)`
                      : "Typical Floor Staircase Budget"}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#2ecc71]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                </div>

                {isMultiplying && (
                  <div className="text-right sm:border-l sm:border-[#2ecc71]/30 sm:pl-3">
                    <div className="text-[10px] text-[#8ba3c1]">Per Typical Flight</div>
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
