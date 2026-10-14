import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, TileRoomItem } from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import { StoreyMultiplierBar } from "../common/StoreyMultiplierBar";
import {
  RotateCcw,
  Grid3X3,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Building2,
} from "lucide-react";

interface TileCalculatorProps {
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

export const TileCalculator: React.FC<TileCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Floor & Wall Tiles Estimate");
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

  // Added Tile Rooms List
  const [rooms, setRooms] = useState<TileRoomItem[]>([
    {
      id: "room_1",
      nos: 1,
      name: "Living & Dining Room",
      length: 20,
      width: 15,
      tileType: "180",
      tilePrice: 180,
      tileSize: 2,
      includeSkirting: true,
      skirtingHeight: 4,
      skirtingPrice: 160,
      mortarTh: 0.5,
      wastage: 8,
      labour: 45,
    },
    {
      id: "room_2",
      nos: 2,
      name: "Bedrooms (Bed 1 & Bed 2)",
      length: 14,
      width: 12,
      tileType: "160",
      tilePrice: 160,
      tileSize: 2,
      includeSkirting: true,
      skirtingHeight: 4,
      skirtingPrice: 160,
      mortarTh: 0.5,
      wastage: 8,
      labour: 45,
    },
  ]);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);

  // Form Inputs
  const [roomName, setRoomName] = useState("Master Bedroom");
  const [roomNos, setRoomNos] = useState(1);
  const [length, setLength] = useState(14);
  const [width, setWidth] = useState(12);

  const [tileType, setTileType] = useState(() => String(activeProject?.rates?.tileRate || 180));
  const [tilePrice, setTilePrice] = useState(() => activeProject?.rates?.tileRate || 180);
  const [tileSize, setTileSize] = useState(2); // 2' x 2'

  const [includeSkirting, setIncludeSkirting] = useState(true);
  const [skirtingHeight, setSkirtingHeight] = useState(4); // inches
  const [skirtingPrice, setSkirtingPrice] = useState(160);

  const [mortarTh, setMortarTh] = useState(0.5); // inches
  const [wastage, setWastage] = useState(8); // %
  const [labour, setLabour] = useState(45); // ৳/sqft

  // Rates initialized from activeProject.rates or defaults
  const [cementRate, setCementRate] = useState(() => activeProject?.rates?.cementRate || 550);
  const [sandRate, setSandRate] = useState(() => activeProject?.rates?.sandRate || 45);

  useEffect(() => {
    if (activeProject?.rates) {
      if (activeProject.rates.tileRate) {
        setTilePrice(activeProject.rates.tileRate);
        setTileType(String(activeProject.rates.tileRate));
      }
      if (activeProject.rates.cementRate) setCementRate(activeProject.rates.cementRate);
      if (activeProject.rates.sandRate) setSandRate(activeProject.rates.sandRate);
    }
  }, [activeProject?.rates]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState<any>(null);

  const handleTileTypeChange = (val: string) => {
    setTileType(val);
    if (val && val !== "custom") {
      const price = parseFloat(val);
      setTilePrice(price);
      if (val === "160") setSkirtingPrice(160);
      if (val === "180") setSkirtingPrice(180);
      if (val === "240") setSkirtingPrice(200);
    }
  };

  const getCurrentFormRoom = (): TileRoomItem => ({
    id: editingRoomIndex !== null ? rooms[editingRoomIndex]?.id : "room_" + Date.now(),
    nos: roomNos > 0 ? roomNos : 1,
    name: roomName.trim() || `Room ${rooms.length + 1}`,
    length: length > 0 ? length : 1,
    width: width > 0 ? width : 1,
    tileType,
    tilePrice: tilePrice > 0 ? tilePrice : 180,
    tileSize: tileSize > 0 ? tileSize : 2,
    includeSkirting,
    skirtingHeight: skirtingHeight > 0 ? skirtingHeight : 4,
    skirtingPrice: skirtingPrice > 0 ? skirtingPrice : 160,
    mortarTh: mortarTh > 0 ? mortarTh : 0.5,
    wastage: wastage >= 0 ? wastage : 8,
    labour: labour >= 0 ? labour : 45,
  });

  const loadRoomIntoForm = (r: TileRoomItem, idx: number) => {
    setEditingRoomIndex(idx);
    setRoomName(r.name);
    setRoomNos(r.nos);
    setLength(r.length);
    setWidth(r.width);
    setTileType(r.tileType || "180");
    setTilePrice(r.tilePrice || 180);
    setTileSize(r.tileSize || 2);
    setIncludeSkirting(Boolean(r.includeSkirting));
    setSkirtingHeight(r.skirtingHeight || 4);
    setSkirtingPrice(r.skirtingPrice || 160);
    setMortarTh(r.mortarTh || 0.5);
    setWastage(r.wastage !== undefined ? r.wastage : 8);
    setLabour(r.labour !== undefined ? r.labour : 45);
    setErrorMsg("");
  };

  const handleAddNewRoom = () => {
    setErrorMsg("");
    if (length <= 0 || width <= 0) {
      setErrorMsg("Please enter valid room dimensions (Length, Width > 0).");
      return;
    }
    const current = getCurrentFormRoom();
    const nextList = [...rooms, current];
    setRooms(nextList);
    calculate(nextList);

    setEditingRoomIndex(null);
    setRoomName(`Room ${nextList.length + 1}`);
    setRoomNos(1);
    setSuccessMsg(`✓ Added ${current.name} to tiles list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateRoom = () => {
    setErrorMsg("");
    if (editingRoomIndex === null || editingRoomIndex < 0 || editingRoomIndex >= rooms.length) {
      handleAddNewRoom();
      return;
    }
    const current = getCurrentFormRoom();
    const nextList = [...rooms];
    nextList[editingRoomIndex] = current;
    setRooms(nextList);
    calculate(nextList);

    setSuccessMsg(`✓ Updated ${current.name} in list!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDuplicateRoom = (idx: number) => {
    const orig = rooms[idx];
    if (!orig) return;
    const duplicated: TileRoomItem = {
      ...orig,
      id: "room_" + Date.now(),
      name: `${orig.name} (Copy)`,
    };
    const nextList = [...rooms, duplicated];
    setRooms(nextList);
    calculate(nextList);
    setSuccessMsg(`✓ Duplicated ${orig.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const deleteRoom = (idx: number) => {
    const nextList = rooms.filter((_, i) => i !== idx);
    setRooms(nextList);
    if (nextList.length > 0) {
      calculate(nextList);
      if (editingRoomIndex === idx) {
        setEditingRoomIndex(null);
        setRoomName(`Room ${nextList.length + 1}`);
      } else if (editingRoomIndex !== null && editingRoomIndex > idx) {
        setEditingRoomIndex(editingRoomIndex - 1);
      }
    } else {
      setEditingRoomIndex(null);
      setRoomName("Room 1");
      setResults(null);
    }
  };

  const resetForm = () => {
    setRoomName("Room 1");
    setRoomNos(1);
    setLength(14);
    setWidth(12);
    setTileType("180");
    setTilePrice(180);
    setTileSize(2);
    setIncludeSkirting(true);
    setSkirtingHeight(4);
    setSkirtingPrice(160);
    setMortarTh(0.5);
    setWastage(8);
    setLabour(45);
    setEditingRoomIndex(null);
    setErrorMsg("");
  };

  const calculate = (list = rooms) => {
    setErrorMsg("");
    if (!list || list.length === 0) {
      setResults(null);
      return null;
    }

    let totalFloorArea = 0;
    let totalSkirtingArea = 0;
    let totalGrossTileArea = 0;
    let totalTilePieces = 0;
    let totalTileCost = 0;
    let totalMortarCement = 0;
    let totalMortarSand = 0;
    let totalLabourCost = 0;

    list.forEach((r) => {
      const nos = r.nos > 0 ? r.nos : 1;
      const fArea = r.length * r.width * nos;
      const perimeter = 2 * (r.length + r.width) * nos;

      let sArea = 0;
      if (r.includeSkirting) {
        const sHeightFt = (r.skirtingHeight || 4) / 12;
        sArea = perimeter * sHeightFt;
      }

      const wastageMul = 1 + (r.wastage || 8) / 100;
      const roomTileArea = (fArea + sArea) * wastageMul;
      const pieceArea = (r.tileSize || 2) * (r.tileSize || 2);
      const pieces = Math.ceil(roomTileArea / pieceArea);

      const rTileCost = fArea * wastageMul * (r.tilePrice || 180) + (sArea > 0 ? sArea * wastageMul * (r.skirtingPrice || 160) : 0);

      // Mortar
      const mThFt = (r.mortarTh || 0.5) / 12;
      const wetMortar = (fArea + sArea) * mThFt;
      const dryMortar = wetMortar * 1.5;
      // 1:4 mix
      const cVol = dryMortar * (1 / 5);
      const sVol = dryMortar * (4 / 5);

      const rLabour = (fArea + (r.includeSkirting ? perimeter : 0)) * (r.labour || 45);

      totalFloorArea += fArea;
      totalSkirtingArea += sArea;
      totalGrossTileArea += roomTileArea;
      totalTilePieces += pieces;
      totalTileCost += rTileCost;
      totalMortarCement += cVol / 1.25;
      totalMortarSand += sVol;
      totalLabourCost += rLabour;
    });

    const cementBags = Math.ceil(totalMortarCement);
    const sandVolume = Number(totalMortarSand.toFixed(1));
    const cementCost = cementBags * cementRate;
    const sandCost = sandVolume * sandRate;

    const singleFloorTotalCost = totalTileCost + cementCost + sandCost + totalLabourCost;

    // Apply Storey Multiplier
    const effMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
    const multipliedCost = singleFloorTotalCost * effMultiplier;

    const calcResult = {
      totalFloorArea: Number(((isMultiplying ? totalFloorArea * effMultiplier : totalFloorArea)).toFixed(1)),
      totalSkirtingArea: Number(((isMultiplying ? totalSkirtingArea * effMultiplier : totalSkirtingArea)).toFixed(1)),
      totalGrossTileArea: Number(((isMultiplying ? totalGrossTileArea * effMultiplier : totalGrossTileArea)).toFixed(1)),
      totalTilePieces: isMultiplying ? totalTilePieces * effMultiplier : totalTilePieces,
      totalBoxes: isMultiplying ? Math.ceil((totalTilePieces * effMultiplier) / 4) : Math.ceil(totalTilePieces / 4),
      cementBags: isMultiplying ? Math.ceil(cementBags * effMultiplier) : cementBags,
      sandVolume: Number(((isMultiplying ? sandVolume * effMultiplier : sandVolume)).toFixed(1)),
      totalTileCost: Math.round(isMultiplying ? totalTileCost * effMultiplier : totalTileCost),
      cementCost,
      sandCost,
      totalLabourCost: Math.round(isMultiplying ? totalLabourCost * effMultiplier : totalLabourCost),
      singleFloorTotalCost,
      totalRoomsCount: (list.reduce((sum, r) => sum + r.nos, 0)) * effMultiplier,
      singleFloorRoomsCount: list.reduce((sum, r) => sum + r.nos, 0),
      // Single floor details
      singleFloorCementBags: cementBags,
      singleFloorSandVolume: sandVolume,
      singleFloorTilePieces: totalTilePieces,
      singleFloorBoxes: Math.ceil(totalTilePieces / 4),
      // Storey multiplier details
      multiplier: effMultiplier,
      isMultiplying,
      totalCost: multipliedCost,
      // Multiplied materials for full building
      multipliedTileArea: Number((totalGrossTileArea * effMultiplier).toFixed(1)),
      multipliedTilePieces: totalTilePieces * effMultiplier,
      multipliedBoxes: Math.ceil((totalTilePieces * effMultiplier) / 4),
      multipliedCementBags: Math.ceil(cementBags * effMultiplier),
      multipliedSandCft: Number((sandVolume * effMultiplier).toFixed(1)),
    };

    setResults(calcResult);
    return calcResult;
  };

  useEffect(() => {
    calculate(rooms);
  }, [multiplier, isMultiplying, cementRate, sandRate]);

  const handleSaveToProject = async (asNewCopy = false) => {
    let currentRooms = [...rooms];
    if (editingRoomIndex !== null && editingRoomIndex < currentRooms.length) {
      currentRooms[editingRoomIndex] = getCurrentFormRoom();
    } else if (currentRooms.length === 0) {
      currentRooms = [getCurrentFormRoom()];
    }
    setRooms(currentRooms);
    const boq = calculate(currentRooms);
    if (!boq) return;

    await onSaveEstimate({
      id: asNewCopy ? undefined : editingEstimateId || undefined,
      type: "tiles",
      name: estimateName.trim() || "Floor & Wall Tiles Estimate",
      totalCost: boq.totalCost,
      summary: boq,
      data: {
        rooms: currentRooms,
        rates: { cementRate, sandRate },
        multiplier,
        isMultiplying,
      },
    });
  };

  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name);
    if (est.data?.rooms && est.data.rooms.length > 0) {
      setRooms(est.data.rooms);
      loadRoomIntoForm(est.data.rooms[0], 0);
    }
    if (est.data?.rates) {
      setCementRate(est.data.rates.cementRate || 550);
      setSandRate(est.data.rates.sandRate || 45);
    }
    if (est.data?.multiplier) {
      setMultiplier(est.data.multiplier);
      setIsMultiplying(Boolean(est.data.isMultiplying));
    }
    calculate(est.data?.rooms || rooms);
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "tiles" && loadedEstimate.id !== editingEstimateId) {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate, editingEstimateId]);

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      <SaveEstimateBar
        type="tiles"
        typeLabel="Tiles"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Tiles Estimate");
          setRooms([]);
          resetForm();
          setResults(null);
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: results?.totalCost || 0,
          summary: results || {},
          data: { rooms, multiplier, isMultiplying, rates: { cementRate, sandRate } },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.rooms) {
            setRooms(payload.data.rooms);
            calculate(payload.data.rooms);
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
            itemTypeLabel="Tile Rooms"
          />

          {/* Editing Banner */}
          {editingRoomIndex !== null && editingRoomIndex < rooms.length && (
            <div className="bg-[#00c2c7]/10 border border-[#00c2c7] text-[#00c2c7] px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
              <span>
                Editing: <strong>{rooms[editingRoomIndex].name}</strong> (Room {editingRoomIndex + 1} of {rooms.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs underline hover:text-white"
              >
                Cancel / Switch to New
              </button>
            </div>
          )}

          {/* Tile Form Inputs */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
              <span className="text-xs font-bold text-[#00c2c7] flex items-center gap-1.5">
                <Grid3X3 className="w-3.5 h-3.5" />
                {editingRoomIndex !== null ? "Edit Room / Tile Area" : "Room Geometry & Tile Specification"}
              </span>
              <span className="text-[10px] text-[#8ba3c1]">Floor & Skirting Work</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Room / Space Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Master Bedroom"
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Quantity (Nos)</label>
                <NumericInput
                  value={roomNos}
                  onChange={setRoomNos}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Tile Quality Preset</label>
                <select
                  value={tileType}
                  onChange={(e) => handleTileTypeChange(e.target.value)}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                >
                  <option value="180">180 ৳/sft (Homogeneous)</option>
                  <option value="160">160 ৳/sft (Ceramic)</option>
                  <option value="240">240 ৳/sft (Porcelain)</option>
                  <option value="custom">Custom Rate</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Length (ft)</label>
                <NumericInput
                  value={length}
                  onChange={setLength}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Width (ft)</label>
                <NumericInput
                  value={width}
                  onChange={setWidth}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Tile Size (ft)</label>
                <select
                  value={tileSize}
                  onChange={(e) => setTileSize(Number(e.target.value))}
                  className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                >
                  <option value={2}>2' × 2' (4 sq.ft)</option>
                  <option value={1}>1' × 1' (1 sq.ft)</option>
                  <option value={1.5}>1.5' × 1.5'</option>
                  <option value={2.5}>2' × 4' (8 sq.ft)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">Floor Area</label>
                <div className="w-full h-8 px-2 bg-[#0e1624] border border-[#2d4a6a] rounded text-xs text-[#00c2c7] font-mono flex items-center font-bold">
                  {(length * width * roomNos).toFixed(0)} sq.ft
                </div>
              </div>
            </div>

            {/* Skirting & Laying Options */}
            <div className="border-t border-[#2d4a6a] pt-2 space-y-2">
              <span className="text-[11px] font-bold text-[#f5a623] block">
                Skirting Border & Installation Options
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="tileSkirting"
                    checked={includeSkirting}
                    onChange={(e) => setIncludeSkirting(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#00c2c7]"
                  />
                  <label htmlFor="tileSkirting" className="text-xs text-white font-medium cursor-pointer">
                    Include Skirting
                  </label>
                </div>

                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Skirting Height (in)</label>
                  <NumericInput
                    value={skirtingHeight}
                    onChange={setSkirtingHeight}
                    disabled={!includeSkirting}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Wastage (%)</label>
                  <NumericInput
                    value={wastage}
                    onChange={setWastage}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Labour (৳/sq.ft)</label>
                  <NumericInput
                    value={labour}
                    onChange={setLabour}
                    className="w-full h-8 px-2 bg-[#243b55] border border-[#2d4a6a] rounded text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#2d4a6a]">
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
                onClick={editingRoomIndex !== null && editingRoomIndex < rooms.length ? handleUpdateRoom : handleAddNewRoom}
                className="flex-2 h-9 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] text-[#0f1c2e] hover:opacity-90 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {editingRoomIndex !== null && editingRoomIndex < rooms.length ? "Update Room in List" : "+ Add Room / Area to List"}
              </button>
            </div>
          </div>

          {/* Rooms List Schedule */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-xs font-semibold text-[#00c2c7] mb-2 border-b border-[#2d4a6a] pb-1.5">
              <span>Added Rooms / Areas Schedule</span>
              <span className="bg-[#243b55] px-2 py-0.5 rounded text-white font-mono text-[11px]">
                {rooms.length} area{rooms.length !== 1 ? "s" : ""}
              </span>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8ba3c1]">
                No rooms in list yet. Enter dimensions and click "+ Add Room / Area to List".
              </div>
            ) : (
              <div className="space-y-1.5">
                {rooms.map((r, idx) => {
                  const isBeingEdited = editingRoomIndex === idx;
                  const fArea = r.length * r.width * r.nos;
                  return (
                    <div
                      key={r.id || idx}
                      className={`border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition ${
                        isBeingEdited
                          ? "bg-[#00c2c7]/10 border-[#00c2c7] shadow-sm"
                          : "bg-[#1a2b42] border-[#2d4a6a] hover:border-[#00c2c7]/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {r.nos} × {r.name}
                          </span>
                          <span className="text-[9px] bg-[#00c2c7]/20 text-[#00c2c7] px-1.5 py-0.2 rounded font-bold">
                            {fArea} sq.ft
                          </span>
                          {isBeingEdited && (
                            <span className="text-[9px] bg-[#00c2c7] text-[#0f1c2e] font-bold px-1.5 py-0.2 rounded">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8ba3c1] truncate mt-0.5">
                          {r.length}' × {r.width}' · {r.tileSize}'×{r.tileSize}' Tiles · ৳{r.tilePrice}/sft · {r.includeSkirting ? `Skirting ${r.skirtingHeight}"` : "No skirting"} · Labour ৳{r.labour}/sft
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadRoomIntoForm(r, idx)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                            isBeingEdited
                              ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                              : "bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7]"
                          }`}
                          title="Edit room in form"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateRoom(idx)}
                          className="px-2 py-1 bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white rounded text-xs font-semibold transition flex items-center gap-1 border border-[#2d4a6a]"
                          title="Duplicate room"
                        >
                          <Copy className="w-3 h-3 text-[#f5a623]" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRoom(idx)}
                          className="w-7 h-7 bg-[#ff4d6d]/20 hover:bg-[#ff4d6d] text-[#ff4d6d] hover:text-white rounded flex items-center justify-center text-xs font-bold transition"
                          title="Delete room"
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

          {/* Rates Settings */}
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-[#00c2c7] block">Bedding Mortar Rates</span>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3 shadow-xl space-y-3">
              <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
                <span>Material & Cost Summary</span>
                <span className="text-[10px] text-[#8ba3c1] font-mono">
                  {results.totalRoomsCount} Rooms · {results.totalFloorArea} sq.ft Floor Area
                </span>
              </div>

              {/* Material Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Gross Tiles Area</div>
                  <div className="text-sm font-bold text-[#00c2c7]">
                    {isMultiplying ? results.multipliedTileArea : results.totalGrossTileArea} sq.ft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.totalGrossTileArea} sq.ft / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#f5a623] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Tiles Quantity</div>
                  <div className="text-sm font-bold text-[#f5a623]">
                    {isMultiplying ? results.multipliedTilePieces : results.totalTilePieces} pcs
                  </div>
                  <div className="text-[9px] text-[#8ba3c1]">
                    ~{isMultiplying ? results.multipliedBoxes : results.totalBoxes} boxes
                  </div>
                </div>

                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Mortar Cement</div>
                  <div className="text-sm font-bold text-[#2ecc71]">
                    {isMultiplying ? results.multipliedCementBags : results.cementBags} bags
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.cementBags} bags / floor)
                    </div>
                  )}
                </div>

                <div className="bg-[#1a2b42] border border-[#2ecc71] rounded-lg p-2 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Mortar Sand</div>
                  <div className="text-sm font-bold text-[#2ecc71]">
                    {isMultiplying ? results.multipliedSandCft : results.sandVolume} cft
                  </div>
                  {isMultiplying && (
                    <div className="text-[9px] text-[#8ba3c1]">
                      ({results.sandVolume} cft / floor)
                    </div>
                  )}
                </div>
              </div>

              {/* Total Cost Display with Multiplier Breakdown */}
              <div className="bg-gradient-to-r from-[#1a3a2a] to-[#0f2a1e] border border-[#2ecc71] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
                <div>
                  <div className="text-[10px] text-[#8ba3c1] uppercase font-bold tracking-wider">
                    {isMultiplying
                      ? `Full Building Tiles Budget (×${multiplier} Storeys)`
                      : "Typical Floor Tiles Budget"}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#2ecc71]">
                    ৳ {Math.round(results.totalCost).toLocaleString("en-IN")}
                  </div>
                </div>

                {isMultiplying && (
                  <div className="text-right sm:border-l sm:border-[#2ecc71]/30 sm:pl-3">
                    <div className="text-[10px] text-[#8ba3c1]">Per Typical Floor</div>
                    <div className="text-sm font-bold text-white">
                      ৳ {Math.round(results.singleFloorTotalCost).toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
