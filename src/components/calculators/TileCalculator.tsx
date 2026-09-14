import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { RotateCcw } from "lucide-react";

interface TileCalculatorProps {
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

export const TileCalculator: React.FC<TileCalculatorProps> = ({
  activeProject,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Tile Estimation");

  // Inputs
  const [tileType, setTileType] = useState("180");
  const [tilePrice, setTilePrice] = useState(180);
  const [tileSize, setTileSize] = useState(2);
  const [length, setLength] = useState(12);
  const [width, setWidth] = useState(10);
  const [includeSkirting, setIncludeSkirting] = useState(true);
  const [skirtingHeight, setSkirtingHeight] = useState(4);
  const [skirtingPrice, setSkirtingPrice] = useState(160);

  const [mortarTh, setMortarTh] = useState(0.5);
  const [wastage, setWastage] = useState(8);
  const [labour, setLabour] = useState(45);
  const [coatingCost, setCoatingCost] = useState(12);
  const [cementCost, setCementCost] = useState(520);
  const [sandCost, setSandCost] = useState(45);

  const [results, setResults] = useState<any>(null);

  const handleTileTypeChange = (val: string) => {
    setTileType(val);
    if (val && val !== "custom") {
      const price = parseFloat(val);
      setTilePrice(price);
      if (val === "160") setSkirtingPrice(160);
    }
  };

  const calculate = () => {
    const perimeter = 2 * (length + width);
    const area = length * width;
    const areaWaste = area * (1 + wastage / 100);
    const tiles = Math.ceil(areaWaste / (tileSize * tileSize));
    const tileCost = areaWaste * tilePrice;

    let skirtingArea = 0;
    let skirtingCost = 0;
    if (includeSkirting) {
      skirtingArea = perimeter * (skirtingHeight / 12) * (1 + wastage / 100);
      skirtingCost = skirtingArea * skirtingPrice;
    }

    const mortarVol = area * (mortarTh / 12);
    const cementVol = mortarVol / 5;
    const sandVol = mortarVol * 0.8;
    const cementBags = Math.ceil(cementVol / 1.25);
    const mortarCost = cementBags * cementCost + sandVol * sandCost;

    const labourCost = area * labour;
    const coatingCostTotal = area * coatingCost;

    const total = tileCost + skirtingCost + mortarCost + labourCost + coatingCostTotal;
    const perSft = area > 0 ? total / area : 0;

    setResults({
      area: Number(area.toFixed(1)),
      areaWaste: Number(areaWaste.toFixed(1)),
      tiles,
      tileCost,
      perimeter: Number(perimeter.toFixed(1)),
      skirtingArea: Number(skirtingArea.toFixed(1)),
      skirtingCost,
      cementBags,
      sandVol: Number(sandVol.toFixed(1)),
      mortarCost,
      labourCost,
      coatingCostTotal,
      perSft: Math.round(perSft),
      totalCost: total,
    });
  };

  useEffect(() => {
    calculate();
  }, [
    tilePrice,
    tileSize,
    length,
    width,
    includeSkirting,
    skirtingHeight,
    skirtingPrice,
    mortarTh,
    wastage,
    labour,
    coatingCost,
    cementCost,
    sandCost,
  ]);

  const resetForm = () => {
    setTileType("180");
    setTilePrice(180);
    setTileSize(2);
    setLength(12);
    setWidth(10);
    setIncludeSkirting(true);
    setSkirtingHeight(4);
    setSkirtingPrice(160);
    setMortarTh(0.5);
    setWastage(8);
    setLabour(45);
    setCoatingCost(12);
    setCementCost(520);
    setSandCost(45);
  };

  const handleSaveToProject = async () => {
    if (!results) calculate();
    await onSaveEstimate({
      type: "tiles",
      name: estimateName,
      totalCost: results?.totalCost || 0,
      summary: results || {},
      data: {
        tileType,
        tilePrice,
        tileSize,
        length,
        width,
        includeSkirting,
        skirtingHeight,
        skirtingPrice,
        mortarTh,
        wastage,
        labour,
        coatingCost,
        cementCost,
        sandCost,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    const d = est.data;
    if (d) {
      if (d.tileType) setTileType(d.tileType);
      if (d.tilePrice) setTilePrice(d.tilePrice);
      if (d.tileSize) setTileSize(d.tileSize);
      if (d.length) setLength(d.length);
      if (d.width) setWidth(d.width);
      if (d.includeSkirting !== undefined) setIncludeSkirting(d.includeSkirting);
      if (d.skirtingHeight) setSkirtingHeight(d.skirtingHeight);
      if (d.skirtingPrice) setSkirtingPrice(d.skirtingPrice);
      if (d.labour) setLabour(d.labour);
      if (d.cementCost) setCementCost(d.cementCost);
      if (d.sandCost) setSandCost(d.sandCost);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="tiles"
        typeLabel="Tiles"
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
            tileType,
            tilePrice,
            tileSize,
            length,
            width,
            includeSkirting,
            skirtingHeight,
            skirtingPrice,
            labour,
            cementCost,
            sandCost,
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.length) setLength(payload.data.length);
          if (payload.data?.width) setWidth(payload.data.width);
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-2 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Tile Type</label>
              <select
                value={tileType}
                onChange={(e) => handleTileTypeChange(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              >
                <option value="120">Ceramic Floor (120 ৳/sft)</option>
                <option value="180">Porcelain (180 ৳/sft)</option>
                <option value="95">Vitrified (95 ৳/sft)</option>
                <option value="160">Homogeneous (160 ৳/sft)</option>
                <option value="250">Marble Look (250 ৳/sft)</option>
                <option value="320">Wooden Look (320 ৳/sft)</option>
                <option value="75">Wall Tile (75 ৳/sft)</option>
                <option value="custom">Custom / Other</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Tile Price (৳/sft)</label>
              <input
                type="number"
                value={tilePrice}
                step="1"
                onChange={(e) => setTilePrice(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Tile Size</label>
              <select
                value={tileSize}
                onChange={(e) => setTileSize(parseFloat(e.target.value) || 2)}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white"
              >
                <option value={1}>1 × 1 ft</option>
                <option value={1.5}>1.5 × 1.5 ft</option>
                <option value={2}>2 × 2 ft</option>
                <option value={2.5}>2.5 × 2.5 ft</option>
                <option value={3}>3 × 3 ft</option>
              </select>
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

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Perimeter (Auto)</label>
              <input
                type="text"
                value={`${(2 * (length + width)).toFixed(1)} ft`}
                readOnly
                className="w-full h-8 px-2.5 bg-[#1e334d] border border-[#2d4a6a] rounded-lg text-xs text-[#8ba3c1] cursor-not-allowed"
              />
            </div>

            {/* Skirting Settings */}
            <div className="col-span-2 bg-[#243b55] border border-[#2d4a6a] rounded-lg p-2.5 flex items-center justify-between">
              <label htmlFor="includeSkirting" className="text-xs text-white font-medium cursor-pointer">
                Include Skirting
              </label>
              <input
                type="checkbox"
                id="includeSkirting"
                checked={includeSkirting}
                onChange={(e) => setIncludeSkirting(e.target.checked)}
                className="w-4 h-4 accent-[#00c2c7] cursor-pointer"
              />
            </div>

            {includeSkirting && (
              <>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Skirting Ht (in)</label>
                  <input
                    type="number"
                    value={skirtingHeight}
                    step="0.5"
                    onChange={(e) => setSkirtingHeight(parseFloat(e.target.value) || 4)}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Skirting Price (৳/sft)</label>
                  <input
                    type="number"
                    value={skirtingPrice}
                    step="1"
                    onChange={(e) => setSkirtingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
                  />
                </div>
              </>
            )}

            {/* Other Costs */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Mortar & Other Costs
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Mortar (inch)</label>
              <input
                type="number"
                value={mortarTh}
                step="0.1"
                onChange={(e) => setMortarTh(parseFloat(e.target.value) || 0.5)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Wastage (%)</label>
              <input
                type="number"
                value={wastage}
                onChange={(e) => setWastage(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Labour (৳/sft)</label>
              <input
                type="number"
                value={labour}
                onChange={(e) => setLabour(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Coating (৳/sft)</label>
              <input
                type="number"
                value={coatingCost}
                onChange={(e) => setCoatingCost(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (৳/bag)</label>
              <input
                type="number"
                value={cementCost}
                onChange={(e) => setCementCost(parseFloat(e.target.value) || 0)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (৳/cft)</label>
              <input
                type="number"
                value={sandCost}
                onChange={(e) => setSandCost(parseFloat(e.target.value) || 0)}
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
                <span>Calculation Result</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.area} sqft · {results.tiles} tiles
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Floor Area</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.area} sqft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">+ Wastage ({wastage}%)</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.areaWaste} sqft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Tiles</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.tiles} pcs</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Tile Cost</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    ৳ {Math.round(results.tileCost).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Secondary Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Skirting Cost</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.skirtingCost).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Mortar Cost</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.mortarCost).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Labour Cost</div>
                  <div className="text-xs font-bold text-white">
                    ৳ {Math.round(results.labourCost).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Cement ({results.cementBags} bags)</div>
                  <div className="text-xs font-bold text-white">{results.sandVol} cft Sand</div>
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="bg-gradient-to-r from-[#0f3d3e] to-[#1a4d3a] border border-[#00c2c7]/40 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#a0d4d4]">Grand Total · Tile Works</div>
                  <div className="text-lg font-bold text-[#00c2c7]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-[#86efac]">
                    Per sft: ৳ {results.perSft}
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
