import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, FootingItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { Plus, Minus, Trash2, RotateCcw } from "lucide-react";

interface FootingCalculatorProps {
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

export const FootingCalculator: React.FC<FootingCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Footing Estimate");
  const [footings, setFootings] = useState<FootingItem[]>([
    {
      nos: 4,
      name: "F1",
      length: 7,
      breadth: 7,
      thickness: 1.5,
      cover: 3 / 12,
      hook: 6 / 12,
      mix: "1:1.5:3",
      rebars: [
        { role: "top", dia: 12, spacing: 6 },
        { role: "bottom", dia: 16, spacing: 6 },
      ],
    },
  ]);

  // Form Inputs
  const [ftName, setFtName] = useState("F2");
  const [ftNos, setFtNos] = useState(4);
  const [mixRatio, setMixRatio] = useState("1:1.5:3");
  const [length, setLength] = useState(7);
  const [breadth, setBreadth] = useState(7);
  const [thicknessIn, setThicknessIn] = useState(18);
  const [coverIn, setCoverIn] = useState(3);
  const [hookIn, setHookIn] = useState(6);

  // Rebars
  const [rebars, setRebars] = useState<{ role: string; dia: number; spacing: number }[]>([
    { role: "bottom", dia: 16, spacing: 6 },
  ]);

  // Base
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

  const reassignRoles = (list: { role: string; dia: number; spacing: number }[]) => {
    const n = list.length;
    return list.map((r, i) => {
      let role = "bottom";
      if (n === 1) role = "bottom";
      else if (n === 2) role = i === 0 ? "top" : "bottom";
      else {
        if (i === 0) role = "top";
        else if (i === 1) role = "bottom";
        else role = "extra";
      }
      return { ...r, role };
    });
  };

  const addRebarRow = () => {
    const updated = [...rebars, { role: "extra", dia: 12, spacing: 6 }];
    setRebars(reassignRoles(updated));
  };

  const delRebarRow = (idx: number) => {
    if (rebars.length > 1) {
      const updated = rebars.filter((_, i) => i !== idx);
      setRebars(reassignRoles(updated));
    }
  };

  const computeCutLength = (
    role: string,
    sizeFt: number,
    thicknessFt: number,
    coverFt: number,
    hookFt: number
  ) => {
    const effective = sizeFt - 2 * coverFt;
    let total = effective + 2 * hookFt;
    if (role === "bottom") {
      const verticalBend = thicknessFt - 2 * coverFt;
      if (verticalBend > 0) total += verticalBend;
    }
    return total;
  };

  const addFooting = () => {
    setErrorMsg("");
    if (length <= 0 || breadth <= 0 || thicknessIn <= 0) {
      setErrorMsg("Enter valid footing dimensions.");
      return;
    }
    if (coverIn < 0 || coverIn > thicknessIn / 2) {
      setErrorMsg("Invalid cover thickness.");
      return;
    }
    const validRebars = rebars.filter((r) => r.dia > 0 && r.spacing > 0);
    if (validRebars.length === 0) {
      setErrorMsg("Add at least one valid rebar.");
      return;
    }

    const newFooting: FootingItem = {
      nos: Math.max(1, ftNos),
      name: ftName.trim() || `F${footings.length + 1}`,
      length,
      breadth,
      thickness: thicknessIn / 12,
      cover: coverIn / 12,
      hook: hookIn / 12,
      mix: mixRatio,
      rebars: validRebars,
    };

    const nextList = [...footings, newFooting];
    setFootings(nextList);
    setFtName(`F${nextList.length + 1}`);
    calculate(nextList);
  };

  const deleteFooting = (index: number) => {
    const nextList = footings.filter((_, i) => i !== index);
    setFootings(nextList);
    if (nextList.length > 0) calculate(nextList);
    else setResults(null);
  };

  const calculate = (list = footings) => {
    setErrorMsg("");
    if (list.length === 0) {
      setErrorMsg("Add at least one footing first.");
      setResults(null);
      return;
    }

    const isPicket = baseType === "picket";
    const mixVolumes: Record<string, number> = {};
    const steel: Record<number, number> = {};
    const steelByRole: Record<string, Record<number, number>> = {};
    let totalWetVol = 0;
    let totalWastageVol = 0;

    list.forEach((f) => {
      const wetVol = f.length * f.breadth * f.thickness * f.nos;
      const wastageVol = wetVol * 0.05;
      const wetWithWastage = wetVol + wastageVol;
      const dryVol = wetWithWastage * 1.54;

      totalWetVol += wetVol;
      totalWastageVol += wastageVol;

      const mixKey = f.mix || "1:1.5:3";
      mixVolumes[mixKey] = (mixVolumes[mixKey] || 0) + dryVol;

      f.rebars.forEach((r) => {
        const spacingFt = r.spacing / 12;
        const effLength = f.length - 2 * f.cover;
        const effBreadth = f.breadth - 2 * f.cover;

        const numAlongLength = Math.floor(effBreadth / spacingFt) + 1;
        const numAlongBreadth = Math.floor(effLength / spacingFt) + 1;

        const cutLengthL = computeCutLength(r.role, f.length, f.thickness, f.cover, f.hook);
        const cutLengthB = computeCutLength(r.role, f.breadth, f.thickness, f.cover, f.hook);

        const totalLenFt = (numAlongLength * cutLengthL + numAlongBreadth * cutLengthB) * f.nos * 1.05;
        const totalLenM = totalLenFt * 0.3048;
        const weight = ((r.dia * r.dia) / 162) * totalLenM;

        if (Number.isFinite(weight) && weight > 0) {
          steel[r.dia] = (steel[r.dia] || 0) + weight;
          if (!steelByRole[r.role]) steelByRole[r.role] = {};
          steelByRole[r.role][r.dia] = (steelByRole[r.role][r.dia] || 0) + weight;
        }
      });
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

    const totalFtCount = list.reduce((sum, f) => sum + f.nos, 0);

    setResults({
      cementBags,
      sandCft: Number(sandCft.toFixed(1)),
      aggCft: Number(aggCft.toFixed(1)),
      brickQty,
      useAggregate,
      totalSteelKg: Number(totalSteelKg.toFixed(1)),
      steelBreakdown: steel,
      steelByRole,
      totalWetVol: Number(totalWetVol.toFixed(2)),
      totalWastageVol: Number(totalWastageVol.toFixed(2)),
      totalDryVol: Number(totalDryVol.toFixed(2)),
      totalFtCount,
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      totalCost,
    });
  };

  useEffect(() => {
    calculate(footings);
  }, []);

  const resetForm = () => {
    setFtName("F1");
    setFtNos(4);
    setMixRatio("1:1.5:3");
    setLength(7);
    setBreadth(7);
    setThicknessIn(18);
    setCoverIn(3);
    setHookIn(6);
    setBaseType("none");
    setRebars([{ role: "bottom", dia: 16, spacing: 6 }]);
    setFootings([]);
    setResults(null);
    setErrorMsg("");
  };

  const handleSaveToProject = async () => {
    if (!results) calculate(footings);
    await onSaveEstimate({
      type: "footing",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        footings,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    if (est.data?.footings) {
      setFootings(est.data.footings);
      if (est.data.rates) {
        setCementRate(est.data.rates.cementRate || 550);
        setSandRate(est.data.rates.sandRate || 45);
        setAggRate(est.data.rates.aggRate || 120);
        setSteelRate(est.data.rates.steelRate || 95);
      }
      if (est.data.baseType) setBaseType(est.data.baseType);
      calculate(est.data.footings);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="footing"
        typeLabel="Footing"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        onSave={handleSaveToProject}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { footings, baseType, rates: { cementRate, sandRate, aggRate, steelRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.footings) {
            setFootings(payload.data.footings);
            calculate(payload.data.footings);
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

          <div className="grid grid-cols-2 gap-2 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Footing Name</label>
              <input
                type="text"
                value={ftName}
                onChange={(e) => setFtName(e.target.value)}
                placeholder="e.g. F1"
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos of Footings</label>
              <input
                type="number"
                value={ftNos}
                min="1"
                onChange={(e) => setFtNos(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
              <select
                value={mixRatio}
                onChange={(e) => setMixRatio(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              >
                <option value="1:1.5:3">1 : 1.5 : 3 (M20)</option>
                <option value="1:2:4">1 : 2 : 4 (M15)</option>
              </select>
            </div>

            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Footing Dimensions
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
              <input
                type="number"
                value={length}
                step="0.1"
                onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Breadth (ft)</label>
              <input
                type="number"
                value={breadth}
                step="0.1"
                onChange={(e) => setBreadth(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Thickness (inch)</label>
              <input
                type="number"
                value={thicknessIn}
                step="0.5"
                onChange={(e) => setThicknessIn(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Cover (inch)</label>
              <input
                type="number"
                value={coverIn}
                step="0.25"
                onChange={(e) => setCoverIn(parseFloat(e.target.value) || 3)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">
                Hook / Bend (inch — each side)
              </label>
              <input
                type="number"
                value={hookIn}
                step="0.5"
                onChange={(e) => setHookIn(parseFloat(e.target.value) || 6)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            {/* Rebar */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1 flex justify-between items-center">
              <span>Rebar Mesh (Dia + Spacing)</span>
              <button
                type="button"
                onClick={addRebarRow}
                className="text-[10px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-2 py-0.5 rounded"
              >
                + Add Mesh Row
              </button>
            </div>

            <div className="col-span-2 space-y-1.5">
              {rebars.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`w-16 h-8 flex items-center justify-center rounded text-[10px] font-bold uppercase tracking-wider ${
                      r.role === "top"
                        ? "bg-[#c4b5fd] text-[#0f1c2e]"
                        : r.role === "bottom"
                        ? "bg-[#f5a623] text-[#0f1c2e]"
                        : "bg-[#00c2c7] text-[#0f1c2e]"
                    }`}
                  >
                    {r.role}
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={r.dia}
                      placeholder="Ø mm"
                      onChange={(e) => {
                        const next = [...rebars];
                        next[idx].dia = parseFloat(e.target.value) || 0;
                        setRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={r.spacing}
                      placeholder="Spacing (in)"
                      onChange={(e) => {
                        const next = [...rebars];
                        next[idx].spacing = parseFloat(e.target.value) || 0;
                        setRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                    />
                  </div>
                  {rebars.length > 1 && (
                    <button
                      type="button"
                      onClick={() => delRebarRow(idx)}
                      className="w-8 h-8 bg-[#ff4d6d] text-white rounded flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Base Type */}
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
              </>
            )}

            {/* Rates */}
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

            {/* Action buttons */}
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
                onClick={addFooting}
                className="flex-1 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Footing to List
              </button>
            </div>
          </div>

          {/* Footing List */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Footings</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono">
                {footings.length} items
              </span>
            </div>

            {footings.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8ba3c1]">
                No footings in list. Enter dimensions and click "+ Add Footing".
              </div>
            ) : (
              <div className="space-y-1.5">
                {footings.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">
                        {f.nos} × {f.name}
                      </div>
                      <div className="text-[11px] text-[#8ba3c1] truncate">
                        {f.length}×{f.breadth} ft · {(f.thickness * 12).toFixed(0)}" thk · {f.rebars.map((r) => `${r.role === 'top' ? 'T' : r.role === 'bottom' ? 'B' : 'X'}:${r.dia}@${r.spacing}"`).join(", ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFooting(idx)}
                      className="w-6 h-6 bg-[#ff4d6d] hover:bg-[#ff4d6d]/80 text-white rounded flex items-center justify-center text-xs font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-2">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.totalFtCount} Total Footings
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

              {/* Steel breakdown by role */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                {["top", "bottom", "extra"].map((role) => {
                  if (!results.steelByRole?.[role]) return null;
                  return Object.keys(results.steelByRole[role]).map((dia) => (
                    <div key={`${role}-${dia}`} className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                      <div className="text-[9px] text-[#8ba3c1] capitalize">
                        {role} {dia}mm
                      </div>
                      <div className="text-xs font-bold text-white">
                        {results.steelByRole[role][Number(dia)].toFixed(1)} kg
                      </div>
                    </div>
                  ));
                })}
              </div>

              {/* Volume & costs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Wet Volume</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.totalWetVol} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Dry Vol (×1.54)</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.totalDryVol} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Cement ৳</div>
                  <div className="text-xs font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.cementCost).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Steel ৳</div>
                  <div className="text-xs font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.steelCost).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Grand Total */}
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
