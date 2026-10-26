import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, SandPileInputs, SandPileResults } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import {
  RotateCcw,
  Cylinder,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Grid3X3,
  MapPin,
  Ruler,
} from "lucide-react";

interface SandPileCalculatorProps {
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

export const SandPileCalculator: React.FC<SandPileCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Sand Pile Foundation Estimation");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  // Inputs
  const [landArea, setLandArea] = useState<number>(2160); // 3 Katha = ~2160 sq ft
  const [pileDiameter, setPileDiameter] = useState<number>(10); // inches
  const [pileSpacing, setPileSpacing] = useState<number>(48); // inches
  const [pileLength, setPileLength] = useState<number>(20); // feet
  // Rates & Costs initialized from activeProject.rates or defaults
  const [costPerFoot, setCostPerFoot] = useState<number>(() => activeProject?.rates?.sandPileCostPerFt || 30); // TK / running foot
  const [costPerCft, setCostPerCft] = useState<number>(() => activeProject?.rates?.sandRate || 45); // TK / cft of sand
  const [compactionPct, setCompactionPct] = useState<number>(15); // 15% compaction & bulking allowance
  const [sandType, setSandType] = useState<string>("Sylhet Sand (FM 2.5)");

  useEffect(() => {
    if (activeProject?.rates) {
      if (activeProject.rates.sandPileCostPerFt) setCostPerFoot(activeProject.rates.sandPileCostPerFt);
      if (activeProject.rates.sandRate) setCostPerCft(activeProject.rates.sandRate);
    }
  }, [activeProject?.rates]);

  const [results, setResults] = useState<SandPileResults | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Calculate Sand Pile Quantities & Costs
  const calculate = (
    area = landArea,
    dia = pileDiameter,
    spacing = pileSpacing,
    length = pileLength,
    footRate = costPerFoot,
    sandRate = costPerCft,
    compPct = compactionPct
  ) => {
    if (area <= 0 || dia <= 0 || spacing <= 0 || length <= 0) {
      setResults(null);
      return;
    }

    // Number of piles based on center-to-center spacing
    const spacingFt = spacing / 12;
    const areaPerPile = spacingFt * spacingFt;
    const numPiles = Math.ceil(area / areaPerPile);

    // Volume of a single pile
    const radiusFt = (dia / 12) / 2;
    const volumePerPile = Math.PI * Math.pow(radiusFt, 2) * length;

    // Compaction factor (dynamic compaction increases required loose sand)
    const factor = 1 + compPct / 100;
    const totalVolume = Number((volumePerPile * numPiles * factor).toFixed(2));

    // Costs
    const totalSandCost = Math.round(totalVolume * sandRate);
    const totalPileCost = Math.round(numPiles * length * footRate);
    const totalCost = totalSandCost + totalPileCost;

    setResults({
      spacingFeet: Number(spacingFt.toFixed(2)),
      areaPerPile: Number(areaPerPile.toFixed(2)),
      numPiles,
      volumePerPile: Number(volumePerPile.toFixed(3)),
      totalVolume,
      totalSandCost,
      totalPileCost,
      totalCost,
    });
  };

  // Recalculate on input change
  useEffect(() => {
    calculate();
  }, [landArea, pileDiameter, pileSpacing, pileLength, costPerFoot, costPerCft, compactionPct]);

  // Load saved estimate
  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    if (est.type !== "sand_pile") return;
    setEditingEstimateId(est.id);
    setEstimateName(est.name || "Sand Pile Foundation");

    const d = est.data || {};
    if (d.landArea !== undefined) setLandArea(d.landArea);
    if (d.pileDiameter !== undefined) setPileDiameter(d.pileDiameter);
    if (d.pileSpacing !== undefined) setPileSpacing(d.pileSpacing);
    if (d.pileLength !== undefined) setPileLength(d.pileLength);
    if (d.costPerFoot !== undefined) setCostPerFoot(d.costPerFoot);
    if (d.costPerCft !== undefined) setCostPerCft(d.costPerCft);
    if (d.compactionPct !== undefined) setCompactionPct(d.compactionPct);
    if (d.sandType) setSandType(d.sandType);

    calculate(
      d.landArea || landArea,
      d.pileDiameter || pileDiameter,
      d.pileSpacing || pileSpacing,
      d.pileLength || pileLength,
      d.costPerFoot || costPerFoot,
      d.costPerCft || costPerCft,
      d.compactionPct !== undefined ? d.compactionPct : compactionPct
    );
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "sand_pile" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  const handleClearEstimate = () => {
    setEditingEstimateId(null);
    setEstimateName("Sand Pile Foundation Estimation");
    setLandArea(2160);
    setPileDiameter(10);
    setPileSpacing(48);
    setPileLength(20);
    setCostPerFoot(30);
    setCostPerCft(45);
    setCompactionPct(15);
    if (onClearLoadedEstimate) onClearLoadedEstimate();
  };

  const handleSaveToProject = async (asCopy = false) => {
    if (!results) return;
    const saveId = asCopy || !editingEstimateId ? undefined : editingEstimateId;
    const finalName = asCopy ? `${estimateName} (Copy)` : estimateName;

    const payload = {
      id: saveId,
      type: "sand_pile",
      name: finalName,
      totalCost: results.totalCost,
      summary: {
        numPiles: results.numPiles,
        pileLength,
        pileDiameter,
        pileSpacing,
        sandCft: results.totalVolume,
        totalSandCost: results.totalSandCost,
        totalPileCost: results.totalPileCost,
        totalCost: results.totalCost,
        costPerFoot,
        costPerCft,
      },
      data: {
        landArea,
        pileDiameter,
        pileSpacing,
        pileLength,
        costPerFoot,
        costPerCft,
        compactionPct,
        sandType,
      },
    };

    await onSaveEstimate(payload);
    setSuccessMsg(asCopy ? "✓ Saved as new copy!" : "✓ Saved to project successfully!");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Land area presets in Katha / Decimal
  const applyPreset = (sqft: number) => {
    setLandArea(sqft);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="sand_pile"
        typeLabel="Sand Pile"
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
            landArea,
            pileDiameter,
            pileSpacing,
            pileLength,
            costPerFoot,
            costPerCft,
            compactionPct,
            sandType,
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data) {
            const d = payload.data;
            if (d.landArea) setLandArea(d.landArea);
            if (d.pileDiameter) setPileDiameter(d.pileDiameter);
            if (d.pileSpacing) setPileSpacing(d.pileSpacing);
            if (d.pileLength) setPileLength(d.pileLength);
            if (d.costPerFoot) setCostPerFoot(d.costPerFoot);
            if (d.costPerCft) setCostPerCft(d.costPerCft);
            if (d.compactionPct !== undefined) setCompactionPct(d.compactionPct);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Header Banner */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded font-semibold border border-[#f5a623]/40 flex items-center gap-1.5">
                  <Cylinder className="w-3.5 h-3.5" />
                  Ground Improvement
                </span>
                <span className="text-xs bg-[#00c2c7]/20 text-[#00c2c7] px-2 py-0.5 rounded font-semibold border border-[#00c2c7]/40">
                  Sand Compaction Pile (SCP)
                </span>
                <span className="text-xs bg-[#38bdf8]/20 text-[#38bdf8] px-2 py-0.5 rounded font-semibold border border-[#38bdf8]/40">
                  Foundation (Used Once · No Storey Mult)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Sand Pile Cost & Material Calculator
              </h2>
              <p className="text-xs text-[#8ba3c1] mt-0.5">
                Calculate total number of sand compaction piles, compacted sand volume in CFT, boring costs and total foundation expenses.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearEstimate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a2b42] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border border-[#2d4a6a] transition shrink-0"
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

          {/* Quick Land Area Presets */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#8ba3c1] font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#00c2c7]" />
              Quick Area Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(1440)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                landArea === 1440
                  ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold"
                  : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
            >
              2 Katha (1,440 sq.ft)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(2160)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                landArea === 2160
                  ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold"
                  : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
            >
              3 Katha (2,160 sq.ft)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(3600)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                landArea === 3600
                  ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold"
                  : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
            >
              5 Katha (3,600 sq.ft)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7200)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                landArea === 7200
                  ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold"
                  : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
            >
              10 Katha (7,200 sq.ft)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(4356)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                landArea === 4356
                  ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold"
                  : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
            >
              10 Decimal (4,356 sq.ft)
            </button>
          </div>

          {/* Main Grid: Inputs & Visual / Results */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Form Inputs (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2d4a6a] pb-2">
                  <Ruler className="w-4 h-4 text-[#00c2c7]" />
                  Geometric & Boring Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Land Area */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Land Area (square feet) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={landArea}
                        onChange={(v) => setLandArea(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 2160"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        sq.ft
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8ba3c1] mt-0.5 block">
                      ≈ {(landArea / 720).toFixed(2)} Katha / {(landArea / 435.6).toFixed(2)} Decimal
                    </span>
                  </div>

                  {/* Pile Diameter */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Diameter of Pile (inches) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={pileDiameter}
                        onChange={(v) => setPileDiameter(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 10"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        inches
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8ba3c1] mt-0.5 block">
                      Radius = {((pileDiameter / 12) / 2).toFixed(3)} ft
                    </span>
                  </div>

                  {/* Pile Spacing */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Center Spacing of Pile (inches) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={pileSpacing}
                        onChange={(v) => setPileSpacing(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 48"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        inches
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8ba3c1] mt-0.5 block">
                      = {(pileSpacing / 12).toFixed(2)} ft c/c ({((pileSpacing / 12) * (pileSpacing / 12)).toFixed(2)} sq.ft/pile)
                    </span>
                  </div>

                  {/* Pile Length */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Length / Depth of Pile (feet) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={pileLength}
                        onChange={(v) => setPileLength(Math.max(1, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 20"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        feet
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8ba3c1] mt-0.5 block">
                      = {(pileLength * 0.3048).toFixed(2)} meters
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2d4a6a] pt-2 pb-2">
                  <DollarSign className="w-4 h-4 text-[#2ecc71]" />
                  Rates & Sand Material Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Cost per Running Foot */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Boring Cost (TK per running foot) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={costPerFoot}
                        onChange={(v) => setCostPerFoot(Math.max(0, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 30"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        TK/ft
                      </span>
                    </div>
                  </div>

                  {/* Cost per CFT of Sand */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Sand Cost (TK per CFT) <span className="text-[#00c2c7]">*</span>
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={costPerCft}
                        onChange={(v) => setCostPerCft(Math.max(0, v))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 45"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        TK/cft
                      </span>
                    </div>
                  </div>

                  {/* Compaction allowance */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Compaction Allowance (%)
                    </label>
                    <div className="relative">
                      <NumericInput
                        value={compactionPct}
                        onChange={(v) => setCompactionPct(Math.max(0, Math.min(50, v)))}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                        placeholder="e.g. 15"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#8ba3c1] font-mono">
                        % extra
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8ba3c1] mt-0.5 block">
                      {compactionPct > 0 ? `×${(1 + compactionPct / 100).toFixed(2)} dynamic compaction volume` : "Standard nominal volume"}
                    </span>
                  </div>

                  {/* Sand Type */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      Sand Quality / FM Grade
                    </label>
                    <select
                      value={sandType}
                      onChange={(e) => setSandType(e.target.value)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Sylhet Sand (FM 2.5)">Sylhet Coarse Sand (FM 2.5 - Recommended)</option>
                      <option value="Medium Local Sand (FM 1.8)">Medium Local Sand (FM 1.8)</option>
                      <option value="Fine Local Sand (FM 1.2)">Fine Sand (FM 1.2)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Formula & Engineering Reference Box */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3.5 text-xs text-[#8ba3c1] space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-bold text-[11px]">
                  <Info className="w-3.5 h-3.5 text-[#00c2c7]" />
                  BNBC / Geotechnical Design Principle
                </div>
                <p className="text-[11px] leading-relaxed">
                  • <strong>Number of Piles:</strong> <code className="text-[#00c2c7]">N = ceil(Land Area / (Spacing × Spacing))</code>
                </p>
                <p className="text-[11px] leading-relaxed">
                  • <strong>Single Pile Volume:</strong> <code className="text-[#00c2c7]">V = π × r² × Length</code> where <code className="text-[#00c2c7]">r = (dia / 12) / 2</code>
                </p>
                <p className="text-[11px] leading-relaxed">
                  • Sand compaction piles enhance bearing capacity and mitigate liquefaction in loose silt/clay soils.
                </p>
              </div>
            </div>

            {/* Right Column: Visual Diagram & Results Breakdown (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Interactive Cross-Section & Pile Visualizer */}
              <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Grid3X3 className="w-4 h-4 text-[#00c2c7]" />
                    Pile Section & Grid Profile
                  </h4>
                  <span className="text-[10px] font-mono text-[#00c2c7] bg-[#00c2c7]/10 px-2 py-0.5 rounded border border-[#00c2c7]/30">
                    {pileDiameter}"ø × {pileLength}ft
                  </span>
                </div>

                {/* SVG Visualizer (Clean Light Shape) */}
                <div className="bg-white border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <svg width="220" height="150" viewBox="0 0 220 150" className="overflow-visible">
                    {/* Ground line */}
                    <line x1="10" y1="20" x2="210" y2="20" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                    <text x="110" y="14" fill="#0f172a" fontSize="9.5" textAnchor="middle" fontWeight="bold">Existing Ground Level (EGL)</text>

                    {/* Pile 1 - Light Golden Sand Fill */}
                    <rect x="40" y="20" width="30" height="110" fill="#fef3c7" rx="3" stroke="#d97706" strokeWidth="2" />
                    {/* Sand dots texture */}
                    <circle cx="50" cy="35" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="60" cy="45" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="48" cy="70" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="58" cy="90" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="52" cy="115" r="1.5" fill="#b45309" opacity="0.7" />

                    {/* Spacing Dimension between Piles */}
                    <line x1="55" y1="135" x2="165" y2="135" stroke="#0284c7" strokeWidth="1.5" />
                    <line x1="55" y1="130" x2="55" y2="140" stroke="#0284c7" strokeWidth="1.5" />
                    <line x1="165" y1="130" x2="165" y2="140" stroke="#0284c7" strokeWidth="1.5" />
                    <text x="110" y="147" fill="#0284c7" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                      Spacing: {pileSpacing}" c/c
                    </text>

                    {/* Pile 2 - Light Golden Sand Fill */}
                    <rect x="150" y="20" width="30" height="110" fill="#fef3c7" rx="3" stroke="#d97706" strokeWidth="2" />
                    <circle cx="160" cy="40" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="170" cy="65" r="1.5" fill="#b45309" opacity="0.7" />
                    <circle cx="158" cy="95" r="1.5" fill="#b45309" opacity="0.7" />

                    {/* Depth label */}
                    <line x1="195" y1="20" x2="195" y2="130" stroke="#475569" strokeWidth="1.5" />
                    <line x1="190" y1="20" x2="200" y2="20" stroke="#475569" strokeWidth="1.5" />
                    <line x1="190" y1="130" x2="200" y2="130" stroke="#475569" strokeWidth="1.5" />
                    <text x="203" y="75" fill="#0f172a" fontSize="9.5" fontWeight="bold" alignmentBaseline="middle">
                      {pileLength}'
                    </text>
                  </svg>
                  <div className="text-[10px] text-slate-700 text-center mt-1">
                    Compacted Sand Core • Pile Diameter: <strong className="text-slate-900">{pileDiameter} inches</strong>
                  </div>
                </div>

                {/* Results Card */}
                {results ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#1a2b42] p-2.5 rounded-xl border border-[#2d4a6a]">
                        <span className="text-[10px] text-[#8ba3c1] block uppercase font-bold">Total Piles</span>
                        <div className="text-xl font-black font-mono text-[#00c2c7]">
                          {results.numPiles} <span className="text-xs font-normal text-[#8ba3c1]">Nos</span>
                        </div>
                        <span className="text-[9px] text-[#8ba3c1]">
                          @ {results.areaPerPile} sq.ft/pile
                        </span>
                      </div>

                      <div className="bg-[#1a2b42] p-2.5 rounded-xl border border-[#2d4a6a]">
                        <span className="text-[10px] text-[#8ba3c1] block uppercase font-bold">Total Sand Volume</span>
                        <div className="text-xl font-black font-mono text-[#f5a623]">
                          {results.totalVolume.toLocaleString()} <span className="text-xs font-normal text-[#8ba3c1]">CFT</span>
                        </div>
                        <span className="text-[9px] text-[#8ba3c1]">
                          {results.volumePerPile} cft/pile
                        </span>
                      </div>
                    </div>

                    {/* Cost Breakdown Box */}
                    <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold text-white border-b border-[#2d4a6a] pb-1.5 flex items-center justify-between">
                        <span>Cost Breakdown</span>
                        <span className="text-[10px] text-[#8ba3c1]">Bangladesh Taka</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#8ba3c1]">Sand Material Cost ({costPerCft} ৳/cft):</span>
                        <span className="font-mono font-bold text-white">৳ {results.totalSandCost.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#8ba3c1]">Pile Boring & Installation ({costPerFoot} ৳/ft):</span>
                        <span className="font-mono font-bold text-white">৳ {results.totalPileCost.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="pt-2 border-t border-[#2d4a6a] flex justify-between items-center">
                        <span className="text-xs font-extrabold text-white">Total Combined Cost:</span>
                        <span className="text-base font-black font-mono text-[#2ecc71]">
                          ৳ {results.totalCost.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8ba3c1] text-right font-mono">
                        ≈ ৳ {Math.round(results.totalCost / results.numPiles).toLocaleString("en-IN")} / pile
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
