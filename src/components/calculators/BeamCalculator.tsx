import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { Plus, Minus, Trash2, RotateCcw, Calculator } from "lucide-react";

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
  onSaveEstimate: (data: {
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
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Beam Estimate");
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

  // Form Inputs
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
  const [results, setResults] = useState<any>(null);

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

  const addBeam = () => {
    setErrorMsg("");
    if (beamWidth <= 0 || beamDepth <= 0 || beamLength <= 0 || stirrupSpacing <= 0) {
      setErrorMsg("Please enter valid beam dimensions.");
      return;
    }
    const validRebars = mainRebars.filter((r) => r.dia > 0 && r.qty > 0);
    if (validRebars.length === 0) {
      setErrorMsg("Add at least one valid main rebar.");
      return;
    }

    const newBeam: BeamItem = {
      nos: Math.max(1, numberOfBeams),
      name: beamName.trim() || `B${beams.length + 1}`,
      width: beamWidth,
      depth: beamDepth,
      length: beamLength,
      stirrupSpacing,
      mix: mixRatio,
      mainBars: validRebars,
      extraTopBars: { nos: extraTopNos, dia: extraTopDia, length: extraTopLength },
      extraBottomBars: { nos: extraBottomNos, dia: extraBottomDia, length: extraBottomLength },
    };

    const nextBeams = [...beams, newBeam];
    setBeams(nextBeams);
    setBeamName(`B${nextBeams.length + 1}`);
    calculate(nextBeams);
  };

  const deleteBeam = (index: number) => {
    const nextBeams = beams.filter((_, i) => i !== index);
    setBeams(nextBeams);
    if (nextBeams.length > 0) calculate(nextBeams);
    else setResults(null);
  };

  const calculate = (list = beams) => {
    setErrorMsg("");
    if (list.length === 0) {
      setErrorMsg("Add at least one beam first.");
      setResults(null);
      return;
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
    const totalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    const totalBeamsCount = list.reduce((sum, b) => sum + b.nos, 0);

    const calcResult = {
      cementBags,
      sandCft: Number(sandCft.toFixed(1)),
      aggCft: Number(aggCft.toFixed(1)),
      brickQty,
      useAggregate,
      totalSteelKg: Number(totalSteelKg.toFixed(1)),
      steelBreakdown: steel,
      totalWetVol: Number(totalWetVol.toFixed(2)),
      totalWastageVol: Number(totalWastageVol.toFixed(2)),
      totalDryVol: Number(totalDryVol.toFixed(2)),
      totalBeamsCount,
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      totalCost,
    };

    setResults(calcResult);
  };

  useEffect(() => {
    calculate(beams);
  }, []);

  const resetForm = () => {
    setBeamName("B1");
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
    setBaseType("none");
    setBeams([]);
    setResults(null);
    setErrorMsg("");
  };

  const handleSaveToProject = async () => {
    if (!results) calculate(beams);
    await onSaveEstimate({
      type: "beam",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        beams,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    if (est.data?.beams) {
      setBeams(est.data.beams);
      if (est.data.rates) {
        setCementRate(est.data.rates.cementRate || 550);
        setSandRate(est.data.rates.sandRate || 45);
        setAggRate(est.data.rates.aggRate || 120);
        setSteelRate(est.data.rates.steelRate || 95);
      }
      if (est.data.baseType) setBaseType(est.data.baseType);
      calculate(est.data.beams);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="beam"
        typeLabel="Beam"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        onSave={handleSaveToProject}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { beams, baseType, rates: { cementRate, sandRate, aggRate, steelRate } },
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
              <input
                type="number"
                value={numberOfBeams}
                min="1"
                onChange={(e) => setNumberOfBeams(parseInt(e.target.value) || 1)}
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
              <input
                type="number"
                value={beamWidth}
                step="0.5"
                onChange={(e) => setBeamWidth(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Depth (in)</label>
              <input
                type="number"
                value={beamDepth}
                step="0.5"
                onChange={(e) => setBeamDepth(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
              <input
                type="number"
                value={beamLength}
                step="0.1"
                onChange={(e) => setBeamLength(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Stirrup Spacing (in)</label>
              <input
                type="number"
                value={stirrupSpacing}
                step="0.5"
                onChange={(e) => setStirrupSpacing(parseFloat(e.target.value) || 0)}
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
                    <input
                      type="number"
                      value={bar.dia}
                      placeholder="Ø mm"
                      onChange={(e) => {
                        const next = [...mainRebars];
                        next[idx].dia = parseFloat(e.target.value) || 0;
                        setMainRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={bar.qty}
                      placeholder="Nos"
                      onChange={(e) => {
                        const next = [...mainRebars];
                        next[idx].qty = parseInt(e.target.value) || 0;
                        setMainRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
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
              <input
                type="number"
                value={extraTopNos}
                onChange={(e) => setExtraTopNos(parseInt(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dia (mm)</label>
              <input
                type="number"
                value={extraTopDia}
                onChange={(e) => setExtraTopDia(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft) — auto = L/3</label>
              <input
                type="number"
                value={extraTopLength}
                step="0.01"
                onChange={(e) => setExtraTopLength(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            {/* Extra Bottom Bars */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Extra Bottom Bars @ Mid-Span (L/2)
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos</label>
              <input
                type="number"
                value={extraBottomNos}
                onChange={(e) => setExtraBottomNos(parseInt(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dia (mm)</label>
              <input
                type="number"
                value={extraBottomDia}
                onChange={(e) => setExtraBottomDia(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft) — auto = L/2</label>
              <input
                type="number"
                value={extraBottomLength}
                step="0.01"
                onChange={(e) => setExtraBottomLength(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
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
                  <input
                    type="number"
                    value={brickRate}
                    onChange={(e) => setBrickRate(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Pcs per cft</label>
                  <input
                    type="number"
                    value={bricksPerCft}
                    onChange={(e) => setBricksPerCft(parseFloat(e.target.value) || 10)}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
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
              <input
                type="number"
                value={cementRate}
                onChange={(e) => setCementRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (per cft)</label>
              <input
                type="number"
                value={sandRate}
                onChange={(e) => setSandRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Aggregate (per cft)</label>
              <input
                type="number"
                value={aggRate}
                onChange={(e) => setAggRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Rebar (per kg)</label>
              <input
                type="number"
                value={steelRate}
                onChange={(e) => setSteelRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            {/* Buttons */}
            <div className="col-span-2 flex gap-2 mt-2">
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
                onClick={addBeam}
                className="flex-1 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Beam to List
              </button>
            </div>
          </div>

          {/* Added Beams List */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Beams</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono">
                {beams.length} items
              </span>
            </div>

            {beams.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8ba3c1]">
                No beams in current list. Enter dimensions and click "+ Add Beam".
              </div>
            ) : (
              <div className="space-y-1.5">
                {beams.map((b, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">
                        {b.nos} × {b.name}
                      </div>
                      <div className="text-[11px] text-[#8ba3c1] truncate">
                        {b.width}"×{b.depth}"×{b.length}ft · {b.mainBars.map((r) => `${r.qty}Ø${r.dia}`).join(", ")} · Stirrup 10mm@{b.stirrupSpacing}"
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBeam(idx)}
                      className="w-6 h-6 bg-[#ff4d6d] hover:bg-[#ff4d6d]/80 text-white rounded flex items-center justify-center text-xs font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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
                  <div className="text-sm font-bold text-[#f5a623]">{results.cementBags} bags</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.sandCft} cft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">
                    {results.useAggregate ? "Aggregate" : "Picket Brick"}
                  </div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.useAggregate ? `${results.aggCft} cft` : `${results.brickQty} pcs`}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Steel</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.totalSteelKg} kg</div>
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
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#a3e4bd]">Grand Total Cost</div>
                  <div className="text-lg font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveToProject}
                  className="bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition"
                >
                  Save to Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
