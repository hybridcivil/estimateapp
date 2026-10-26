import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, SituPileInputs, SituPileResults } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import {
  RotateCcw,
  CheckCircle2,
  CircleDot,
  Building2,
  DollarSign,
  Ruler,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

interface SituPileCalculatorProps {
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

export const SituPileCalculator: React.FC<SituPileCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Cast-in-Situ Bored Pile Estimation");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  // Geometric & Structural Inputs
  const [pileNos, setPileNos] = useState<number>(24);
  const [pileLength, setPileLength] = useState<number>(50); // feet
  const [pileDiameter, setPileDiameter] = useState<number>(20); // inches
  const [barSize, setBarSize] = useState<number>(20); // mm
  const [barNos, setBarNos] = useState<number>(8); // nos
  const [spiralSpacing, setSpiralSpacing] = useState<number>(5); // inches
  const [spiralDia, setSpiralDia] = useState<number>(8); // mm
  const [mixRatio, setMixRatio] = useState<string>("1:1.5:3");
  const [clearCoverIn, setClearCoverIn] = useState<number>(3); // 3 inches for bored pile

  // Rates & Costs initialized from activeProject.rates or defaults
  const [constructionCostPerFoot, setConstructionCostPerFoot] = useState<number>(() => activeProject?.rates?.boringRatePerFt || 200);
  const [cementCost, setCementCost] = useState<number>(() => activeProject?.rates?.cementRate || 550);
  const [sandCost, setSandCost] = useState<number>(() => activeProject?.rates?.sandRate || 45);
  const [aggregateCost, setAggregateCost] = useState<number>(() => activeProject?.rates?.aggRate || 120);
  const [steelCost, setSteelCost] = useState<number>(() => activeProject?.rates?.steelRate || 95);

  useEffect(() => {
    if (activeProject?.rates) {
      if (activeProject.rates.boringRatePerFt) setConstructionCostPerFoot(activeProject.rates.boringRatePerFt);
      if (activeProject.rates.cementRate) setCementCost(activeProject.rates.cementRate);
      if (activeProject.rates.sandRate) setSandCost(activeProject.rates.sandRate);
      if (activeProject.rates.aggRate) setAggregateCost(activeProject.rates.aggRate);
      if (activeProject.rates.steelRate) setSteelCost(activeProject.rates.steelRate);
    }
  }, [activeProject?.rates]);

  const [results, setResults] = useState<SituPileResults | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const calculateCost = (
    nos = pileNos,
    length = pileLength,
    dia = pileDiameter,
    bSize = barSize,
    bNos = barNos,
    spSpacing = spiralSpacing,
    spDia = spiralDia,
    mix = mixRatio,
    footRate = constructionCostPerFoot,
    cCost = cementCost,
    sCost = sandCost,
    aCost = aggregateCost,
    stCost = steelCost
  ) => {
    if (nos <= 0 || length <= 0 || dia <= 0 || bSize <= 0 || bNos <= 0 || spSpacing <= 0) {
      setResults(null);
      return;
    }

    // Concrete calculations
    const pileRadius = (dia / 2) / 12; // feet
    const wetVolumePerPile = Math.PI * Math.pow(pileRadius, 2) * length;
    const dryVolumePerPile = wetVolumePerPile * 1.54;

    // Material calculations based on mix ratio
    const mixParts = mix.split(":").map(Number);
    const cementPart = mixParts[0] || 1;
    const sandPart = mixParts[1] || 1.5;
    const aggregatePart = mixParts[2] || 3;
    const mixTotal = cementPart + sandPart + aggregatePart;

    const cementVolumePerPile = (dryVolumePerPile / mixTotal) * cementPart;
    const sandVolumePerPile = (dryVolumePerPile / mixTotal) * sandPart;
    const aggregateVolumePerPile = (dryVolumePerPile / mixTotal) * aggregatePart;
    const cementBagsPerPile = cementVolumePerPile / 1.226; // 1 bag = 1.226 CFT

    // Main Steel calculations (including 50d lapping if length > 12m ≈ 40ft)
    const lappingLength = length > 40 ? 50 * (bSize / 1000) : 0;
    const totalBarLength = length * 0.3048 + lappingLength; // meters
    const weightPerMeter = (bSize * bSize) / 162; // kg/m
    const mainBarWeightPerPile = bNos * totalBarLength * weightPerMeter;

    // Spiral ties calculations
    const cageDia = Math.max(4, dia - 2 * clearCoverIn); // cage diameter in inches
    const pileCircumference = Math.PI * (cageDia * 0.0254); // meters
    const spiralLengthPerLoop = pileCircumference + 50 * (spDia / 1000); // 50d lapping
    const totalSpirals = (length * 12) / spSpacing;
    const spiralWeightPerMeter = (spDia * spDia) / 162;
    const spiralWeightPerPile = totalSpirals * spiralLengthPerLoop * spiralWeightPerMeter;

    // Totals for all piles
    const totalMainBarWeight = Number((mainBarWeightPerPile * nos).toFixed(1));
    const totalSpiralWeight = Number((spiralWeightPerPile * nos).toFixed(1));
    const totalSteelWeight = Number((totalMainBarWeight + totalSpiralWeight).toFixed(1));

    const totalCementBags = Math.ceil(cementBagsPerPile * nos);
    const totalSandVolume = Number((sandVolumePerPile * nos).toFixed(1));
    const totalAggregateVolume = Number((aggregateVolumePerPile * nos).toFixed(1));
    const totalWetVolume = Number((wetVolumePerPile * nos).toFixed(2));
    const totalDryVolume = Number((dryVolumePerPile * nos).toFixed(2));

    // Cost calculations
    const constructionCost = Math.round(length * footRate * nos);
    const cementCostTotal = Math.round(totalCementBags * cCost);
    const sandCostTotal = Math.round(totalSandVolume * sCost);
    const aggregateCostTotal = Math.round(totalAggregateVolume * aCost);
    const steelCostTotal = Math.round(totalSteelWeight * stCost);
    const totalCost = constructionCost + cementCostTotal + sandCostTotal + aggregateCostTotal + steelCostTotal;

    setResults({
      wetVolumePerPile: Number(wetVolumePerPile.toFixed(2)),
      dryVolumePerPile: Number(dryVolumePerPile.toFixed(2)),
      totalWetVolume,
      totalDryVolume,
      cementBagsPerPile: Number(cementBagsPerPile.toFixed(2)),
      totalCementBags,
      sandVolumePerPile: Number(sandVolumePerPile.toFixed(2)),
      totalSandVolume,
      aggregateVolumePerPile: Number(aggregateVolumePerPile.toFixed(2)),
      totalAggregateVolume,
      mainBarWeightPerPile: Number(mainBarWeightPerPile.toFixed(1)),
      totalMainBarWeight,
      spiralWeightPerPile: Number(spiralWeightPerPile.toFixed(1)),
      totalSpiralWeight,
      totalSteelWeight,
      constructionCost,
      cementCostTotal,
      sandCostTotal,
      aggregateCostTotal,
      steelCostTotal,
      totalCost,
    });
  };

  useEffect(() => {
    calculateCost();
  }, [
    pileNos,
    pileLength,
    pileDiameter,
    barSize,
    barNos,
    spiralSpacing,
    spiralDia,
    mixRatio,
    clearCoverIn,
    constructionCostPerFoot,
    cementCost,
    sandCost,
    aggregateCost,
    steelCost,
  ]);

  // Load saved estimate
  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    if (est.type !== "situ_pile") return;
    setEditingEstimateId(est.id);
    setEstimateName(est.name || "Cast-in-Situ Bored Pile");

    const d = est.data || {};
    if (d.pileNos !== undefined) setPileNos(d.pileNos);
    if (d.pileLength !== undefined) setPileLength(d.pileLength);
    if (d.pileDiameter !== undefined) setPileDiameter(d.pileDiameter);
    if (d.barSize !== undefined) setBarSize(d.barSize);
    if (d.barNos !== undefined) setBarNos(d.barNos);
    if (d.spiralSpacing !== undefined) setSpiralSpacing(d.spiralSpacing);
    if (d.spiralDia !== undefined) setSpiralDia(d.spiralDia);
    if (d.mixRatio) setMixRatio(d.mixRatio);
    if (d.clearCoverIn !== undefined) setClearCoverIn(d.clearCoverIn);
    if (d.constructionCostPerFoot !== undefined) setConstructionCostPerFoot(d.constructionCostPerFoot);
    if (d.cementCost !== undefined) setCementCost(d.cementCost);
    if (d.sandCost !== undefined) setSandCost(d.sandCost);
    if (d.aggregateCost !== undefined) setAggregateCost(d.aggregateCost);
    if (d.steelCost !== undefined) setSteelCost(d.steelCost);

    calculateCost(
      d.pileNos || pileNos,
      d.pileLength || pileLength,
      d.pileDiameter || pileDiameter,
      d.barSize || barSize,
      d.barNos || barNos,
      d.spiralSpacing || spiralSpacing,
      d.spiralDia || spiralDia,
      d.mixRatio || mixRatio,
      d.constructionCostPerFoot || constructionCostPerFoot,
      d.cementCost || cementCost,
      d.sandCost || sandCost,
      d.aggregateCost || aggregateCost,
      d.steelCost || steelCost
    );
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "situ_pile" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  const handleClearEstimate = () => {
    setEditingEstimateId(null);
    setEstimateName("Cast-in-Situ Bored Pile Estimation");
    setPileNos(24);
    setPileLength(50);
    setPileDiameter(20);
    setBarSize(20);
    setBarNos(8);
    setSpiralSpacing(5);
    setSpiralDia(8);
    setMixRatio("1:1.5:3");
    setClearCoverIn(3);
    setConstructionCostPerFoot(200);
    setCementCost(550);
    setSandCost(45);
    setAggregateCost(120);
    setSteelCost(95);
    if (onClearLoadedEstimate) onClearLoadedEstimate();
  };

  const handleSaveToProject = async (asCopy = false) => {
    if (!results) return;
    const saveId = asCopy || !editingEstimateId ? undefined : editingEstimateId;
    const finalName = asCopy ? `${estimateName} (Copy)` : estimateName;

    const payload = {
      id: saveId,
      type: "situ_pile",
      name: finalName,
      totalCost: results.totalCost,
      summary: {
        pileNos,
        pileLength,
        pileDiameter,
        cementBags: results.totalCementBags,
        sandCft: results.totalSandVolume,
        aggCft: results.totalAggregateVolume,
        totalSteelKg: results.totalSteelWeight,
        wetVolCft: results.totalWetVolume,
        dryVolCft: results.totalDryVolume,
        totalCost: results.totalCost,
        constructionCost: results.constructionCost,
        steelBreakdown: {
          [barSize]: results.totalMainBarWeight,
          [spiralDia]: results.totalSpiralWeight,
        },
      },
      data: {
        pileNos,
        pileLength,
        pileDiameter,
        barSize,
        barNos,
        spiralSpacing,
        spiralDia,
        mixRatio,
        clearCoverIn,
        rates: {
          constructionCostPerFoot,
          cementRate: cementCost,
          sandRate: sandCost,
          aggRate: aggregateCost,
          steelRate: steelCost,
        },
        constructionCostPerFoot,
        cementCost,
        sandCost,
        aggregateCost,
        steelCost,
      },
    };

    await onSaveEstimate(payload);
    setSuccessMsg(asCopy ? "✓ Saved as new copy!" : "✓ Saved to project successfully!");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="situ_pile"
        typeLabel="Situ Pile"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={handleClearEstimate}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: {
            pileNos,
            pileLength,
            pileDiameter,
            barSize,
            barNos,
            spiralSpacing,
            spiralDia,
            mixRatio,
            clearCoverIn,
            constructionCostPerFoot,
            cementCost,
            sandCost,
            aggregateCost,
            steelCost,
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data) {
            const d = payload.data;
            if (d.pileNos) setPileNos(d.pileNos);
            if (d.pileLength) setPileLength(d.pileLength);
            if (d.pileDiameter) setPileDiameter(d.pileDiameter);
            if (d.barSize) setBarSize(d.barSize);
            if (d.barNos) setBarNos(d.barNos);
            if (d.spiralSpacing) setSpiralSpacing(d.spiralSpacing);
            if (d.mixRatio) setMixRatio(d.mixRatio);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Header Banner */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-[#00c2c7]/20 text-[#00c2c7] px-2 py-0.5 rounded font-semibold border border-[#00c2c7]/40 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5" />
                  Deep Foundation
                </span>
                <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded font-semibold border border-[#f5a623]/40">
                  Cast-in-Situ Bored Pile
                </span>
                <span className="text-xs bg-[#38bdf8]/20 text-[#38bdf8] px-2 py-0.5 rounded font-semibold border border-[#38bdf8]/40">
                  Foundation (Used Once · No Storey Mult)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Cast-in-Situ Pile Construction Cost & Rebar Takeoff
              </h2>
              <p className="text-xs text-[#8ba3c1] mt-0.5">
                Calculate concrete volume, cement, sand, stone aggregate, longitudinal rebar, spiral ties and boring costs per BNBC standards.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearEstimate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2b42] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border border-[#2d4a6a] transition shrink-0 cursor-pointer"
              title="Reset all values to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {successMsg && (
            <div className="bg-[#2ecc71]/20 border border-[#2ecc71]/40 text-[#2ecc71] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Grid: Inputs vs Results & Diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Form Inputs (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Pile Dimensions & Concrete Mix */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2d4a6a] pb-2">
                  <Ruler className="w-4 h-4 text-[#00c2c7]" />
                  Pile Dimensions & Boring Geometry
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Number of Piles <span className="text-[#00c2c7]">*</span>
                    </label>
                    <NumericInput
                      value={pileNos}
                      onChange={(v) => setPileNos(Math.max(1, Math.round(v)))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                      placeholder="e.g. 24"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Pile Length (feet) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={pileLength}
                        onChange={(v) => setPileLength(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 50"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">ft</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Pile Diameter (inches) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={pileDiameter}
                        onChange={(v) => setPileDiameter(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 20"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">in</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Concrete Mix Ratio
                    </label>
                    <select
                      value={mixRatio}
                      onChange={(e) => setMixRatio(e.target.value)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value="1:1.5:3">1:1.5:3 (M20 / 3000 psi - Standard Bored Pile)</option>
                      <option value="1:2:4">1:2:4 (M15 / 2500 psi)</option>
                      <option value="1:1:2">1:1:2 (M25 / 3500 psi - High Strength)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Clear Concrete Cover (inches)
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={clearCoverIn}
                        onChange={(v) => setClearCoverIn(Math.max(2, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 3"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">in</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reinforcement Configuration */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2d4a6a] pb-2">
                  <Layers className="w-4 h-4 text-[#f5a623]" />
                  Rebar Cage & Spiral Reinforcement
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Main Longitudinal Bar Size (mm) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <select
                      value={barSize}
                      onChange={(e) => setBarSize(Number(e.target.value))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value={16}>16 mmø (ASTM #5 - 1.58 kg/m)</option>
                      <option value={20}>20 mmø (ASTM #6 - 2.47 kg/m)</option>
                      <option value={25}>25 mmø (ASTM #8 - 3.85 kg/m)</option>
                      <option value={22}>22 mmø (2.98 kg/m)</option>
                      <option value={28}>28 mmø (4.83 kg/m)</option>
                      <option value={32}>32 mmø (6.31 kg/m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Number of Main Bars (nos) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <NumericInput
                      value={barNos}
                      onChange={(v) => setBarNos(Math.max(4, Math.round(v)))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                      placeholder="e.g. 8"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Spiral Pitch / Spacing (inches) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={spiralSpacing}
                        onChange={(v) => setSpiralSpacing(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 5"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">in c/c</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Spiral Bar Size (mm)
                    </label>
                    <select
                      value={spiralDia}
                      onChange={(e) => setSpiralDia(Number(e.target.value))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                    >
                      <option value={8}>8 mmø (ASTM #2.5 - 0.395 kg/m)</option>
                      <option value={10}>10 mmø (ASTM #3 - 0.617 kg/m)</option>
                      <option value={12}>12 mmø (ASTM #4 - 0.888 kg/m)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Boring & Material Cost Rates */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2d4a6a] pb-2">
                  <DollarSign className="w-4 h-4 text-[#2ecc71]" />
                  Boring Cost & Material Rates
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      Boring Cost (TK/ft)
                    </label>
                    <NumericInput
                      value={constructionCostPerFoot}
                      onChange={(v) => setConstructionCostPerFoot(Math.max(0, v))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      Cement (TK/bag)
                    </label>
                    <NumericInput
                      value={cementCost}
                      onChange={(v) => setCementCost(Math.max(0, v))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      Sand (TK/CFT)
                    </label>
                    <NumericInput
                      value={sandCost}
                      onChange={(v) => setSandCost(Math.max(0, v))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      Stone Agg (TK/CFT)
                    </label>
                    <NumericInput
                      value={aggregateCost}
                      onChange={(v) => setAggregateCost(Math.max(0, v))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      Steel (TK/kg)
                    </label>
                    <NumericInput
                      value={steelCost}
                      onChange={(v) => setSteelCost(Math.max(0, v))}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Visual Cage Diagram & Detailed Results (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Circular Pile Cage Cross-Section Diagram */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CircleDot className="w-4 h-4 text-[#00c2c7]" />
                    Reinforced Pile Cross-Section
                  </h4>
                  <span className="text-[10px] font-mono text-[#00c2c7] bg-[#00c2c7]/10 px-2 py-0.5 rounded border border-[#00c2c7]/30">
                    {pileDiameter}"ø • {barNos}-{barSize}mmø
                  </span>
                </div>

                {/* SVG Visualizer (Clean Light Shape) */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <svg width="200" height="190" viewBox="0 0 200 190" className="overflow-visible">
                    {/* Concrete Outer Circle - Light Concrete Fill */}
                    <circle cx="100" cy="95" r="75" fill="#e2e8f0" stroke="#0284c7" strokeWidth="2.5" />
                    <text x="100" y="14" fill="#0f172a" fontSize="10" textAnchor="middle" fontWeight="bold">
                      Outer Borehole: {pileDiameter}"ø
                    </text>

                    {/* Spiral Tie Circle */}
                    <circle cx="100" cy="95" r="54" fill="#f8fafc" stroke="#d97706" strokeWidth="2.5" />
                    
                    {/* Longitudinal Rebars around circumference */}
                    {Array.from({ length: barNos }).map((_, i) => {
                      const angle = (i * 2 * Math.PI) / barNos - Math.PI / 2;
                      const rx = 100 + 54 * Math.cos(angle);
                      const ry = 95 + 54 * Math.sin(angle);
                      return (
                        <g key={i}>
                          <circle cx={rx} cy={ry} r="5.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      );
                    })}

                    {/* Center crosshair */}
                    <line x1="94" y1="95" x2="106" y2="95" stroke="#64748b" strokeWidth="1.5" />
                    <line x1="100" y1="89" x2="100" y2="101" stroke="#64748b" strokeWidth="1.5" />

                    {/* Clear cover dimension indicator */}
                    <line x1="154" y1="95" x2="175" y2="95" stroke="#dc2626" strokeWidth="2" />
                    <text x="165" y="90" fill="#dc2626" fontSize="9" textAnchor="middle" fontWeight="bold">
                      {clearCoverIn}"
                    </text>
                  </svg>
                  <div className="text-[10px] text-slate-700 text-center mt-1">
                    Clear Cover: <strong className="text-slate-900">{clearCoverIn}"</strong> • Spiral: <strong className="text-amber-700">{spiralDia}mmø @ {spiralSpacing}" c/c</strong>
                  </div>
                </div>

                {/* KPI Result Cards */}
                {results ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#1a2b42] p-2.5 rounded-xl border border-[#2d4a6a]">
                        <span className="text-[10px] text-[#8ba3c1] block uppercase font-bold">Total Wet Volume</span>
                        <div className="text-lg font-black font-mono text-[#00c2c7]">
                          {results.totalWetVolume.toLocaleString()} <span className="text-xs font-normal text-[#8ba3c1]">CFT</span>
                        </div>
                        <span className="text-[9px] text-[#8ba3c1]">
                          Dry Vol: {results.totalDryVolume.toLocaleString()} CFT
                        </span>
                      </div>

                      <div className="bg-[#1a2b42] p-2.5 rounded-xl border border-[#2d4a6a]">
                        <span className="text-[10px] text-[#8ba3c1] block uppercase font-bold">Total Rebar Steel</span>
                        <div className="text-lg font-black font-mono text-[#f5a623]">
                          {results.totalSteelWeight.toLocaleString()} <span className="text-xs font-normal text-[#8ba3c1]">kg</span>
                        </div>
                        <span className="text-[9px] text-[#8ba3c1]">
                          ≈ {(results.totalSteelWeight / 1000).toFixed(2)} Metric Tons
                        </span>
                      </div>
                    </div>

                    {/* Detailed Materials Table */}
                    <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-xl p-3 space-y-2 text-xs">
                      <div className="font-bold text-white border-b border-[#2d4a6a] pb-1.5 flex justify-between">
                        <span>Material Quantities</span>
                        <span className="text-[10px] text-[#8ba3c1] font-mono">{pileNos} Piles × {pileLength} ft</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Cement Bags ({mixRatio}):</span>
                        <span className="font-mono font-bold text-white">{results.totalCementBags} Bags</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Sand Volume:</span>
                        <span className="font-mono font-bold text-white">{results.totalSandVolume} CFT</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Stone Aggregate Volume:</span>
                        <span className="font-mono font-bold text-white">{results.totalAggregateVolume} CFT</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Main Bars ({barNos}-{barSize}mmø):</span>
                        <span className="font-mono font-bold text-white">{results.totalMainBarWeight} kg</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Spiral Ties ({spiralDia}mmø @ {spiralSpacing}"):</span>
                        <span className="font-mono font-bold text-white">{results.totalSpiralWeight} kg</span>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="font-bold text-white border-b border-[#2d4a6a] pb-1.5 flex justify-between">
                        <span>Cost Breakdown</span>
                        <span className="text-[10px] text-[#8ba3c1]">BDT</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Boring & Construction Cost:</span>
                        <span className="font-mono font-bold text-white">৳ {results.constructionCost.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Cement Cost ({cementCost} ৳/bag):</span>
                        <span className="font-mono font-bold text-white">৳ {results.cementCostTotal.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Sand Cost ({sandCost} ৳/cft):</span>
                        <span className="font-mono font-bold text-white">৳ {results.sandCostTotal.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Aggregate Cost ({aggregateCost} ৳/cft):</span>
                        <span className="font-mono font-bold text-white">৳ {results.aggregateCostTotal.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#8ba3c1]">Steel Cost ({steelCost} ৳/kg):</span>
                        <span className="font-mono font-bold text-white">৳ {results.steelCostTotal.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="pt-2 border-t border-[#2d4a6a] flex justify-between items-center">
                        <span className="text-xs font-extrabold text-white">Total Combined Cost:</span>
                        <span className="text-base font-black font-mono text-[#2ecc71]">
                          ৳ {results.totalCost.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8ba3c1] text-right font-mono">
                        ≈ ৳ {Math.round(results.totalCost / pileNos).toLocaleString("en-IN")} / pile
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[#8ba3c1]">
                    Enter valid parameters to see real-time takeoff results.
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
