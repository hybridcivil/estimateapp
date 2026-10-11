import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import { Plus, Minus, Trash2, RotateCcw, Calculator, Copy, Edit3, Check, X, Layers } from "lucide-react";

interface BeamItem {
  nos: number;
  name: string;
  width: number;
  depth: number;
  length: number;
  stirrupSpacing: number;
  mix: string;
  mainBars: { dia: number; qty: number }[];
  extraTopBars: { nos: number; dia: number; length: number };
  extraBottomBars: { nos: number; dia: number; length: number };
}

interface BeamCalculatorProps {
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

export const BeamCalculator: React.FC<BeamCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Beam Estimate");
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

  const [beams, setBeams] = useState<BeamItem[]>([
    {
      nos: 1,
      name: "B1",
      width: 12,
      depth: 18,
      length: 20,
      stirrupSpacing: 6,
      mix: "1:1.5:3",
      mainBars: [{ dia: 16, qty: 2 }],
      extraTopBars: { nos: 2, dia: 16, length: 6.67 },
      extraBottomBars: { nos: 2, dia: 16, length: 10 },
    },
  ]);

  // Form Inputs - starts ready for adding next beam (or click Edit on B1)
  const [beamName, setBeamName] = useState("B2");
  const [mixRatio, setMixRatio] = useState("1:1.5:3");
  const [numberOfBeams, setNumberOfBeams] = useState(1);
  const [beamWidth, setBeamWidth] = useState(12);
  const [beamDepth, setBeamDepth] = useState(18);
  const [beamLength, setBeamLength] = useState(20);
  const [stirrupSpacing, setStirrupSpacing] = useState(6);

  // Main rebar rows
  const [mainRebars, setMainRebars] = useState<{ dia: number; qty: number }[]>([
    { dia: 16, qty: 2 },
  ]);

  // Extra bars
  const [extraTopNos, setExtraTopNos] = useState(2);
  const [extraTopDia, setExtraTopDia] = useState(16);
  const [extraTopLength, setExtraTopLength] = useState(6.67);

  const [extraBottomNos, setExtraBottomNos] = useState(2);
  const [extraBottomDia, setExtraBottomDia] = useState(16);
  const [extraBottomLength, setExtraBottomLength] = useState(10);

  // Base type
  const [baseType, setBaseType] = useState<"none" | "picket">("none");
  const [brickRate, setBrickRate] = useState(15);
  const [bricksPerCft, setBricksPerCft] = useState(10);

  // Rates
  const [cementRate, setCementRate] = useState(550);
  const [sandRate, setSandRate] = useState(45);
  const [aggRate, setAggRate] = useState(120);
  const [steelRate, setSteelRate] = useState(95);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);
  const [editingBeamIndex, setEditingBeamIndex] = useState<number | null>(null);

  // Auto-update lengths when beam length changes
  useEffect(() => {
    if (beamLength > 0) {
      setExtraTopLength(Number((beamLength / 3).toFixed(2)));
      setExtraBottomLength(Number((beamLength / 2).toFixed(2)));
    }
  }, [beamLength]);

  const addRebarRow = () => {
    setMainRebars([...mainRebars, { dia: 16, qty: 2 }]);
  };

  const delRebarRow = (index: number) => {
    if (mainRebars.length > 1) {
      setMainRebars(mainRebars.filter((_, i) => i !== index));
    }
  };

  const getCurrentFormBeam = (): BeamItem => {
    const validRebars = mainRebars.filter((r) => r.dia > 0 && r.qty > 0);
    return {
      nos: Math.max(1, numberOfBeams),
      name: beamName.trim() || `B${beams.length + 1}`,
      width: beamWidth,
      depth: beamDepth,
      length: beamLength,
      stirrupSpacing,
      mix: mixRatio,
      mainBars: validRebars.length > 0 ? validRebars : [{ dia: 16, qty: 2 }],
      extraTopBars: { nos: extraTopNos, dia: extraTopDia, length: extraTopLength },
      extraBottomBars: { nos: extraBottomNos, dia: extraBottomDia, length: extraBottomLength },
    };
  };

  const loadBeamIntoForm = (b: BeamItem, idx: number) => {
    setEditingBeamIndex(idx);
    setBeamName(b.name);
    setNumberOfBeams(b.nos);
    setBeamWidth(b.width);
    setBeamDepth(b.depth);
    setBeamLength(b.length);
    setStirrupSpacing(b.stirrupSpacing);
    setMixRatio(b.mix || "1:1.5:3");
    if (Array.isArray(b.mainBars) && b.mainBars.length > 0) {
      setMainRebars(b.mainBars);
    }
    if (b.extraTopBars) {
      setExtraTopNos(b.extraTopBars.nos || 0);
      setExtraTopDia(b.extraTopBars.dia || 16);
      setExtraTopLength(b.extraTopBars.length || Number((b.length / 3).toFixed(2)));
    }
    if (b.extraBottomBars) {
      setExtraBottomNos(b.extraBottomBars.nos || 0);
      setExtraBottomDia(b.extraBottomBars.dia || 16);
      setExtraBottomLength(b.extraBottomBars.length || Number((b.length / 2).toFixed(2)));
    }
    setErrorMsg("");
  };

  // 1. Add current form as a brand new beam to the list
  const handleAddNewBeam = () => {
    setErrorMsg("");
    if (beamWidth <= 0 || beamDepth <= 0 || beamLength <= 0 || stirrupSpacing <= 0) {
      setErrorMsg("Please enter valid beam dimensions (Width, Depth, Length, Spacing > 0).");
      return;
    }
    const current = getCurrentFormBeam();
    const nextBeams = [...beams, current];
    setBeams(nextBeams);
    calculate(nextBeams);

    // Switch to clean state ready for next beam
    setEditingBeamIndex(null);
    setBeamName(`B${nextBeams.length + 1}`);
    setNumberOfBeams(1);
    setSuccessMsg(`✓ Added ${current.name} to beam list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // 2. Update existing beam at editingBeamIndex
  const handleUpdateBeam = () => {
    setErrorMsg("");
    if (editingBeamIndex === null || editingBeamIndex < 0 || editingBeamIndex >= beams.length) {
      handleAddNewBeam();
      return;
    }
    if (beamWidth <= 0 || beamDepth <= 0 || beamLength <= 0 || stirrupSpacing <= 0) {
      setErrorMsg("Please enter valid beam dimensions.");
      return;
    }
    const current = getCurrentFormBeam();
    const nextBeams = [...beams];
    nextBeams[editingBeamIndex] = current;
    setBeams(nextBeams);
    calculate(nextBeams);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // 3. Switch from edit mode to Add New mode
  const handleStartNewBeam = () => {
    setEditingBeamIndex(null);
    setBeamName(`B${beams.length + 1}`);
    setNumberOfBeams(1);
    setErrorMsg("");
  };

  // 4. Duplicate an existing beam in the list
  const handleDuplicateBeam = (index: number) => {
    const original = beams[index];
    if (!original) return;
    const duplicated: BeamItem = {
      ...original,
      name: `${original.name} (Copy)`,
    };
    const nextBeams = [...beams, duplicated];
    setBeams(nextBeams);
    calculate(nextBeams);
    setSuccessMsg(`✓ Duplicated ${original.name} as ${duplicated.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // 5. Reset form inputs (WITHOUT deleting the beams list!)
  const handleResetFormFields = () => {
    setEditingBeamIndex(null);
    setBeamName(`B${beams.length + 1}`);
    setNumberOfBeams(1);
    setBeamWidth(12);
    setBeamDepth(18);
    setBeamLength(20);
    setStirrupSpacing(6);
    setMixRatio("1:1.5:3");
    setMainRebars([{ dia: 16, qty: 2 }]);
    setExtraTopNos(2);
    setExtraTopDia(16);
    setExtraTopLength(6.67);
    setExtraBottomNos(2);
    setExtraBottomDia(16);
    setExtraBottomLength(10);
    setErrorMsg("");
  };

  // 6. Delete single beam
  const deleteBeam = (index: number) => {
    const nextBeams = beams.filter((_, i) => i !== index);
    setBeams(nextBeams);
    if (nextBeams.length > 0) {
      calculate(nextBeams);
      if (editingBeamIndex === index) {
        setEditingBeamIndex(null);
        setBeamName(`B${nextBeams.length + 1}`);
      } else if (editingBeamIndex !== null && editingBeamIndex > index) {
        setEditingBeamIndex(editingBeamIndex - 1);
      }
    } else {
      setEditingBeamIndex(null);
      setBeamName("B1");
      setResults(null);
    }
  };

  // 7. Clear all beams from list with confirmation
  const handleClearAllBeams = () => {
    if (beams.length === 0) return;
    if (window.confirm("Remove all beams from the current list?")) {
      setBeams([]);
      setEditingBeamIndex(null);
      setBeamName("B1");
      setResults(null);
    }
  };

  const calculate = (list = beams) => {
    setErrorMsg("");
    if (list.length === 0) {
      setResults(null);
      return null;
    }

    const isPicket = baseType === "picket";
    const COVER_IN = 1.5;

    const mixVolumes: Record<string, number> = {};
    const steel: Record<number, number> = {};
    let totalWetVol = 0;
    let totalWastageVol = 0;

    list.forEach((b) => {
      const wetVol = (b.width / 12) * (b.depth / 12) * b.length * b.nos;
      const wastageVol = wetVol * 0.05;
      const wetWithWastage = wetVol + wastageVol;
      const dryVol = wetWithWastage * 1.54;

      totalWetVol += wetVol;
      totalWastageVol += wastageVol;

      const mixKey = b.mix || "1:1.5:3";
      mixVolumes[mixKey] = (mixVolumes[mixKey] || 0) + dryVol;

      // Main bars (5% wastage)
      b.mainBars.forEach((r) => {
        const w = ((r.qty * b.length * r.dia * r.dia) / 533) * b.nos * 1.05;
        if (Number.isFinite(w) && w > 0) steel[r.dia] = (steel[r.dia] || 0) + w;
      });

      // Extra top (3% wastage)
      const et = b.extraTopBars;
      if (et.nos > 0 && et.dia > 0 && et.length > 0) {
        const wTop = ((et.nos * 2 * et.length * et.dia * et.dia) / 533) * b.nos * 1.03;
        if (Number.isFinite(wTop) && wTop > 0) steel[et.dia] = (steel[et.dia] || 0) + wTop;
      }

      // Extra bottom (3% wastage)
      const eb = b.extraBottomBars;
      if (eb.nos > 0 && eb.dia > 0 && eb.length > 0) {
        const wBot = ((eb.nos * eb.length * eb.dia * eb.dia) / 533) * b.nos * 1.03;
        if (Number.isFinite(wBot) && wBot > 0) steel[eb.dia] = (steel[eb.dia] || 0) + wBot;
      }

      // Stirrups (3% wastage)
      const stirrupLenIn = 2 * (b.width - 2 * COVER_IN) + 2 * (b.depth - 2 * COVER_IN) + 6;
      const nStirrup = Math.ceil((b.length * 12) / b.stirrupSpacing) * b.nos;
      const stWeight = nStirrup * (stirrupLenIn / 12) * ((10 * 10) / 533) * 1.03;
      if (Number.isFinite(stWeight) && stWeight > 0) steel[10] = (steel[10] || 0) + stWeight;
    });

    let totalDryVol = 0;
    let cementBags = 0;
    let sandCft = 0;
    let aggCft = 0;

    Object.keys(mixVolumes).forEach((mix) => {
      const dryVol = mixVolumes[mix];
      totalDryVol += dryVol;
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

    let totalSteelKg = 0;
    Object.keys(steel).forEach((d) => {
      totalSteelKg += steel[Number(d)];
    });

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
    const steelCost = totalSteelKg * steelRate;
    const singleFloorTotalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    // Multi-storey multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    const totalBeamsCount = list.reduce((sum, b) => sum + b.nos, 0);

    const calcResult = {
      cementBags: isMultiplying ? Math.ceil(cementBags * effMultiplier) : cementBags,
      sandCft: Number(((isMultiplying ? sandCft * effMultiplier : sandCft)).toFixed(1)),
      aggCft: Number(((isMultiplying ? aggCft * effMultiplier : aggCft)).toFixed(1)),
      brickQty: isMultiplying ? brickQty * effMultiplier : brickQty,
      useAggregate,
      totalSteelKg: Number(((isMultiplying ? totalSteelKg * effMultiplier : totalSteelKg)).toFixed(1)),
      steelBreakdown: isMultiplying
        ? Object.fromEntries(Object.entries(steel).map(([d, w]) => [d, Number((w * effMultiplier).toFixed(1))]))
        : steel,
      totalWetVol: Number(((isMultiplying ? totalWetVol * effMultiplier : totalWetVol)).toFixed(2)),
      totalWastageVol: Number(((isMultiplying ? totalWastageVol * effMultiplier : totalWastageVol)).toFixed(2)),
      totalDryVol: Number(((isMultiplying ? totalDryVol * effMultiplier : totalDryVol)).toFixed(2)),
      totalBeamsCount: isMultiplying ? totalBeamsCount * effMultiplier : totalBeamsCount,
      singleFloorBeamsCount: totalBeamsCount,
      // Single floor breakdown
      singleFloorCementBags: cementBags,
      singleFloorSandCft: Number(sandCft.toFixed(1)),
      singleFloorAggCft: Number(aggCft.toFixed(1)),
      singleFloorSteelKg: Number(totalSteelKg.toFixed(1)),
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      singleFloorTotalCost,
      multiplier: effMultiplier,
      isMultiplying,
      totalCost: multipliedCost,
      multipliedCementBags: Math.ceil(cementBags * effMultiplier),
      multipliedSandCft: Number((sandCft * effMultiplier).toFixed(1)),
      multipliedAggCft: Number((aggCft * effMultiplier).toFixed(1)),
      multipliedSteelKg: Number((totalSteelKg * effMultiplier).toFixed(1)),
      multipliedBricks: brickQty * effMultiplier,
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(beams);
  }, [multiplier, isMultiplying, cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft, baseType]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentBeams = [...beams];
    const formBeam = getCurrentFormBeam();
    if (editingBeamIndex !== null && editingBeamIndex >= 0 && editingBeamIndex < currentBeams.length) {
      currentBeams[editingBeamIndex] = formBeam;
    } else if (currentBeams.length === 0) {
      currentBeams = [formBeam];
    }
    setBeams(currentBeams);
    const boq = calculate(currentBeams);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : (editingEstimateId || undefined),
      type: "beam",
      name: asNewCopy ? `${estimateName} (Copy)` : estimateName,
      totalCost: boq.totalCost || 0,
      summary: boq,
      data: {
        beams: currentBeams,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleSaveAsCopy = async () => {
    await handleSaveToProject(true);
  };

  const handleClearEstimate = () => {
    setEditingEstimateId(null);
    setEstimateName("New Beam Estimate");
    setBeams([]);
    handleResetFormFields();
    setResults(null);
    if (onClearLoadedEstimate) onClearLoadedEstimate();
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.beams && est.data.beams.length > 0) {
      setBeams(est.data.beams);
      setEditingBeamIndex(null);
      setBeamName(`B${est.data.beams.length + 1}`);
      if (est.data.rates) {
        setCementRate(est.data.rates.cementRate || 550);
        setSandRate(est.data.rates.sandRate || 45);
        setAggRate(est.data.rates.aggRate || 120);
        setSteelRate(est.data.rates.steelRate || 95);
      }
      if (est.data.baseType) setBaseType(est.data.baseType);
      if (est.data.multiplier) setMultiplier(est.data.multiplier);
      if (est.data.isMultiplying !== undefined) setIsMultiplying(Boolean(est.data.isMultiplying));
      calculate(est.data.beams);
    }
  };

  // Auto-sync when loadedEstimate prop is passed from outside
  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "beam" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="beam"
        typeLabel="Beam"
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
            beams,
            baseType,
            rates: { cementRate, sandRate, aggRate, steelRate },
            multiplier,
            isMultiplying,
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.beams) {
            setBeams(payload.data.beams);
            calculate(payload.data.beams);
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
            itemTypeLabel="Beams"
          />

          {/* Active Mode Banner: Editing vs Add New */}
          {editingBeamIndex !== null ? (
            <div className="bg-[#1a2b42] border border-[#00c2c7]/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00c2c7] animate-pulse" />
                <span className="text-white font-bold">
                  Editing: <span className="text-[#00c2c7]">{beamName}</span>{" "}
                  <span className="text-[#8ba3c1] font-normal text-[11px]">
                    (Item #{editingBeamIndex + 1} of {beams.length})
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartNewBeam}
                className="text-[11px] bg-[#243b55] hover:bg-[#2d4a6a] text-[#00c2c7] hover:text-white px-2.5 py-1 rounded-lg border border-[#00c2c7]/40 flex items-center gap-1 font-semibold transition"
                title="Switch back to creating a new beam"
              >
                <Plus className="w-3 h-3" />
                <span>+ Create New</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-[#8ba3c1]">
                Mode: <strong className="text-[#00c2c7]">Creating New Beam</strong> (B{beams.length + 1})
              </span>
              <span className="text-[10px] text-[#8ba3c1]">
                {beams.length} beam{beams.length !== 1 ? "s" : ""} in list
              </span>
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-2 gap-2 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Beam Name</label>
              <input
                type="text"
                value={beamName}
                onChange={(e) => setBeamName(e.target.value)}
                placeholder="e.g. B1"
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white focus:border-[#00c2c7] outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos of Beams</label>
              <NumericInput
                value={numberOfBeams}
                min="1"
                onChange={(v) => setNumberOfBeams(Math.max(1, v))}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white focus:border-[#00c2c7] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
              <select
                value={mixRatio}
                onChange={(e) => setMixRatio(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white focus:border-[#00c2c7] outline-none"
              >
                <option value="1:1.5:3">1 : 1.5 : 3 (M20 Standard)</option>
                <option value="1:2:4">1 : 2 : 4 (M15)</option>
              </select>
            </div>

            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Beam Dimensions
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (in)</label>
              <NumericInput
                value={beamWidth}
                step="0.5"
                onChange={setBeamWidth}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Depth (in)</label>
              <NumericInput
                value={beamDepth}
                step="0.5"
                onChange={setBeamDepth}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
              <NumericInput
                value={beamLength}
                step="0.1"
                onChange={setBeamLength}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Stirrup Spacing (in)</label>
              <NumericInput
                value={stirrupSpacing}
                step="0.5"
                onChange={setStirrupSpacing}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            {/* Main Rebar Rows */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1 flex justify-between items-center">
              <span>Main Rebar</span>
              <button
                type="button"
                onClick={addRebarRow}
                className="text-[10px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-2 py-0.5 rounded"
              >
                + Add Bar Row
              </button>
            </div>

            <div className="col-span-2 space-y-1.5">
              {mainRebars.map((bar, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <NumericInput
                      value={bar.dia}
                      placeholder="Ø mm"
                      onChange={(v) => {
                        const next = [...mainRebars];
                        next[idx].dia = v;
                        setMainRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <NumericInput
                      value={bar.qty}
                      placeholder="Nos"
                      onChange={(v) => {
                        const next = [...mainRebars];
                        next[idx].qty = Math.round(v);
                        setMainRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                    />
                  </div>
                  {mainRebars.length > 1 && (
                    <button
                      type="button"
                      onClick={() => delRebarRow(idx)}
                      className="w-8 h-8 bg-[#ff4d6d] hover:bg-[#ff4d6d]/80 text-white rounded flex items-center justify-center font-bold text-sm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Extra Top Bars */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Extra Top Bars @ Supports (L/3)
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos (per support)</label>
              <NumericInput
                value={extraTopNos}
                allowZero={true}
                onChange={setExtraTopNos}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dia (mm)</label>
              <NumericInput
                value={extraTopDia}
                onChange={setExtraTopDia}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft) — auto = L/3</label>
              <NumericInput
                value={extraTopLength}
                step="0.01"
                onChange={setExtraTopLength}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            {/* Extra Bottom Bars */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Extra Bottom Bars @ Mid-Span (L/2)
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos</label>
              <NumericInput
                value={extraBottomNos}
                allowZero={true}
                onChange={setExtraBottomNos}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dia (mm)</label>
              <NumericInput
                value={extraBottomDia}
                onChange={setExtraBottomDia}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft) — auto = L/2</label>
              <NumericInput
                value={extraBottomLength}
                step="0.01"
                onChange={setExtraBottomLength}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            {/* Base / Filling Type */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Base / Aggregate Option
            </div>
            <div className="col-span-2">
              <select
                value={baseType}
                onChange={(e) => setBaseType(e.target.value as any)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value="none">Stone Aggregate</option>
                <option value="picket">Picket Brick (Brick Chips)</option>
              </select>
            </div>

            {baseType === "picket" && (
              <>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Picket Rate (৳/pcs)</label>
                  <NumericInput
                    value={brickRate}
                    onChange={setBrickRate}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Pcs per cft</label>
                  <NumericInput
                    value={bricksPerCft}
                    onChange={setBricksPerCft}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-2 bg-[#00c2c7]/10 border-l-2 border-[#00c2c7] p-2 rounded text-[11px] text-[#8ba3c1]">
                  <b className="text-[#00c2c7]">১০ পিকেট = ১ cft ব্রিক চিপস</b> — Aggregate-এর বিকল্প (১০% wastage সহ)।
                </div>
              </>
            )}

            {/* Material Rates */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Material Rates (৳ BDT)
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

            {/* Form Buttons */}
            <div className="col-span-2 flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleResetFormFields}
                className="flex-1 h-9 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset input fields"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              {editingBeamIndex !== null && editingBeamIndex < beams.length ? (
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateBeam}
                    className="flex-1 h-9 bg-[#2ecc71] hover:bg-[#27ae60] text-[#0f1c2e] font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Update Beam in List
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewBeam}
                    className="px-3 h-9 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center cursor-pointer"
                    title="Cancel editing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNewBeam}
                  className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Beam to List</span>
                </button>
              )}
            </div>
          </div>

          {/* Added Beams List */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <div className="flex items-center gap-2">
                <span>Added Beams</span>
                <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                  {beams.length} items
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleStartNewBeam}
                  className="text-[10px] bg-[#00c2c7]/20 hover:bg-[#00c2c7]/30 text-[#00c2c7] border border-[#00c2c7]/40 px-2 py-0.5 rounded font-bold transition flex items-center gap-1"
                  title="Switch form to enter a new beam"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New</span>
                </button>
                {beams.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllBeams}
                    className="text-[10px] text-[#ff4d6d] hover:bg-[#ff4d6d]/15 border border-[#ff4d6d]/30 px-2 py-0.5 rounded transition font-semibold"
                    title="Remove all beams from current list"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {beams.length === 0 ? (
              <div className="text-center py-5 text-xs text-[#8ba3c1]">
                No beams in list. Enter dimensions above and click <strong className="text-[#00c2c7]">"+ Add Beam to List"</strong>.
              </div>
            ) : (
              <div className="space-y-1.5">
                {beams.map((b, idx) => {
                  const isBeingEdited = editingBeamIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/15 border-[#00c2c7] shadow-sm ring-1 ring-[#00c2c7]/40"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/50"
                      }`}
                      onClick={() => loadBeamIntoForm(b, idx)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {b.nos} × {b.name}
                          </span>
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8ba3c1] truncate mt-0.5">
                          {b.width}"×{b.depth}"×{b.length}ft · {b.mainBars.map((r) => `${r.qty}Ø${r.dia}`).join(", ")} · Stirrup 10mm@{b.stirrupSpacing}"
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => loadBeamIntoForm(b, idx)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit this beam in form"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateBeam(idx)}
                          className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a]"
                          title="Duplicate this beam"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBeam(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition"
                          title="Delete beam from list"
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

          {/* Results Summary Box */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-2">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.totalBeamsCount} Total Beams
                </span>
              </div>

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
                    {isMultiplying ? results.multipliedSandCft : results.sandCft} cft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.sandCft} cft / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">
                    {results.useAggregate ? "Aggregate" : "Picket Brick"}
                  </div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.useAggregate
                      ? `${isMultiplying ? results.multipliedAggCft : results.aggCft} cft`
                      : `${isMultiplying ? results.multipliedBricks : results.brickQty} pcs`}
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.useAggregate ? `${results.aggCft} cft` : `${results.brickQty} pcs`} / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Steel</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {isMultiplying ? results.multipliedSteelKg : results.totalSteelKg} kg
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalSteelKg} kg / floor)
                    </div>
                  )}
                </div>
              </div>

              {/* Steel breakdown */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
                {Object.keys(results.steelBreakdown)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((dia) => (
                    <div key={dia} className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                      <div className="text-[9px] text-[#8ba3c1]">
                        {dia === 10 ? "Stirrup 10mm" : `${dia}mm Rebar`}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {results.steelBreakdown[dia].toFixed(1)} kg
                      </div>
                    </div>
                  ))}
              </div>

              {/* Volume metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Wet Volume</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.totalWetVol} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">+5% Wastage</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.totalWastageVol} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Dry Vol (×1.54)</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.totalDryVol} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Steel Cost</div>
                  <div className="text-xs font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.steelCost).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-[#a3e4bd] uppercase font-bold tracking-wider">
                    {isMultiplying
                      ? `Full Building Beam Budget (×${multiplier} Storeys)`
                      : "Typical Floor Beam Budget"}
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#2ecc71]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isMultiplying && (
                    <div className="text-right sm:border-r sm:border-[#2ecc71]/30 sm:pr-3">
                      <div className="text-[10px] text-[#8ba3c1]">Per Typical Floor</div>
                      <div className="text-xs font-bold text-white">
                        ৳ {Math.round(results.singleFloorTotalCost).toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveToProject(false)}
                    className="bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition shrink-0"
                  >
                    Save to Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
