import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { RotateCcw, Building2, Layers, DollarSign } from "lucide-react";

interface StructuralCalculatorProps {
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

export const StructuralCalculator: React.FC<StructuralCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Full Building Structural Estimate");

  // Inputs
  const [floors, setFloors] = useState(5);
  const [plinthArea, setPlinthArea] = useState(1500); // sqft per floor
  const [buildingType, setBuildingType] = useState<"residential" | "commercial" | "industrial">("residential");
  const [foundationType, setFoundationType] = useState<"isolated" | "mat" | "pile">("isolated");

  // Material Factors per sqft
  const [steelFactor, setSteelFactor] = useState(3.8); // kg / sqft
  const [cementFactor, setCementFactor] = useState(0.42); // bags / sqft
  const [sandFactor, setSandFactor] = useState(0.85); // cft / sqft
  const [aggFactor, setAggFactor] = useState(1.25); // cft / sqft
  const [brickFactor, setBrickFactor] = useState(24); // bricks / sqft
  const [labourRateSqft, setLabourRateSqft] = useState(280); // ৳ / sqft

  // Unit Rates (৳ BDT)
  const [steelRate, setSteelRate] = useState(95); // ৳/kg
  const [cementRate, setCementRate] = useState(550); // ৳/bag
  const [sandRate, setSandRate] = useState(45); // ৳/cft
  const [aggRate, setAggRate] = useState(120); // ৳/cft
  const [brickRate, setBrickRate] = useState(15); // ৳/pcs

  // Extra Works Percentages
  const [includeFinishing, setIncludeFinishing] = useState(true);
  const [finishingPercent, setFinishingPercent] = useState(25); // % of structural cost for plumbing, electrical, paint

  const [results, setResults] = useState<any>(null);

  const calculate = () => {
    const totalBuiltUpArea = floors * plinthArea;

    // Foundation multiplier
    let foundationMulti = 1.0;
    if (foundationType === "mat") foundationMulti = 1.12;
    if (foundationType === "pile") foundationMulti = 1.25;

    // Building type multiplier
    let typeMulti = 1.0;
    if (buildingType === "commercial") typeMulti = 1.15;
    if (buildingType === "industrial") typeMulti = 1.25;

    const totalSteelKg = Math.round(totalBuiltUpArea * steelFactor * foundationMulti * typeMulti);
    const totalCementBags = Math.round(totalBuiltUpArea * cementFactor * foundationMulti * typeMulti);
    const totalSandCft = Math.round(totalBuiltUpArea * sandFactor * foundationMulti * typeMulti);
    const totalAggCft = Math.round(totalBuiltUpArea * aggFactor * foundationMulti * typeMulti);
    const totalBricks = Math.round(totalBuiltUpArea * brickFactor * typeMulti);

    const steelCost = totalSteelKg * steelRate;
    const cementCost = totalCementBags * cementRate;
    const sandCost = totalSandCft * sandRate;
    const aggCost = totalAggCft * aggRate;
    const brickCost = totalBricks * brickRate;
    const labourCost = totalBuiltUpArea * labourRateSqft;

    const structuralCost = steelCost + cementCost + sandCost + aggCost + brickCost + labourCost;

    let finishingCost = 0;
    if (includeFinishing) {
      finishingCost = (structuralCost * finishingPercent) / 100;
    }

    const grandTotal = structuralCost + finishingCost;
    const costPerSqft = totalBuiltUpArea > 0 ? grandTotal / totalBuiltUpArea : 0;
    const costPerFloor = floors > 0 ? grandTotal / floors : 0;

    setResults({
      totalBuiltUpArea,
      totalSteelKg,
      totalCementBags,
      totalSandCft,
      totalAggCft,
      totalBricks,
      steelCost,
      cementCost,
      sandCost,
      aggCost,
      brickCost,
      labourCost,
      structuralCost,
      finishingCost,
      grandTotal,
      costPerSqft: Math.round(costPerSqft),
      costPerFloor: Math.round(costPerFloor),
    });
  };

  useEffect(() => {
    calculate();
  }, [
    floors,
    plinthArea,
    buildingType,
    foundationType,
    steelFactor,
    cementFactor,
    sandFactor,
    aggFactor,
    brickFactor,
    labourRateSqft,
    steelRate,
    cementRate,
    sandRate,
    aggRate,
    brickRate,
    includeFinishing,
    finishingPercent,
  ]);

  const resetForm = () => {
    setFloors(5);
    setPlinthArea(1500);
    setBuildingType("residential");
    setFoundationType("isolated");
    setSteelFactor(3.8);
    setCementFactor(0.42);
    setSandFactor(0.85);
    setAggFactor(1.25);
    setBrickFactor(24);
    setLabourRateSqft(280);
    setSteelRate(95);
    setCementRate(550);
    setSandRate(45);
    setAggRate(120);
    setBrickRate(15);
    setIncludeFinishing(true);
    setFinishingPercent(25);
  };

  const handleSaveToProject = async () => {
    if (!results) calculate();
    await onSaveEstimate({
      type: "structural",
      name: estimateName,
      totalCost: results?.grandTotal || 0,
      summary: results || {},
      data: {
        config: {
          floors,
          plinthArea,
          buildingType,
          foundationType,
          steelFactor,
          cementFactor,
          sandFactor,
          aggFactor,
          brickFactor,
          labourRateSqft,
          includeFinishing,
          finishingPercent,
        },
        rates: { steelRate, cementRate, sandRate, aggRate, brickRate },
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    const c = est.data?.config;
    if (c) {
      if (c.floors) setFloors(c.floors);
      if (c.plinthArea) setPlinthArea(c.plinthArea);
      if (c.buildingType) setBuildingType(c.buildingType);
      if (c.foundationType) setFoundationType(c.foundationType);
      if (c.steelFactor) setSteelFactor(c.steelFactor);
      if (c.cementFactor) setCementFactor(c.cementFactor);
      if (c.sandFactor) setSandFactor(c.sandFactor);
      if (c.aggFactor) setAggFactor(c.aggFactor);
      if (c.brickFactor) setBrickFactor(c.brickFactor);
      if (c.labourRateSqft) setLabourRateSqft(c.labourRateSqft);
      if (c.includeFinishing !== undefined) setIncludeFinishing(c.includeFinishing);
      if (c.finishingPercent) setFinishingPercent(c.finishingPercent);
    }
    if (est.data?.rates) {
      const r = est.data.rates;
      if (r.steelRate) setSteelRate(r.steelRate);
      if (r.cementRate) setCementRate(r.cementRate);
      if (r.sandRate) setSandRate(r.sandRate);
      if (r.aggRate) setAggRate(r.aggRate);
      if (r.brickRate) setBrickRate(r.brickRate);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="structural"
        typeLabel="Whole Building"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        onSave={handleSaveToProject}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.grandTotal || 0,
          summary: results || {},
          data: {
            config: {
              floors,
              plinthArea,
              buildingType,
              foundationType,
              steelFactor,
              cementFactor,
              sandFactor,
              aggFactor,
              brickFactor,
              labourRateSqft,
            },
            rates: { steelRate, cementRate, sandRate, aggRate, brickRate },
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.config) {
            const c = payload.data.config;
            if (c.floors) setFloors(c.floors);
            if (c.plinthArea) setPlinthArea(c.plinthArea);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="col-span-2 sm:col-span-3 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Building Specifications
              </span>
              <span className="text-[#f5a623] font-mono">
                {(floors * plinthArea).toLocaleString()} sqft total
              </span>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Number of Storeys</label>
              <input
                type="number"
                value={floors}
                min="1"
                onChange={(e) => setFloors(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Plinth Area / Floor (sft)</label>
              <input
                type="number"
                value={plinthArea}
                step="50"
                onChange={(e) => setPlinthArea(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Building Occupancy</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial (+15%)</option>
                <option value="industrial">Industrial (+25%)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Foundation Type</label>
              <select
                value={foundationType}
                onChange={(e) => setFoundationType(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              >
                <option value="isolated">Isolated Footings</option>
                <option value="mat">Raft / Mat Foundation</option>
                <option value="pile">Deep Pile Foundation</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Labour Rate (৳/sqft)</label>
              <input
                type="number"
                value={labourRateSqft}
                step="5"
                onChange={(e) => setLabourRateSqft(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Finishing & MEP (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeFinishing}
                  onChange={(e) => setIncludeFinishing(e.target.checked)}
                  className="w-4 h-4 accent-[#00c2c7]"
                />
                <input
                  type="number"
                  value={finishingPercent}
                  disabled={!includeFinishing}
                  onChange={(e) => setFinishingPercent(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white disabled:opacity-50"
                />
              </div>
            </div>

            {/* Consumption Factors */}
            <div className="col-span-2 sm:col-span-3 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Quantity Factors (Consumption Per Sqft Built-up Area)
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Steel (kg/sft)</label>
              <input
                type="number"
                value={steelFactor}
                step="0.1"
                onChange={(e) => setSteelFactor(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (bags/sft)</label>
              <input
                type="number"
                value={cementFactor}
                step="0.01"
                onChange={(e) => setCementFactor(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (cft/sft)</label>
              <input
                type="number"
                value={sandFactor}
                step="0.05"
                onChange={(e) => setSandFactor(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Aggregate (cft/sft)</label>
              <input
                type="number"
                value={aggFactor}
                step="0.05"
                onChange={(e) => setAggFactor(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Bricks (pcs/sft)</label>
              <input
                type="number"
                value={brickFactor}
                step="1"
                onChange={(e) => setBrickFactor(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Actions</label>
              <button
                type="button"
                onClick={resetForm}
                className="w-full h-8 border border-[#00c2c7] text-[#00c2c7] hover:bg-[#00c2c7]/10 rounded text-xs font-semibold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            {/* Rates */}
            <div className="col-span-2 sm:col-span-3 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Market Rates (৳ BDT)
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Steel (৳/kg)</label>
              <input
                type="number"
                value={steelRate}
                onChange={(e) => setSteelRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (৳/bag)</label>
              <input
                type="number"
                value={cementRate}
                onChange={(e) => setCementRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (৳/cft)</label>
              <input
                type="number"
                value={sandRate}
                onChange={(e) => setSandRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Aggregate (৳/cft)</label>
              <input
                type="number"
                value={aggRate}
                onChange={(e) => setAggRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick (৳/pcs)</label>
              <input
                type="number"
                value={brickRate}
                onChange={(e) => setBrickRate(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>
          </div>

          {/* Results Display */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-3">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Total Materials Bill of Quantities (BOQ)</span>
                <span className="text-[11px] text-[#f5a623] font-mono">
                  {floors} Floors · {results.totalBuiltUpArea.toLocaleString()} sqft
                </span>
              </div>

              {/* 5 Material Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Rebar Steel</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {(results.totalSteelKg / 1000).toFixed(2)} MT
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">{results.totalSteelKg.toLocaleString()} kg</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.totalCementBags.toLocaleString()} bags
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    ৳ {Math.round(results.cementCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Coarse Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.totalSandCft.toLocaleString()} cft
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    ৳ {Math.round(results.sandCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Aggregate</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.totalAggCft.toLocaleString()} cft
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    ৳ {Math.round(results.aggCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center col-span-2 sm:col-span-1">
                  <div className="text-[9px] text-[#8ba3c1]">Bricks</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.totalBricks.toLocaleString()} pcs
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    ৳ {Math.round(results.brickCost).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Financial Sub-totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2">
                  <div className="text-[9px] text-[#8ba3c1]">Structural Materials</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.steelCost + results.cementCost + results.sandCost + results.aggCost + results.brickCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2">
                  <div className="text-[9px] text-[#8ba3c1]">Labour Cost</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.labourCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2">
                  <div className="text-[9px] text-[#8ba3c1]">Finishing & MEP</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.finishingCost).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#00c2c7]/40 rounded-lg p-2">
                  <div className="text-[9px] text-[#00c2c7]">Cost / Sqft</div>
                  <div className="text-xs font-bold text-[#00c2c7]">
                    ৳ {results.costPerSqft.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Grand Total Hero Card */}
              <div className="bg-gradient-to-r from-[#0f3d3e] via-[#154636] to-[#0d2a20] border border-[#2ecc71] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="text-xs text-[#a3e4bd] font-medium">Estimated Project Grand Total</div>
                  <div className="text-2xl font-black text-[#2ecc71]">
                    ৳ {Math.round(results.grandTotal).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-[#8ba3c1]">
                    Approx. ৳ {Math.round(results.costPerFloor).toLocaleString("en-IN")} per floor
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveToProject}
                  className="bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-4 py-2 rounded-lg text-xs font-bold shadow-md transition whitespace-nowrap"
                >
                  Save Whole Project Estimate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
