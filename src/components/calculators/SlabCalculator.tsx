import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { RotateCcw, Calculator } from "lucide-react";

interface SlabCalculatorProps {
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

export const SlabCalculator: React.FC<SlabCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Two-Way Slab Estimate");

  // Inputs
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

  const calculate = () => {
    setErrorMsg("");
    if (length <= 0 || width <= 0 || thicknessIn <= 0) {
      setErrorMsg("Enter valid slab dimensions.");
      return;
    }
    if (spacingIn <= 0 || distSpacingIn <= 0) {
      setErrorMsg("Enter valid bar spacing.");
      return;
    }

    const parts = mixRatio.split(":").map(Number);
    const cR = parts[0] || 1;
    const sR = parts[1] || 1.5;
    const aR = parts[2] || 3;
    const ratioSum = cR + sR + aR;

    const thicknessFt = thicknessIn / 12;
    const area = length * width;
    const volume = area * thicknessFt;

    const dryVolume = volume * 1.54;
    const cementVolume = dryVolume * (cR / ratioSum);
    const sandVolume = dryVolume * (sR / ratioSum);
    const aggregateVolume = dryVolume * (aR / ratioSum);
    const cementBags = Math.ceil(cementVolume / 1.25);

    // Main steel (1 layer)
    const spacingFt = spacingIn / 12;
    const numMainBars = Math.floor(length / spacingFt) + 1;
    const totalMainBarLength = numMainBars * width;
    const mainBarWeight = ((mainBar * mainBar) / 162) * (totalMainBarLength * 0.3048);

    // Distribution steel (1 layer)
    const dSpacingFt = distSpacingIn / 12;
    const numDistBars = Math.floor(width / dSpacingFt) + 1;
    const totalDistBarLength = numDistBars * length;
    const distBarWeight = ((distBar * distBar) / 162) * (totalDistBarLength * 0.3048);

    // Extra top bars @ supports
    const mainDistLength = totalMainBarLength + totalDistBarLength;
    const totalExtraLength = (mainDistLength / 3) * Math.max(0, extraBarsNum);
    const extraBarWeight = ((extraBar * extraBar) / 162) * (totalExtraLength * 0.3048);

    const totalSteel = mainBarWeight + distBarWeight + extraBarWeight;

    // Picket
    let brickQty = 0;
    let picketCost = 0;
    const isPicket = baseType === "picket";
    if (isPicket) {
      brickQty = Math.ceil(aggregateVolume * bricksPerCft * 1.1);
      picketCost = brickQty * brickRate;
    }

    const useAggregate = !isPicket;
    const cementCost = cementBags * cementRate;
    const sandCost = sandVolume * sandRate;
    const aggCost = useAggregate ? aggregateVolume * aggRate : 0;
    const steelCost = totalSteel * steelRate;
    const totalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    setResults({
      area: Number(area.toFixed(1)),
      volume: Number(volume.toFixed(2)),
      dryVolume: Number(dryVolume.toFixed(2)),
      cementBags,
      sandVolume: Number(sandVolume.toFixed(1)),
      aggregateVolume: Number(aggregateVolume.toFixed(1)),
      brickQty,
      useAggregate,
      mainBarWeight: Number(mainBarWeight.toFixed(1)),
      distBarWeight: Number(distBarWeight.toFixed(1)),
      extraBarWeight: Number(extraBarWeight.toFixed(1)),
      totalSteel: Number(totalSteel.toFixed(1)),
      numMainBars,
      numDistBars,
      totalExtraLength: Math.round(totalExtraLength),
      cementCost,
      sandCost,
      aggCost,
      steelCost,
      picketCost,
      totalCost,
    });
  };

  useEffect(() => {
    calculate();
  }, [
    length,
    width,
    thicknessIn,
    mixRatio,
    mainBar,
    spacingIn,
    distBar,
    distSpacingIn,
    extraBar,
    extraBarsNum,
    baseType,
    brickRate,
    bricksPerCft,
    cementRate,
    sandRate,
    aggRate,
    steelRate,
  ]);

  const resetForm = () => {
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
    setBaseType("none");
    setCementRate(550);
    setSandRate(45);
    setAggRate(120);
    setSteelRate(95);
  };

  const handleSaveToProject = async () => {
    if (!results) calculate();
    await onSaveEstimate({
      type: "slab",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        config: {
          length,
          width,
          thicknessIn,
          mixRatio,
          mainBar,
          spacingIn,
          distBar,
          distSpacingIn,
          extraBar,
          extraBarsNum,
        },
        baseType,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    const c = est.data?.config;
    if (c) {
      if (c.length) setLength(c.length);
      if (c.width) setWidth(c.width);
      if (c.thicknessIn) setThicknessIn(c.thicknessIn);
      if (c.mixRatio) setMixRatio(c.mixRatio);
      if (c.mainBar) setMainBar(c.mainBar);
      if (c.spacingIn) setSpacingIn(c.spacingIn);
      if (c.distBar) setDistBar(c.distBar);
      if (c.distSpacingIn) setDistSpacingIn(c.distSpacingIn);
      if (c.extraBar) setExtraBar(c.extraBar);
      if (c.extraBarsNum !== undefined) setExtraBarsNum(c.extraBarsNum);
    }
    if (est.data?.rates) {
      setCementRate(est.data.rates.cementRate || 550);
      setSandRate(est.data.rates.sandRate || 45);
      setAggRate(est.data.rates.aggRate || 120);
      setSteelRate(est.data.rates.steelRate || 95);
    }
    if (est.data?.baseType) setBaseType(est.data.baseType);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="slab"
        typeLabel="Two-Way Slab"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        onSave={handleSaveToProject}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: {
            config: {
              length,
              width,
              thicknessIn,
              mixRatio,
              mainBar,
              spacingIn,
              distBar,
              distSpacingIn,
              extraBar,
              extraBarsNum,
            },
            baseType,
            rates: { cementRate, sandRate, aggRate, steelRate },
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.config) {
            const c = payload.data.config;
            setLength(c.length);
            setWidth(c.width);
            setThicknessIn(c.thicknessIn);
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
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1">
              Slab Dimensions
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
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (ft)</label>
              <input
                type="number"
                value={width}
                step="0.1"
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Thickness (in)</label>
              <input
                type="number"
                value={thicknessIn}
                step="0.1"
                onChange={(e) => setThicknessIn(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
              <select
                value={mixRatio}
                onChange={(e) => setMixRatio(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              >
                <option value="1:1.5:3">1 : 1.5 : 3 (M20)</option>
                <option value="1:2:4">1 : 2 : 4 (M15)</option>
              </select>
            </div>

            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Main Reinforcement
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Main Bar Size</label>
              <select
                value={mainBar}
                onChange={(e) => setMainBar(parseFloat(e.target.value) || 12)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value={10}>10 mm</option>
                <option value={12}>12 mm</option>
                <option value={16}>16 mm</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Spacing (in c/c)</label>
              <input
                type="number"
                value={spacingIn}
                step="0.5"
                onChange={(e) => setSpacingIn(parseFloat(e.target.value) || 6)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Distribution Bars
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dist. Bar Size</label>
              <select
                value={distBar}
                onChange={(e) => setDistBar(parseFloat(e.target.value) || 10)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value={10}>10 mm</option>
                <option value={12}>12 mm</option>
                <option value={16}>16 mm</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Spacing (in c/c)</label>
              <input
                type="number"
                value={distSpacingIn}
                step="0.5"
                onChange={(e) => setDistSpacingIn(parseFloat(e.target.value) || 6)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Extra Top Bars @ Supports (L/3)
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Extra Bar Size</label>
              <select
                value={extraBar}
                onChange={(e) => setExtraBar(parseFloat(e.target.value) || 10)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value={10}>10 mm</option>
                <option value={12}>12 mm</option>
                <option value={16}>16 mm</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Nos of Sets</label>
              <input
                type="number"
                value={extraBarsNum}
                min="0"
                onChange={(e) => setExtraBarsNum(parseInt(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
            <div className="col-span-2 bg-[#00c2c7]/10 border-l-2 border-[#00c2c7] p-2 rounded text-[11px] text-[#8ba3c1]">
              <b>Extra Top</b> = (Main + Dist length) / 3 — Support-এ L/3 পর্যন্ত।
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

            <div className="col-span-2 flex gap-2 mt-2">
              <button
                type="button"
                onClick={resetForm}
                className="w-full h-9 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Values
              </button>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-2">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.area} sqft · {results.volume} cft
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.cementBags} bags</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.sandVolume} cft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">
                    {results.useAggregate ? "Aggregate" : "Picket Brick"}
                  </div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.useAggregate ? `${results.aggregateVolume} cft` : `${results.brickQty} pcs`}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Steel</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.totalSteel} kg</div>
                </div>
              </div>

              {/* Steel details */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Main ({mainBar}mm)</div>
                  <div className="text-xs font-bold text-white">{results.mainBarWeight} kg</div>
                  <div className="text-[9px] text-[#8ba3c1]">{results.numMainBars} bars</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Dist. ({distBar}mm)</div>
                  <div className="text-xs font-bold text-white">{results.distBarWeight} kg</div>
                  <div className="text-[9px] text-[#8ba3c1]">{results.numDistBars} bars</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Extra ({extraBar}mm)</div>
                  <div className="text-xs font-bold text-white">{results.extraBarWeight} kg</div>
                  <div className="text-[9px] text-[#8ba3c1]">{results.totalExtraLength} ft</div>
                </div>
              </div>

              {/* Volume & Cost Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Wet Volume</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.volume} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Dry Vol (×1.54)</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.dryVolume} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Cement Cost</div>
                  <div className="text-xs font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.cementCost).toLocaleString("en-IN")}
                  </div>
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
