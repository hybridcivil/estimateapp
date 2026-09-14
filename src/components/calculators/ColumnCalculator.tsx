import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, ColumnItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { Plus, Minus, Trash2, RotateCcw } from "lucide-react";

interface ColumnCalculatorProps {
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

export const ColumnCalculator: React.FC<ColumnCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Column Estimate");
  const [columns, setColumns] = useState<ColumnItem[]>([
    {
      nos: 4,
      name: "C1",
      type: "rectangular",
      category: "long",
      size: "12x12",
      height: 10,
      rebars: [{ dia: 16, nos: 8 }],
      mix: "1:1.5:3",
      stirrupDia: 10,
      stirrupSpacing: 6,
    },
  ]);

  // Form
  const [colName, setColName] = useState("C2");
  const [mixRatio, setMixRatio] = useState("1:1.5:3");
  const [colType, setColType] = useState<"rectangular" | "circular">("rectangular");
  const [colCategory, setColCategory] = useState<"long" | "short">("long");
  const [colNos, setColNos] = useState(4);
  const [colX, setColX] = useState(12);
  const [colY, setColY] = useState(12);
  const [colDia, setColDia] = useState(12);
  const [colHeight, setColHeight] = useState(10);
  const [shortHeight, setShortHeight] = useState(3);
  const [longHeight, setLongHeight] = useState(10);

  // Main rebar rows
  const [rebars, setRebars] = useState<{ dia: number; nos: number }[]>([{ dia: 16, nos: 8 }]);

  // Stirrups
  const [stirrupDia, setStirrupDia] = useState(10);
  const [stirrupSpacing, setStirrupSpacing] = useState(6);

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

  const addRebarRow = () => {
    setRebars([...rebars, { dia: 16, nos: 4 }]);
  };

  const delRebarRow = (index: number) => {
    if (rebars.length > 1) {
      setRebars(rebars.filter((_, i) => i !== index));
    }
  };

  const addColumn = () => {
    setErrorMsg("");
    const validRebars = rebars.filter((r) => r.dia > 0 && r.nos > 0);
    if (validRebars.length === 0) {
      setErrorMsg("Add at least one valid main rebar.");
      return;
    }
    if (stirrupDia <= 0 || stirrupSpacing <= 0) {
      setErrorMsg("Enter valid stirrup details.");
      return;
    }

    let size = "";
    if (colType === "rectangular") {
      if (colX <= 0 || colY <= 0) {
        setErrorMsg("Enter valid X & Y dimensions.");
        return;
      }
      size = `${colX}x${colY}`;
    } else {
      if (colDia <= 0) {
        setErrorMsg("Enter valid diameter.");
        return;
      }
      size = `⌀${colDia}`;
    }

    const name = colName.trim() || `C${columns.length + 1}`;
    const nos = Math.max(1, colNos);

    const nextList = [...columns];

    if (colCategory === "short") {
      if (shortHeight <= 0 || longHeight <= 0) {
        setErrorMsg("Enter both short and long heights.");
        return;
      }
      let shortSize = size;
      if (colType === "rectangular") {
        shortSize = `${colX + 3}x${colY + 3}`;
      } else {
        shortSize = `⌀${colDia + 3}`;
      }
      nextList.push({
        nos,
        name,
        type: colType,
        category: "short",
        size: shortSize,
        height: shortHeight,
        rebars: validRebars,
        mix: mixRatio,
        stirrupDia,
        stirrupSpacing,
      });
      nextList.push({
        nos,
        name,
        type: colType,
        category: "long",
        size,
        height: longHeight,
        rebars: validRebars,
        mix: mixRatio,
        stirrupDia,
        stirrupSpacing,
      });
    } else {
      if (colHeight <= 0) {
        setErrorMsg("Enter valid column height.");
        return;
      }
      nextList.push({
        nos,
        name,
        type: colType,
        category: colCategory,
        size,
        height: colHeight,
        rebars: validRebars,
        mix: mixRatio,
        stirrupDia,
        stirrupSpacing,
      });
    }

    setColumns(nextList);
    setColName(`C${nextList.length + 1}`);
    calculate(nextList);
  };

  const deleteColumn = (index: number) => {
    const nextList = columns.filter((_, i) => i !== index);
    setColumns(nextList);
    if (nextList.length > 0) calculate(nextList);
    else setResults(null);
  };

  const calculate = (list = columns) => {
    setErrorMsg("");
    if (list.length === 0) {
      setErrorMsg("Add at least one column first.");
      setResults(null);
      return;
    }

    const COVER_IN = 1.5;
    const isPicket = baseType === "picket";

    const mixVolumes: Record<string, number> = {};
    const steel: Record<number, number> = {};
    let totalWetVol = 0;
    let totalWastageVol = 0;

    list.forEach((c) => {
      let wetVol = 0;
      let stirrupLenIn = 0;

      if (c.type === "rectangular") {
        const parts = c.size.split("x");
        const x = parseFloat(parts[0]) || 0;
        const y = parseFloat(parts[1]) || 0;
        wetVol = (x * y * c.height) / 144;
        stirrupLenIn = 2 * (x - 2 * COVER_IN) + 2 * (y - 2 * COVER_IN) + 6;
      } else {
        const d = parseFloat(c.size.replace("⌀", "")) || 0;
        wetVol = (Math.PI * (d / 2) * (d / 2) * c.height) / 144;
        stirrupLenIn = Math.PI * (d - 2 * COVER_IN) + 6;
      }

      if (!Number.isFinite(wetVol) || wetVol < 0) wetVol = 0;

      const wastageVol = wetVol * 0.05;
      const wetWithWastage = wetVol + wastageVol;
      const dryVol = wetWithWastage * 1.54;

      totalWetVol += wetVol * c.nos;
      totalWastageVol += wastageVol * c.nos;

      const mixKey = c.mix || "1:1.5:3";
      mixVolumes[mixKey] = (mixVolumes[mixKey] || 0) + dryVol * c.nos;

      // Main rebar (5% wastage)
      c.rebars.forEach((r) => {
        const barDia = Number(r.dia) || 0;
        const barNos = Number(r.nos) || 0;
        const h = c.category === "short" ? c.height + 1.5 : c.height;
        const weight = ((barNos * h * barDia * barDia) / 533) * c.nos * 1.05;
        if (barDia > 0 && Number.isFinite(weight) && weight > 0) {
          steel[barDia] = (steel[barDia] || 0) + weight;
        }
      });

      // Stirrups (3% wastage)
      const nStirrup = Math.ceil((c.height * 12) / c.stirrupSpacing) * c.nos;
      const stWeight = nStirrup * (stirrupLenIn / 12) * ((c.stirrupDia * c.stirrupDia) / 533) * 1.03;
      if (Number.isFinite(stWeight) && stWeight > 0) {
        steel[c.stirrupDia] = (steel[c.stirrupDia] || 0) + stWeight;
      }
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

    const totalColsCount = list.reduce((sum, c) => sum + c.nos, 0);

    setResults({
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
      totalColsCount,
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      totalCost,
    });
  };

  useEffect(() => {
    calculate(columns);
  }, []);

  const resetForm = () => {
    setColName("C1");
    setColNos(4);
    setColType("rectangular");
    setColCategory("long");
    setColX(12);
    setColY(12);
    setColDia(12);
    setColHeight(10);
    setShortHeight(3);
    setLongHeight(10);
    setStirrupDia(10);
    setStirrupSpacing(6);
    setMixRatio("1:1.5:3");
    setBaseType("none");
    setRebars([{ dia: 16, nos: 8 }]);
    setColumns([]);
    setResults(null);
    setErrorMsg("");
  };

  const handleSaveToProject = async () => {
    if (!results) calculate(columns);
    await onSaveEstimate({
      type: "column",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        columns,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
        baseType,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    if (est.data?.columns) {
      setColumns(est.data.columns);
      if (est.data.rates) {
        setCementRate(est.data.rates.cementRate || 550);
        setSandRate(est.data.rates.sandRate || 45);
        setAggRate(est.data.rates.aggRate || 120);
        setSteelRate(est.data.rates.steelRate || 95);
      }
      if (est.data.baseType) setBaseType(est.data.baseType);
      calculate(est.data.columns);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="column"
        typeLabel="Column"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        onSave={handleSaveToProject}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { columns, baseType, rates: { cementRate, sandRate, aggRate, steelRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.columns) {
            setColumns(payload.data.columns);
            calculate(payload.data.columns);
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

          {/* Column Inputs */}
          <div className="grid grid-cols-2 gap-2 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Column Name</label>
              <input
                type="text"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="e.g. C1"
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos of Columns</label>
              <input
                type="number"
                value={colNos}
                min="1"
                onChange={(e) => setColNos(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Column Shape</label>
              <select
                value={colType}
                onChange={(e) => setColType(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              >
                <option value="rectangular">Rectangular</option>
                <option value="circular">Circular</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Category</label>
              <select
                value={colCategory}
                onChange={(e) => setColCategory(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              >
                <option value="long">Long Column</option>
                <option value="short">Short Column (Plinth)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
              <select
                value={mixRatio}
                onChange={(e) => setMixRatio(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              >
                <option value="1:1.5:3">1 : 1.5 : 3</option>
                <option value="1:2:4">1 : 2 : 4</option>
              </select>
            </div>

            {colType === "rectangular" ? (
              <>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Size X (in)</label>
                  <input
                    type="number"
                    value={colX}
                    step="0.5"
                    onChange={(e) => setColX(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Size Y (in)</label>
                  <input
                    type="number"
                    value={colY}
                    step="0.5"
                    onChange={(e) => setColY(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Diameter (in)</label>
                <input
                  type="number"
                  value={colDia}
                  step="0.5"
                  onChange={(e) => setColDia(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                />
              </div>
            )}

            {colCategory === "long" ? (
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Height (ft)</label>
                <input
                  type="number"
                  value={colHeight}
                  step="0.1"
                  onChange={(e) => setColHeight(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Short Ht (ft)</label>
                  <input
                    type="number"
                    value={shortHeight}
                    step="0.1"
                    onChange={(e) => setShortHeight(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Long Ht (ft)</label>
                  <input
                    type="number"
                    value={longHeight}
                    step="0.1"
                    onChange={(e) => setLongHeight(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
                  />
                </div>
              </>
            )}

            {/* Main Rebar */}
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
              {rebars.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
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
                      value={r.nos}
                      placeholder="Nos"
                      onChange={(e) => {
                        const next = [...rebars];
                        next[idx].nos = parseInt(e.target.value) || 0;
                        setRebars(next);
                      }}
                      className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                    />
                  </div>
                  {rebars.length > 1 && (
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

            {/* Stirrup */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Ties / Stirrup
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Stirrup Bar (mm)</label>
              <input
                type="number"
                value={stirrupDia}
                onChange={(e) => setStirrupDia(parseFloat(e.target.value) || 10)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Stirrup Spacing (in)</label>
              <input
                type="number"
                value={stirrupSpacing}
                step="0.5"
                onChange={(e) => setStirrupSpacing(parseFloat(e.target.value) || 6)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            {/* Base */}
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
                onClick={addColumn}
                className="flex-1 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Column to List
              </button>
            </div>
          </div>

          {/* Added Columns List */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Columns</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono">
                {columns.length} items
              </span>
            </div>

            {columns.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8ba3c1]">
                No columns in list yet. Enter details and click "+ Add Column".
              </div>
            ) : (
              <div className="space-y-1.5">
                {columns.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">
                        {c.nos} × {c.name} ({c.category})
                      </div>
                      <div className="text-[11px] text-[#8ba3c1] truncate">
                        {c.type} · {c.size} · {c.height} ft · {c.rebars.map((r) => `${r.nos}Ø${r.dia}`).join(", ")} · Ties {c.stirrupDia}mm@{c.stirrupSpacing}"
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteColumn(idx)}
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
                  {results.totalColsCount} Total Columns
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
                        {dia === 10 ? "Ties 10mm" : `${dia}mm Rebar`}
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
