import React, { useState, useEffect } from "react";
import {
  Project,
  ProjectEstimateItem,
  ContractorRateItem,
  ContractorSummary,
  ContractorCategory,
} from "../../types";
import { SaveEstimateBar } from "../SaveEstimateBar";
import { NumericInput } from "../common/NumericInput";
import {
  HardHat,
  Zap,
  Wrench,
  Paintbrush,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Sparkles,
  Calculator,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  ArrowRight,
  Info,
} from "lucide-react";

interface ContractorCalculatorProps {
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

// Default initial rate generator based on project storeys
function generateDefaultContractorItems(stories: number = 3, defaultFloorArea: number = 1500): ContractorRateItem[] {
  const items: ContractorRateItem[] = [];

  // Ground Floor: ৳400/sft
  items.push({
    id: "item_gf_civil",
    category: "civil_floor",
    workType: "Ground floor civil construction (গ্রাউন্ড ফ্লোর সিভিল নির্মাণ)",
    unit: "sft",
    rate: 400,
    quantity: defaultFloorArea,
    floorNumber: 0,
    notes: "Foundation, plinth brick soling, earthwork, RCC casting & shuttering",
    totalCost: 400 * defaultFloorArea,
  });

  // 1st Floor: ৳300/sft
  if (stories >= 2) {
    items.push({
      id: "item_1f_civil",
      category: "civil_floor",
      workType: "1st floor civil construction (১ম তলা সিভিল নির্মাণ)",
      unit: "sft",
      rate: 300,
      quantity: defaultFloorArea,
      floorNumber: 1,
      notes: "Column casting, beam/slab formwork, reinforcement & brick masonry",
      totalCost: 300 * defaultFloorArea,
    });
  }

  // 2nd Floor: ৳310/sft
  if (stories >= 3) {
    items.push({
      id: "item_2f_civil",
      category: "civil_floor",
      workType: "2nd floor civil construction (২য় তলা সিভিল নির্মাণ)",
      unit: "sft",
      rate: 310,
      quantity: defaultFloorArea,
      floorNumber: 2,
      notes: "Height allowance +৳10/sft for lifting & shuttering",
      totalCost: 310 * defaultFloorArea,
    });
  }

  // Higher Floors (3rd floor onward: +৳10 per floor)
  for (let f = 3; f < stories; f++) {
    const floorRate = 310 + (f - 2) * 10;
    const floorLabel = f === 3 ? "3rd" : `${f}th`;
    items.push({
      id: `item_${f}f_civil`,
      category: "civil_floor",
      workType: `${floorLabel} floor civil construction (${f}ম তলা সিভিল নির্মাণ)`,
      unit: "sft",
      rate: floorRate,
      quantity: defaultFloorArea,
      floorNumber: f,
      notes: `Lifting allowance rate (+৳10/sft per floor height)`,
      totalCost: floorRate * defaultFloorArea,
    });
  }

  const totalBuiltupArea = defaultFloorArea * Math.max(1, stories);

  // Electrical Installation Labour: ৳20/sft
  items.push({
    id: "item_electrical",
    category: "electrical",
    workType: "Electrical installation labour (বৈদ্যুতিক ওয়্যারিং ও পাইপিং মজুরি)",
    unit: "sft",
    rate: 20,
    quantity: totalBuiltupArea,
    notes: "Conduit piping, switchboards, db wiring, lighting & earthing labour",
    totalCost: 20 * totalBuiltupArea,
  });

  // Plumbing Installation Labour: ৳25/sft
  items.push({
    id: "item_plumbing",
    category: "plumbing",
    workType: "Plumbing installation labour (প্লাম্বিং ও স্যানিটারি ফিটিংস মজুরি)",
    unit: "sft",
    rate: 25,
    quantity: totalBuiltupArea,
    notes: "Water supply lines, sanitary drainage, waste stack & bath fittings",
    totalCost: 25 * totalBuiltupArea,
  });

  // Painting Labour: ৳10/sft (wall & ceiling area, approx 3.5x floor area)
  const estimatedWallArea = Math.round(totalBuiltupArea * 3.5);
  items.push({
    id: "item_painting",
    category: "painting",
    workType: "Painting labour (রং কাজের মজুরি - ওয়াল ও সিলিং এরিয়া)",
    unit: "sft",
    rate: 10,
    quantity: estimatedWallArea,
    notes: "Putty / seamer, primer coat, 2-coat plastic paint & weather coat (approx 3.5× floor sft)",
    totalCost: 10 * estimatedWallArea,
  });

  return items;
}

export const ContractorCalculator: React.FC<ContractorCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const [estimateName, setEstimateName] = useState("Contractor & Labour Rate Schedule");
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);

  const projectStories = Math.max(1, activeProject?.stories || 3);
  const [items, setItems] = useState<ContractorRateItem[]>(() =>
    generateDefaultContractorItems(projectStories, 1500)
  );

  // Quick Batch Inputs
  const [batchFloorArea, setBatchFloorArea] = useState<number>(1500);
  const [wallAreaMultiplier, setWallAreaMultiplier] = useState<number>(3.5);

  // New Custom Item Form State
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customCategory, setCustomCategory] = useState<ContractorCategory>("custom");
  const [customWorkType, setCustomWorkType] = useState("");
  const [customUnit, setCustomUnit] = useState<"sft" | "rft" | "lump" | "point" | "cft">("sft");
  const [customRate, setCustomRate] = useState<number>(0);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState("");

  // Re-generate defaults if loadedEstimate is loaded
  const handleLoadSavedEstimate = (est: ProjectEstimateItem) => {
    setEditingEstimateId(est.id);
    setEstimateName(est.name || "Contractor & Labour Schedule");
    if (est.data?.items && Array.isArray(est.data.items)) {
      setItems(est.data.items);
      if (est.data.batchFloorArea) setBatchFloorArea(est.data.batchFloorArea);
      if (est.data.wallAreaMultiplier) setWallAreaMultiplier(est.data.wallAreaMultiplier);
    }
  };

  useEffect(() => {
    if (loadedEstimate && loadedEstimate.type === "contractor") {
      handleLoadSavedEstimate(loadedEstimate);
    }
  }, [loadedEstimate]);

  // Update item rate or quantity
  const updateItem = (id: string, updates: Partial<ContractorRateItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newRate = updates.rate !== undefined ? Number(updates.rate) : item.rate;
        const newQty = updates.quantity !== undefined ? Number(updates.quantity) : item.quantity;
        return {
          ...item,
          ...updates,
          rate: newRate,
          quantity: newQty,
          totalCost: Math.round(newRate * newQty),
        };
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Add Floor Item
  const handleAddFloorItem = () => {
    const currentCivilFloors = items.filter((i) => i.category === "civil_floor");
    const nextFloorNum = currentCivilFloors.length;
    const nextFloorRate = nextFloorNum === 0 ? 400 : nextFloorNum === 1 ? 300 : 310 + (nextFloorNum - 2) * 10;
    const floorLabel =
      nextFloorNum === 0
        ? "Ground floor"
        : nextFloorNum === 1
        ? "1st floor"
        : nextFloorNum === 2
        ? "2nd floor"
        : `${nextFloorNum}th floor`;

    const newItem: ContractorRateItem = {
      id: "item_civil_" + Date.now(),
      category: "civil_floor",
      workType: `${floorLabel} civil construction (${nextFloorNum === 0 ? "গ্রাউন্ড ফ্লোর" : `${nextFloorNum}ম তলা`} সিভিল নির্মাণ)`,
      unit: "sft",
      rate: nextFloorRate,
      quantity: batchFloorArea,
      floorNumber: nextFloorNum,
      notes: nextFloorNum >= 2 ? `Height allowance (+৳10/sft per floor)` : "Standard civil labour rate",
      totalCost: Math.round(nextFloorRate * batchFloorArea),
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Batch apply floor area
  const handleApplyBatchFloorArea = () => {
    if (batchFloorArea <= 0) return;
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.category === "civil_floor") {
          return {
            ...item,
            quantity: batchFloorArea,
            totalCost: Math.round(item.rate * batchFloorArea),
          };
        }
        return item;
      });

      // Also update electrical and plumbing total builtup area
      const civilFloorsCount = updated.filter((i) => i.category === "civil_floor").length || 1;
      const totalBuiltup = batchFloorArea * civilFloorsCount;
      const paintingArea = Math.round(totalBuiltup * wallAreaMultiplier);

      return updated.map((item) => {
        if (item.category === "electrical" || item.category === "plumbing") {
          return {
            ...item,
            quantity: totalBuiltup,
            totalCost: Math.round(item.rate * totalBuiltup),
          };
        }
        if (item.category === "painting") {
          return {
            ...item,
            quantity: paintingArea,
            totalCost: Math.round(item.rate * paintingArea),
          };
        }
        return item;
      });
    });
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWorkType.trim() || customRate <= 0) return;

    const newItem: ContractorRateItem = {
      id: "item_custom_" + Date.now(),
      category: customCategory,
      workType: customWorkType.trim(),
      unit: customUnit,
      rate: customRate,
      quantity: customQty,
      notes: customNotes.trim() || undefined,
      totalCost: Math.round(customRate * customQty),
    };

    setItems((prev) => [...prev, newItem]);
    setCustomWorkType("");
    setCustomRate(0);
    setCustomQty(1);
    setCustomNotes("");
    setShowAddCustom(false);
  };

  // Reset to proposed default rates
  const handleResetToProposedRates = () => {
    setItems(generateDefaultContractorItems(projectStories, batchFloorArea || 1500));
  };

  // Compute Summary
  const summary: ContractorSummary = React.useMemo(() => {
    let civilFloorTotal = 0;
    let electricalTotal = 0;
    let plumbingTotal = 0;
    let paintingTotal = 0;
    let customTotal = 0;
    let totalBuiltupAreaSft = 0;
    let totalPaintingWallAreaSft = 0;

    for (const item of items) {
      if (item.category === "civil_floor") {
        civilFloorTotal += item.totalCost;
        totalBuiltupAreaSft += item.quantity;
      } else if (item.category === "electrical") {
        electricalTotal += item.totalCost;
      } else if (item.category === "plumbing") {
        plumbingTotal += item.totalCost;
      } else if (item.category === "painting") {
        paintingTotal += item.totalCost;
        totalPaintingWallAreaSft += item.quantity;
      } else {
        customTotal += item.totalCost;
      }
    }

    const grandTotalCost =
      civilFloorTotal + electricalTotal + plumbingTotal + paintingTotal + customTotal;

    return {
      civilFloorTotal,
      electricalTotal,
      plumbingTotal,
      paintingTotal,
      customTotal,
      grandTotalCost,
      totalBuiltupAreaSft,
      totalPaintingWallAreaSft,
      itemsCount: items.length,
    };
  }, [items]);

  // Save to project
  const handleSaveToProject = async (saveAsCopy: boolean = false) => {
    await onSaveEstimate({
      id: saveAsCopy ? undefined : editingEstimateId || undefined,
      type: "contractor",
      name: estimateName,
      totalCost: summary.grandTotalCost,
      summary,
      data: {
        items,
        batchFloorArea,
        wallAreaMultiplier,
        stories: projectStories,
      },
    });
  };

  const getCategoryBadge = (cat: ContractorCategory) => {
    switch (cat) {
      case "civil_floor":
        return {
          label: "Civil Floor (সিভিল নির্মাণ)",
          color: "bg-[#00c2c7]/15 text-[#00c2c7] border-[#00c2c7]/30",
          icon: Building2,
        };
      case "electrical":
        return {
          label: "Electrical (ইলেকট্রিক্যাল)",
          color: "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30",
          icon: Zap,
        };
      case "plumbing":
        return {
          label: "Plumbing (প্লাম্বিং ও স্যানিটারি)",
          color: "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30",
          icon: Wrench,
        };
      case "painting":
        return {
          label: "Painting (রং ও ফিনিশিং)",
          color: "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30",
          icon: Paintbrush,
        };
      default:
        return {
          label: "Additional (অন্যান্য কাজ)",
          color: "bg-[#2ecc71]/15 text-[#2ecc71] border-[#2ecc71]/30",
          icon: HardHat,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1c2e] overflow-hidden text-[#f1f5f9]">
      {/* Top Estimate Save / Load Bar */}
      <SaveEstimateBar
        type="contractor"
        typeLabel="Contractor & Labour"
        activeProject={activeProject}
        currentEstimateName={estimateName}
        setCurrentEstimateName={setEstimateName}
        currentEstimateId={editingEstimateId}
        onSave={() => handleSaveToProject(false)}
        onSaveAsCopy={() => handleSaveToProject(true)}
        onClearEstimate={() => {
          setEditingEstimateId(null);
          setEstimateName("New Contractor & Labour Schedule");
          setItems(generateDefaultContractorItems(projectStories, 1500));
          if (onClearLoadedEstimate) onClearLoadedEstimate();
        }}
        onLoadEstimate={handleLoadSavedEstimate}
        onDeleteEstimate={onDeleteEstimate}
        getCurrentPayload={() => ({
          totalCost: summary.grandTotalCost,
          summary,
          data: { items, batchFloorArea, wallAreaMultiplier, stories: projectStories },
        })}
        onImportPayload={(payload) => {
          if (payload.data?.items) {
            setItems(payload.data.items);
            if (payload.data.batchFloorArea) setBatchFloorArea(payload.data.batchFloorArea);
            if (payload.data.wallAreaMultiplier) setWallAreaMultiplier(payload.data.wallAreaMultiplier);
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Header Banner & Proposed Rate Reference Box (Light Box Shape) */}
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden text-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase bg-teal-100 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-teal-700" />
                    Contractor & Labour Schedule
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    প্রস্তাবিত কন্ট্রাক্টর ও লেবার রেট তালিকা
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Building Contractor & Labour Rate Calculator
                </h2>
                <p className="text-xs text-slate-600 max-w-2xl mt-1">
                  সিভিল কনস্ট্রাকশন (গ্রাউন্ড ও ঊর্ধ্বমুখী তলা), ইলেকট্রিক্যাল, প্লাম্বিং এবং পেইন্টিং লেবার
                  রেট দিয়ে স্বয়ংক্রিয় প্রজেক্ট কন্ট্রাক্টর বাজেট তৈরি করুন।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetToProposedRates}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm transition"
                  title="Reset to the original proposed contractor rates"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
                  <span>Restore Proposed Rates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Work Item</span>
                </button>
              </div>
            </div>

            {/* Quick Reference Chips of Proposed Rates (Clean Light Pill Boxes) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-200">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">Ground Floor Civil</div>
                <div className="text-xs font-bold text-teal-700 font-mono">৳ 400 / sft</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">1st Floor Civil</div>
                <div className="text-xs font-bold text-sky-700 font-mono">৳ 300 / sft</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">2nd Floor Civil</div>
                <div className="text-xs font-bold text-emerald-700 font-mono">৳ 310 / sft</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">Electrical Labour</div>
                <div className="text-xs font-bold text-amber-700 font-mono">৳ 20 / sft</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">Plumbing Labour</div>
                <div className="text-xs font-bold text-blue-700 font-mono">৳ 25 / sft</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[9px] text-slate-500 font-medium truncate">Painting Labour</div>
                <div className="text-xs font-bold text-purple-700 font-mono">৳ 10 / sft</div>
              </div>
            </div>
          </div>

          {/* Quick Dimension Sync Helper (Light Box Shape & Light Input Pill Shapes) */}
          <div className="bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/80 border border-teal-200 rounded-2xl p-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Quick Area Auto-Fill:</strong> Set standard floor area to instantly calculate all floor civil works, electrical, plumbing and wall painting.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
              {/* Box Shape 1: Floor Area Light Input Box */}
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-teal-300 shadow-sm">
                <span className="text-[11px] text-slate-700 font-semibold whitespace-nowrap">Floor Area:</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={batchFloorArea || ""}
                  onChange={(e) => setBatchFloorArea(Number(e.target.value) || 0)}
                  className="w-20 bg-transparent text-xs text-slate-900 font-mono font-bold outline-none text-right"
                  placeholder="1500"
                />
                <span className="text-[10px] text-slate-500 font-mono">sft</span>
              </div>

              {/* Box Shape 2: Wall Factor Light Input Box */}
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-purple-300 shadow-sm" title="Painting wall area is approx 3.5× to 4× the floor area">
                <span className="text-[11px] text-slate-700 font-semibold whitespace-nowrap">Wall Factor:</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  step="0.5"
                  value={wallAreaMultiplier || ""}
                  onChange={(e) => setWallAreaMultiplier(Number(e.target.value) || 3.5)}
                  className="w-12 bg-transparent text-xs text-purple-700 font-mono font-bold outline-none text-center"
                  placeholder="3.5"
                />
                <span className="text-[10px] text-purple-600 font-mono font-bold">×</span>
              </div>

              <button
                type="button"
                onClick={handleApplyBatchFloorArea}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to All</span>
              </button>
            </div>
          </div>

          {/* Interactive Contractor Rates Table */}
          <div className="bg-[#121c2d] border border-[#2d4a6a] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 bg-[#152338] border-b border-[#2d4a6a] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00c2c7]" />
                <h3 className="text-sm font-bold text-white">
                  Contractor Work Items & Rate Table ({items.length} Items)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddFloorItem}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#00c2c7] hover:text-[#38bdf8] bg-[#1a2b42] hover:bg-[#243b55] px-2.5 py-1 rounded-lg border border-[#2d4a6a] transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Another Floor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#2ecc71] hover:text-white bg-[#1a2b42] hover:bg-[#243b55] px-2.5 py-1 rounded-lg border border-[#2d4a6a] transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Item</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e1624] text-[#8ba3c1] border-b border-[#24374e] text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">SL</th>
                    <th className="py-2.5 px-3">Work Description (কাজের ধরন)</th>
                    <th className="py-2.5 px-3 w-32">Category</th>
                    <th className="py-2.5 px-3 w-28 text-right">Proposed Rate (৳)</th>
                    <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                    <th className="py-2.5 px-3 w-32 text-right">Quantity</th>
                    <th className="py-2.5 px-3 w-36 text-right">Total Amount (৳)</th>
                    <th className="py-2.5 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24374e]/60 font-sans">
                  {items.map((item, idx) => {
                    const badge = getCategoryBadge(item.category);
                    const CategoryIcon = badge.icon;

                    return (
                      <tr key={item.id} className="hover:bg-[#152338]/60 transition">
                        {/* Serial */}
                        <td className="py-2.5 px-3 text-center text-[#5d7a9e] font-mono">
                          {idx + 1}
                        </td>

                        {/* Description & Notes */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.workType}
                            onChange={(e) => updateItem(item.id, { workType: e.target.value })}
                            className="w-full bg-transparent text-xs font-semibold text-white outline-none focus:border-b focus:border-[#00c2c7] pb-0.5"
                          />
                          {item.notes && (
                            <div className="text-[10px] text-[#5d7a9e] mt-0.5 font-normal">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        {/* Category Badge */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border font-mono font-medium ${badge.color}`}
                          >
                            <CategoryIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[90px]">{item.category}</span>
                          </span>
                        </td>

                        {/* Rate */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">৳</span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={item.rate || ""}
                              onChange={(e) =>
                                updateItem(item.id, { rate: Number(e.target.value) || 0 })
                              }
                              className="w-16 bg-transparent text-xs text-slate-900 font-mono font-bold outline-none text-right"
                            />
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-3 text-center text-[#8ba3c1] font-mono uppercase text-[10px]">
                          {item.unit}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-sm">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                              }
                              className="w-20 bg-transparent text-xs text-slate-900 font-mono font-bold outline-none text-right"
                            />
                            <span className="text-[9px] text-slate-500 font-mono">{item.unit}</span>
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-xs">
                          ৳ {item.totalCost.toLocaleString("en-IN")}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-[#5d7a9e] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 rounded transition"
                            title="Remove work item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer with Category Breakdown and Grand Total */}
                <tfoot className="bg-[#152338] border-t-2 border-[#2d4a6a] font-mono">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 font-bold text-white text-right">
                      Grand Total Contractor & Labour Cost (মোট কন্ট্রাক্টর খরচ):
                    </td>
                    <td className="py-3 px-3 text-right text-base font-black text-[#2ecc71]">
                      ৳ {summary.grandTotalCost.toLocaleString("en-IN")}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Add Custom Item Modal / Inline Form */}
          {showAddCustom && (
            <div className="bg-[#152338] border border-[#00c2c7]/50 rounded-2xl p-4 shadow-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#2d4a6a] pb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#00c2c7]" />
                  Add Custom Contractor Work Item
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="text-xs text-[#8ba3c1] hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#8ba3c1] block mb-1">
                    Work Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boundary wall construction / Septic tank"
                    value={customWorkType}
                    onChange={(e) => setCustomWorkType(e.target.value)}
                    className="w-full bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00c2c7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8ba3c1] block mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ContractorCategory)}
                    className="w-full bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-2 py-2 text-xs text-white outline-none focus:border-[#00c2c7]"
                  >
                    <option value="civil_floor">Civil Construction</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="painting">Painting</option>
                    <option value="custom">Other / Finishing</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8ba3c1] block mb-1">Rate (৳) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="Rate"
                    value={customRate || ""}
                    onChange={(e) => setCustomRate(Number(e.target.value) || 0)}
                    className="w-full bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00c2c7] font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8ba3c1] block mb-1">Quantity *</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="1"
                      value={customQty || ""}
                      onChange={(e) => setCustomQty(Number(e.target.value) || 0)}
                      className="w-full bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-2 py-2 text-xs text-white outline-none focus:border-[#00c2c7] font-mono text-right"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as any)}
                      className="bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-1.5 py-2 text-[10px] text-white font-mono"
                    >
                      <option value="sft">sft</option>
                      <option value="rft">rft</option>
                      <option value="lump">lump</option>
                      <option value="point">pt</option>
                      <option value="cft">cft</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Optional notes or specifications"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-[#0e1624] border border-[#2d4a6a] rounded-xl px-3 py-1.5 text-xs text-[#8ba3c1] outline-none"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="w-full bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-bold text-xs py-2 px-4 rounded-xl transition shadow-md"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comprehensive Category Cost Cards (Light Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Civil Total */}
            <div className="bg-white border border-teal-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between text-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Civil Construction
                </span>
                <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 font-bold">
                  {summary.totalBuiltupAreaSft.toLocaleString()} sft
                </span>
              </div>
              <div className="text-xl font-black text-teal-700 font-mono">
                ৳ {summary.civilFloorTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Ground + All Storey Civil Works
              </div>
            </div>

            {/* Electrical Total */}
            <div className="bg-white border border-amber-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between text-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Electrical Labour
                </span>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                  ৳20 / sft
                </span>
              </div>
              <div className="text-xl font-black text-amber-700 font-mono">
                ৳ {summary.electricalTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Conduit, wiring & boards installation
              </div>
            </div>

            {/* Plumbing Total */}
            <div className="bg-white border border-sky-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between text-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Wrench className="w-4 h-4 text-sky-600" />
                  Plumbing Labour
                </span>
                <span className="text-[10px] font-mono bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200 font-bold">
                  ৳25 / sft
                </span>
              </div>
              <div className="text-xl font-black text-sky-700 font-mono">
                ৳ {summary.plumbingTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Water lines, sanitary & fixtures
              </div>
            </div>

            {/* Painting Total */}
            <div className="bg-white border border-purple-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between text-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Paintbrush className="w-4 h-4 text-purple-600" />
                  Painting Labour
                </span>
                <span className="text-[10px] font-mono bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                  ৳10 / sft wall
                </span>
              </div>
              <div className="text-xl font-black text-purple-700 font-mono">
                ৳ {summary.paintingTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {summary.totalPaintingWallAreaSft.toLocaleString()} sq.ft wall & ceiling
              </div>
            </div>
          </div>

          {/* Grand Budget Card (Light Card) */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-800">
            <div>
              <div className="text-xs text-emerald-800 uppercase font-black tracking-wider flex items-center gap-1.5 mb-1">
                <Coins className="w-4 h-4 text-emerald-600" />
                Comprehensive Contractor & Labour Budget (কন্ট্রাক্টর মোট চুক্তি মূল্য)
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight">
                ৳ {summary.grandTotalCost.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {summary.itemsCount} total contractor tasks • Ready for contract agreement & client BOQ report
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSaveToProject(false)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition active:scale-95 shadow-md shadow-emerald-600/25 shrink-0 cursor-pointer"
            >
              <span>Save Schedule to Project</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
