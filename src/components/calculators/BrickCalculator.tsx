import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { RotateCcw } from "lucide-react";

interface BrickCalculatorProps {
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

export const BrickCalculator: React.FC<BrickCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Brickwork & Plaster Estimate");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  // Inputs
  const [length, setLength] = useState(30);
  const [width, setWidth] = useState(20);
  const [lengthSpans, setLengthSpans] = useState(2);
  const [widthSpans, setWidthSpans] = useState(1);
  const [height, setHeight] = useState(10);

  // Openings
  const [windowCount, setWindowCount] = useState(4);
  const [windowWidth, setWindowWidth] = useState(4);
  const [windowHeight, setWindowHeight] = useState(4);

  const [doorCount, setDoorCount] = useState(2);
  const [doorWidth, setDoorWidth] = useState(3);
  const [doorHeight, setDoorHeight] = useState(7);

  // Brick Details
  const [wallThickness, setWallThickness] = useState(10); // in
  const [brickLengthIn, setBrickLengthIn] = useState(9);
  const [brickWidthIn, setBrickWidthIn] = useState(4.5);
  const [brickHeightIn, setBrickHeightIn] = useState(3);

  // Mortar & Plaster
  const [brickMix, setBrickMix] = useState("1:4");
  const [plasterMix, setPlasterMix] = useState("1:4");
  const [plasterThicknessMm, setPlasterThicknessMm] = useState(12);

  // Rates
  const [brickRate, setBrickRate] = useState(15);
  const [cementRate, setCementRate] = useState(550);
  const [sandRate, setSandRate] = useState(45);

  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  const getMixRatio = (mixStr: string) => {
    const parts = mixStr.split(":").map(Number);
    const c = parts[0] || 1;
    const s = parts[1] || 4;
    return { cement: c, sand: s, total: c + s };
  };

  const calculate = () => {
    setErrorMsg("");
    if (length <= 0 || width <= 0 || height <= 0) {
      setErrorMsg("Enter valid building dimensions.");
      return;
    }
    if (brickLengthIn <= 0 || brickWidthIn <= 0 || brickHeightIn <= 0) {
      setErrorMsg("Enter valid brick dimensions.");
      return;
    }
    if (plasterThicknessMm <= 0) {
      setErrorMsg("Enter valid plaster thickness.");
      return;
    }

    const wallThicknessFt = wallThickness / 12;
    const plasterThicknessFt = plasterThicknessMm / 304.8;
    const bMix = getMixRatio(brickMix);
    const pMix = getMixRatio(plasterMix);

    // Brick with 0.5" mortar joint
    const brickL = (brickLengthIn + 0.5) / 12;
    const brickW = (brickWidthIn + 0.5) / 12;
    const brickH = (brickHeightIn + 0.5) / 12;

    const perimeterArea = 2 * (length * height) + 2 * (width * height);
    const internalLengthWalls = Math.max(0, lengthSpans - 1) * width * height;
    const internalWidthWalls = Math.max(0, widthSpans - 1) * length * height;
    const totalWallArea = perimeterArea + internalLengthWalls + internalWidthWalls;

    const windowArea = Math.max(0, windowCount) * windowWidth * windowHeight;
    const doorArea = Math.max(0, doorCount) * doorWidth * doorHeight;
    const netWallArea = Math.max(0, totalWallArea - windowArea - doorArea);

    if (netWallArea <= 0) {
      setErrorMsg("Net wall area is zero. Reduce openings or increase dimensions.");
      return;
    }

    const brickVolume = brickL * brickW * brickH;
    const wallVolume = netWallArea * wallThicknessFt;
    const totalBricks = Math.ceil(wallVolume / brickVolume);

    const mortarVolume = wallVolume * 0.3; // 30% mortar
    const cementBrick = mortarVolume * (bMix.cement / bMix.total);
    const sandBrick = mortarVolume * (bMix.sand / bMix.total);
    const cementBrickBags = Math.ceil(cementBrick / 1.25);

    // Plaster (both sides)
    const plasterArea = netWallArea * 2;
    const plasterVolume = plasterArea * plasterThicknessFt;
    const cementPlaster = plasterVolume * (pMix.cement / pMix.total);
    const sandPlaster = plasterVolume * (pMix.sand / pMix.total);
    const cementPlasterBags = Math.ceil(cementPlaster / 1.25);

    const totalCementBags = cementBrickBags + cementPlasterBags;
    const totalSand = sandBrick + sandPlaster;

    const brickCost = totalBricks * brickRate;
    const cementCost = totalCementBags * cementRate;
    const sandCost = totalSand * sandRate;
    const totalCost = brickCost + cementCost + sandCost;

    const calcResult = {
      totalBricks,
      totalCementBags,
      totalSand: Number(totalSand.toFixed(1)),
      cementBrickBags,
      sandBrick: Number(sandBrick.toFixed(1)),
      wallVolume: Number(wallVolume.toFixed(1)),
      cementPlasterBags,
      sandPlaster: Number(sandPlaster.toFixed(1)),
      netWallArea: Number(netWallArea.toFixed(0)),
      brickCost,
      cementCost,
      sandCost,
      totalCost,
    };
    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate();
  }, [
    length,
    width,
    lengthSpans,
    widthSpans,
    height,
    windowCount,
    windowWidth,
    windowHeight,
    doorCount,
    doorWidth,
    doorHeight,
    wallThickness,
    brickLengthIn,
    brickWidthIn,
    brickHeightIn,
    brickMix,
    plasterMix,
    plasterThicknessMm,
    brickRate,
    cementRate,
    sandRate,
  ]);

  const resetForm = () => {
    setLength(30);
    setWidth(20);
    setLengthSpans(2);
    setWidthSpans(1);
    setHeight(10);
    setWindowCount(4);
    setWindowWidth(4);
    setWindowHeight(4);
    setDoorCount(2);
    setDoorWidth(3);
    setDoorHeight(7);
    setWallThickness(10);
    setBrickLengthIn(9);
    setBrickWidthIn(4.5);
    setBrickHeightIn(3);
    setBrickMix("1:4");
    setPlasterMix("1:4");
    setPlasterThicknessMm(12);
  };

  const handleSaveToProject = async (asNewCopy = false) => {
    const boq = calculate();
    if (!boq) return;
    await onSaveEstimate({
      id: asNewCopy ? undefined : (editingEstimateId || undefined),
      type: "brick",
      name: asNewCopy ? `${estimateName} (Copy)` : estimateName,
      totalCost: boq.totalCost || 0,
      summary: boq,
      data: {
        config: {
          length,
          width,
          lengthSpans,
          widthSpans,
          height,
          windowCount,
          windowWidth,
          windowHeight,
          doorCount,
          doorWidth,
          doorHeight,
          wallThickness,
          brickLengthIn,
          brickWidthIn,
          brickHeightIn,
          brickMix,
          plasterMix,
          plasterThicknessMm,
        },
        rates: { brickRate, cementRate, sandRate },
      },
    });
  };

  const handleSaveAsCopy = async () => {
    await handleSaveToProject(true);
  };

  const handleClearEstimate = () => {
    setEditingEstimateId(null);
    setEstimateName("New Brickwork Estimate");
    resetForm();
    if (onClearLoadedEstimate) onClearLoadedEstimate();
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    const c = est.data?.config;
    if (c) {
      if (c.length) setLength(c.length);
      if (c.width) setWidth(c.width);
      if (c.lengthSpans) setLengthSpans(c.lengthSpans);
      if (c.widthSpans) setWidthSpans(c.widthSpans);
      if (c.height) setHeight(c.height);
      if (c.windowCount !== undefined) setWindowCount(c.windowCount);
      if (c.doorCount !== undefined) setDoorCount(c.doorCount);
      if (c.wallThickness) setWallThickness(c.wallThickness);
      if (c.brickMix) setBrickMix(c.brickMix);
      if (c.plasterMix) setPlasterMix(c.plasterMix);
    }
    if (est.data?.rates) {
      if (est.data.rates.brickRate) setBrickRate(est.data.rates.brickRate);
      if (est.data.rates.cementRate) setCementRate(est.data.rates.cementRate);
      if (est.data.rates.sandRate) setSandRate(est.data.rates.sandRate);
    }
    calculate();
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "brick" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="brick"
        typeLabel="Brickwork"
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
            config: {
              length,
              width,
              lengthSpans,
              widthSpans,
              height,
              windowCount,
              doorCount,
              wallThickness,
              brickMix,
              plasterMix,
            },
            rates: { brickRate, cementRate, sandRate },
          },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.config) {
            const c = payload.data.config;
            if (c.length) setLength(c.length);
            if (c.width) setWidth(c.width);
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
              Building Dimensions
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
              <NumericInput
                value={length}
                step="0.1"
                onChange={setLength}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (ft)</label>
              <NumericInput
                value={width}
                step="0.1"
                onChange={setWidth}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Spans along Length</label>
              <NumericInput
                value={lengthSpans}
                min="1"
                onChange={(v) => setLengthSpans(Math.max(1, v))}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Spans along Width</label>
              <NumericInput
                value={widthSpans}
                min="1"
                onChange={(v) => setWidthSpans(Math.max(1, v))}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Wall Height (ft)</label>
              <NumericInput
                value={height}
                step="0.1"
                onChange={setHeight}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
              />
            </div>

            {/* Openings */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Openings (Windows & Doors)
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">No. of Windows</label>
              <NumericInput
                value={windowCount}
                min="0"
                allowZero={true}
                onChange={setWindowCount}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Window W × H (ft)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <NumericInput
                  value={windowWidth}
                  step="0.1"
                  onChange={setWindowWidth}
                  className="w-full h-8 px-1.5 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
                <NumericInput
                  value={windowHeight}
                  step="0.1"
                  onChange={setWindowHeight}
                  className="w-full h-8 px-1.5 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">No. of Doors</label>
              <NumericInput
                value={doorCount}
                min="0"
                allowZero={true}
                onChange={setDoorCount}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Door W × H (ft)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <NumericInput
                  value={doorWidth}
                  step="0.1"
                  onChange={setDoorWidth}
                  className="w-full h-8 px-1.5 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
                <NumericInput
                  value={doorHeight}
                  step="0.1"
                  onChange={setDoorHeight}
                  className="w-full h-8 px-1.5 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Brick Details */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Brick & Wall Details
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Wall Thickness</label>
              <select
                value={wallThickness}
                onChange={(e) => setWallThickness(parseFloat(e.target.value) || 10)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value={10}>10 inches</option>
                <option value={5}>5 inches</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick L×W×H (in)</label>
              <div className="grid grid-cols-3 gap-1">
                <NumericInput
                  value={brickLengthIn}
                  step="0.1"
                  onChange={setBrickLengthIn}
                  className="w-full h-8 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-[11px] text-white outline-none"
                />
                <NumericInput
                  value={brickWidthIn}
                  step="0.1"
                  onChange={setBrickWidthIn}
                  className="w-full h-8 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-[11px] text-white outline-none"
                />
                <NumericInput
                  value={brickHeightIn}
                  step="0.1"
                  onChange={setBrickHeightIn}
                  className="w-full h-8 px-1 bg-[#243b55] border border-[#2d4a6a] rounded text-[11px] text-white outline-none"
                />
              </div>
            </div>

            {/* Mortar & Plaster */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Mortar & Plaster
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Brickwork Mix</label>
              <select
                value={brickMix}
                onChange={(e) => setBrickMix(e.target.value)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value="1:3">1 : 3</option>
                <option value="1:4">1 : 4</option>
                <option value="1:5">1 : 5</option>
                <option value="1:6">1 : 6</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Plaster Mix</label>
              <select
                value={plasterMix}
                onChange={(e) => setPlasterMix(e.target.value)}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white"
              >
                <option value="1:3">1 : 3</option>
                <option value="1:4">1 : 4</option>
                <option value="1:5">1 : 5</option>
                <option value="1:6">1 : 6</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Plaster Thickness (mm)</label>
              <NumericInput
                value={plasterThicknessMm}
                step="0.5"
                onChange={setPlasterThicknessMm}
                className="w-full h-8 px-2.5 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            {/* Rates */}
            <div className="col-span-2 text-[10px] text-[#00c2c7] font-semibold border-b border-[#2d4a6a] pb-1 mt-1">
              Rates (৳ BDT)
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Brick Rate (৳/pcs)</label>
              <NumericInput
                value={brickRate}
                onChange={setBrickRate}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Cement (৳/bag)</label>
              <NumericInput
                value={cementRate}
                onChange={setCementRate}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-[#8ba3c1] block mb-1">Sand (৳/cft)</label>
              <NumericInput
                value={sandRate}
                onChange={setSandRate}
                className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
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
                <span>Brickwork & Plaster Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  Net Area: {results.netWallArea} sqft
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Bricks</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {results.totalBricks.toLocaleString()} pcs
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Cement</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.totalCementBags} bags</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Total Sand</div>
                  <div className="text-sm font-bold text-[#f5a623]">{results.totalSand} cft</div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Brick Cement</div>
                  <div className="text-xs font-bold text-white">{results.cementBrickBags} bags</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Brick Sand</div>
                  <div className="text-xs font-bold text-white">{results.sandBrick} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Wall Volume</div>
                  <div className="text-xs font-bold text-white">{results.wallVolume} cft</div>
                </div>

                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Plaster Cement</div>
                  <div className="text-xs font-bold text-white">{results.cementPlasterBags} bags</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Plaster Sand</div>
                  <div className="text-xs font-bold text-white">{results.sandPlaster} cft</div>
                </div>
                <div className="bg-[#1a2b42] border border-[#2d4a6a] rounded p-1.5">
                  <div className="text-[9px] text-[#8ba3c1]">Brick Cost</div>
                  <div className="text-xs font-bold text-[#2ecc71]">
                    ৳ {Math.round(results.brickCost).toLocaleString("en-IN")}
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
