import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { RotateCcw } from "lucide-react";

interface StairCalculatorProps {
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

export const StairCalculator: React.FC<StairCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Staircase Estimate");

  // Inputs
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

  // Update treads when risers change
  const handleRisersChange = (val: number) => {
    setRisers(val);
    if (val > 1) setTreads(val - 1);
  };

  const calculate = () => {
    setErrorMsg("");
    if (lengthFeet <= 0 && lengthInches <= 0) {
      setErrorMsg("Enter a valid staircase length.");
      return;
    }
    if (widthFeet <= 0 && widthInches <= 0) {
      setErrorMsg("Enter a valid staircase width.");
      return;
    }
    if (thicknessIn <= 0) {
      setErrorMsg("Enter a valid waist thickness.");
      return;
    }
    if (risers <= 0 || treads <= 0) {
      setErrorMsg("Risers and treads must be greater than zero.");
      return;
    }
    if (riserHeightIn <= 0 || treadWidthIn <= 0) {
      setErrorMsg("Enter valid riser height and tread width.");
      return;
    }

    const parts = mixRatio.split(":").map(Number);
    const ratioSum = parts[0] + parts[1] + parts[2];

    const lengthFt = lengthFeet + lengthInches / 12;
    const widthFt = widthFeet + widthInches / 12;
    const thicknessFt = thicknessIn / 12;
    const riserFt = riserHeightIn / 12;
    const treadFt = treadWidthIn / 12;

    const volumeSlab = lengthFt * widthFt * thicknessFt;
    const volumeSteps = 0.5 * treadFt * riserFt * widthFt * treads;
    const totalWetVolume = volumeSlab + volumeSteps;
    const finalVolume = totalWetVolume * 1.05;
    const dryVolume = finalVolume * 1.54;

    const cementVol = dryVolume * (parts[0] / ratioSum);
    const sandVol = dryVolume * (parts[1] / ratioSum);
    const aggregateVol = dryVolume * (parts[2] / ratioSum);
    const cementBags = Math.ceil(cementVol / 1.25);

    const lengthMeters = lengthFt * 0.3048;
    const widthMeters = widthFt * 0.3048;
    const numMainBars = Math.ceil(lengthFt / (mainSpacingIn / 12)) + 1;
    const numDistBars = Math.ceil(widthFt / (distSpacingIn / 12)) + 1;
    const totalLengthMain = numMainBars * widthMeters * 2 * 1.07;
    const totalLengthDist = numDistBars * lengthMeters * 2 * 1.07;
    const mainSteelKg = ((mainBar * mainBar) / 162) * totalLengthMain;
    const distSteelKg = ((distBar * distBar) / 162) * totalLengthDist;
    const totalSteelKg = mainSteelKg + distSteelKg;

    // Picket
    let brickQty = 0;
    let picketCost = 0;
    const isPicket = baseType === "picket";
    if (isPicket) {
      brickQty = Math.ceil(aggregateVol * bricksPerCft * 1.1);
      picketCost = brickQty * brickRate;
    }

    const useAggregate = !isPicket;
    const cementCost = cementBags * cementRate;
    const sandCost = sandVol * sandRate;
    const aggCost = useAggregate ? aggregateVol * aggRate : 0;
    const steelCost = totalSteelKg * steelRate;
    const totalCost = cementCost + sandCost + aggCost + steelCost + picketCost;

    setResults({
      volumeSlab: Number(volumeSlab.toFixed(2)),
      volumeSteps: Number(volumeSteps.toFixed(2)),
      totalWetVolume: Number(totalWetVolume.toFixed(2)),
      finalVolume: Number(finalVolume.toFixed(2)),
      dryVolume: Number(dryVolume.toFixed(2)),
      cementBags,
      sandVol: Number(sandVol.toFixed(1)),
      aggregateVol: Number(aggregateVol.toFixed(1)),
      brickQty,
      useAggregate,
      mainSteelKg: Number(mainSteelKg.toFixed(1)),
      distSteelKg: Number(distSteelKg.toFixed(1)),
      totalSteelKg: Number(totalSteelKg.toFixed(1)),
      lengthFt: Number(lengthFt.toFixed(2)),
      widthFt: Number(widthFt.toFixed(2)),
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
    lengthFeet,
    lengthInches,
    widthFeet,
    widthInches,
    thicknessIn,
    mixRatio,
    risers,
    treads,
    riserHeightIn,
    treadWidthIn,
    mainBar,
    mainSpacingIn,
    distBar,
    distSpacingIn,
    baseType,
    brickRate,
    bricksPerCft,
    cementRate,
    sandRate,
    aggRate,
    steelRate,
  ]);

  const resetForm = () => {
    setLengthFeet(16);
    setLengthInches(4);
    setWidthFeet(8);
    setWidthInches(0);
    setThicknessIn(6);
    setRisers(20);
    setTreads(19);
    setRiserHeightIn(5.54);
    setTreadWidthIn(10);
    setMainBar(12);
    setMainSpacingIn(5);
    setDistBar(10);
    setDistSpacingIn(5);
    setMixRatio("1:1.5:3");
    setBaseType("none");
    setCementRate(550);
    setSandRate(45);
    setAggRate(120);
    setSteelRate(95);
  };

  const handleSaveToProject = async () => {
    if (!results) calculate();
    await onSaveEstimate({
      type: "stair",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        config: {
          lengthFeet,
          lengthInches,
          widthFeet,
          widthInches,
          thicknessIn,
          mixRatio,
          risers,
          treads,
          riserHeightIn,
          treadWidthIn,
          mainBar,
          mainSpacingIn,
          distBar,
          distSpacingIn,
        },
        baseType,
        rates: { cementRate, sandRate, aggRate, steelRate, brickRate, bricksPerCft },
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    const c = est.data?.config;
    if (c) {
      if (c.lengthFeet !== undefined) setLengthFeet(c.lengthFeet);
      if (c.lengthInches !== undefined) setLengthInches(c.lengthInches);
      if (c.widthFeet !== undefined) setWidthFeet(c.widthFeet);
      if (c.widthInches !== undefined) setWidthInches(c.widthInches);
      if (c.thicknessIn) setThicknessIn(c.thicknessIn);
      if (c.mixRatio) setMixRatio(c.mixRatio);
      if (c.risers) setRisers(c.risers);
      if (c.treads) setTreads(c.treads);
      if (c.riserHeightIn) setRiserHeightIn(c.riserHeightIn);
      if (c.treadWidthIn) setTreadWidthIn(c.treadWidthIn);
      if (c.mainBar) setMainBar(c.mainBar);
      if (c.mainSpacingIn) setMainSpacingIn(c.mainSpacingIn);
      if (c.distBar) setDistBar(c.distBar);
      if (c.distSpacingIn) setDistSpacingIn(c.distSpacingIn);
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
        type="stair"
        typeLabel="Staircase"
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
              lengthFeet,
              lengthInches,
              widthFeet,
              widthInches,
              thicknessIn,
              mixRatio,
              risers,
              treads,
              riserHeightIn,
              treadWidthIn,
              mainBar,
              mainSpacingIn,
              distBar,
              distSpacingIn,
            },
            baseType,
            rates: { cementRate, sandRate, aggRate, steelRate },
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.config) {
            const c = payload.data.config;
            setLengthFeet(c.lengthFeet || 16);
            setWidthFeet(c.widthFeet || 8);
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
              Staircase Dimensions
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft — in)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  placeholder="ft"
                  value={lengthFeet}
                  step="0.1"
                  onChange={(e) => setLengthFeet(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="in"
                  value={lengthInches}
                  step="0.5"
                  onChange={(e) => setLengthInches(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (ft — in)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  placeholder="ft"
                  value={widthFeet}
                  step="0.1"
                  onChange={(e) => setWidthFeet(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="in"
                  value={widthInches}
                  step="0.5"
                  onChange={(e) => setWidthInches(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Waist Thickness (in)</label>
              <input
                type="number"
                value={thicknessIn}
                step="0.25"
                onChange={(e) => setThicknessIn(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mix Ratio</label>
              <select
                value={mixRatio}
                onChange={(e) => setMixRatio(e.target.value)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value="1:1.5:3">1 : 1.5 : 3 (M20)</option>
                <option value="1:2:4">1 : 2 : 4 (M15)</option>
              </select>
            </div>

            {/* Steps */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Steps & Risers
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">No. of Risers</label>
              <input
                type="number"
                value={risers}
                min="1"
                onChange={(e) => handleRisersChange(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">No. of Treads</label>
              <input
                type="number"
                value={treads}
                min="1"
                onChange={(e) => setTreads(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Riser Height (in)</label>
              <input
                type="number"
                value={riserHeightIn}
                step="0.01"
                onChange={(e) => setRiserHeightIn(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Tread Width (in)</label>
              <input
                type="number"
                value={treadWidthIn}
                step="0.25"
                onChange={(e) => setTreadWidthIn(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            {/* Rebars */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Main & Distribution Steel
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Main Bar Ø (mm)</label>
              <input
                type="number"
                value={mainBar}
                onChange={(e) => setMainBar(parseFloat(e.target.value) || 12)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Main Spacing (in)</label>
              <input
                type="number"
                value={mainSpacingIn}
                step="0.5"
                onChange={(e) => setMainSpacingIn(parseFloat(e.target.value) || 5)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dist Bar Ø (mm)</label>
              <input
                type="number"
                value={distBar}
                onChange={(e) => setDistBar(parseFloat(e.target.value) || 10)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Dist Spacing (in)</label>
              <input
                type="number"
                value={distSpacingIn}
                step="0.5"
                onChange={(e) => setDistSpacingIn(parseFloat(e.target.value) || 5)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
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
                <span>Staircase Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.lengthFt}×{results.widthFt} ft · {risers} Risers
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.cementBags} bags</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.sandVol} cft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">
                    {results.useAggregate ? "Aggregate" : "Picket Brick"}
                  </div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.useAggregate ? `${results.aggregateVol} cft` : `${results.brickQty} pcs`}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Steel</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.totalSteelKg} kg</div>
                </div>
              </div>

              {/* Steel and Volume metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Main ({mainBar}mm)</div>
                  <div className="text-xs font-bold text-white">{results.mainSteelKg} kg</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Dist. ({distBar}mm)</div>
                  <div className="text-xs font-bold text-white">{results.distSteelKg} kg</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Slab Wet Vol</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.volumeSlab} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#a78bfa] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Steps Wet Vol</div>
                  <div className="text-xs font-bold text-[#c4b5fd]">{results.volumeSteps} cft</div>
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
