import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
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
  generateDefaultContractorItems,
  rescaleContractorItems,
} from "../../utils/buildingSchedule";
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

export const ContractorCalculator: React.FC<ContractorCalculatorProps> = ({
  activeProject,
  loadedEstimate,
  onClearLoadedEstimate,
  onSaveEstimate,
  onDeleteEstimate,
}) => {
  const { isLight } = useTheme();
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

  // Synchronize current contractor items to match activeProject stories accurately
  const handleSyncWithProjectStories = () => {
    const rescaled = rescaleContractorItems(
      items,
      projectStories,
      batchFloorArea || 1500,
      wallAreaMultiplier || 3.5
    );
    setItems(rescaled.items);
    const storeyRegex = /\(\s*\d+\s*(?:Floors?|Storeys?)\s*(?:[×x]\s*Multiplied|Schedule|Covered)?\s*\)/i;
    if (storeyRegex.test(estimateName)) {
      setEstimateName(
        estimateName.replace(
          storeyRegex,
          `(${projectStories} ${projectStories === 1 ? "Storey" : "Storeys"} Covered)`
        )
      );
    } else if (!estimateName.includes(`${projectStories} Storey`)) {
      setEstimateName(`${estimateName} (${projectStories} ${projectStories === 1 ? "Storey" : "Storeys"} Covered)`);
    }
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
    <div className={`flex flex-col h-full overflow-hidden transition-colors ${
      isLight ? "bg-slate-50 text-slate-900" : "bg-[#0f1c2e] text-[#f1f5f9]"
    }`}>
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
          {/* Header Banner & Proposed Rate Reference Box (Light in light mode, Dark in dark mode) */}
          <div
            className={`rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-colors ${
              isLight
                ? "bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-300 shadow-sm text-slate-800"
                : "bg-gradient-to-r from-[#152338] via-[#101b2b] to-[#152338] border border-[#2d4a6a] shadow-xl text-white"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                      isLight
                        ? "text-teal-800 bg-teal-100 border-teal-200"
                        : "text-[#00c2c7] bg-[#00c2c7]/10 border-[#00c2c7]/30"
                    }`}
                  >
                    <HardHat className={`w-3.5 h-3.5 ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`} />
                    Contractor & Labour Schedule
                  </span>
                  <span className={`text-[11px] ${isLight ? "text-slate-600 font-medium" : "text-[#8ba3c1]"}`}>
                    প্রস্তাবিত কন্ট্রাক্টর ও লেবার রেট তালিকা
                  </span>
                </div>
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}>
                  Building Contractor & Labour Rate Calculator
                </h2>
                <p className={`text-xs max-w-2xl mt-1 ${isLight ? "text-slate-600" : "text-[#8ba3c1]"}`}>
                  সিভিল কনস্ট্রাকশন (গ্রাউন্ড ও ঊর্ধ্বমুখী তলা), ইলেকট্রিক্যাল, প্লাম্বিং এবং পেইন্টিং লেবার
                  রেট দিয়ে স্বয়ংক্রিয় প্রজেক্ট কন্ট্রাক্টর বাজেট তৈরি করুন।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleSyncWithProjectStories}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isLight
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-sm"
                      : "bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#f59e0b] border-[#f59e0b]/40 shadow-sm"
                  }`}
                  title={`Rescale all floors, electrical, plumbing & painting to match active project (${projectStories} storeys)`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Sync Project ({projectStories} {projectStories === 1 ? "Storey" : "Storeys"})</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToProposedRates}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isLight
                      ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
                      : "bg-[#1a2b42] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
                  }`}
                  title="Reset to the original proposed contractor rates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`} />
                  <span>Restore Proposed Rates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md ${
                    isLight
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                      : "bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] shadow-[#00c2c7]/20"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Work Item</span>
                </button>
              </div>
            </div>

            {/* Quick Reference Chips of Proposed Rates */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-3 border-t ${
              isLight ? "border-slate-200" : "border-[#24374e]"
            }`}>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>Ground Floor Civil</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`}>৳ 400 / sft</div>
              </div>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>1st Floor Civil</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-sky-700" : "text-[#38bdf8]"}`}>৳ 300 / sft</div>
              </div>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>2nd Floor Civil</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-emerald-700" : "text-[#2ecc71]"}`}>৳ 310 / sft</div>
              </div>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>Electrical Labour</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-amber-700" : "text-[#f5a623]"}`}>৳ 20 / sft</div>
              </div>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>Plumbing Labour</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-blue-700" : "text-[#38bdf8]"}`}>৳ 25 / sft</div>
              </div>
              <div className={`p-2 rounded-xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0e1624]/90 border-[#24374e]"
              }`}>
                <div className={`text-[9px] truncate ${isLight ? "text-slate-500 font-medium" : "text-[#8ba3c1]"}`}>Painting Labour</div>
                <div className={`text-xs font-bold font-mono ${isLight ? "text-purple-700" : "text-[#a855f7]"}`}>৳ 10 / sft</div>
              </div>
            </div>
          </div>

          {/* Quick Dimension Sync Helper (Light in light mode, Dark in dark mode) */}
          <div
            className={`rounded-2xl p-3.5 shadow-md flex flex-col md:flex-row items-center justify-between gap-3 transition-colors ${
              isLight
                ? "bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/80 border border-teal-200 text-slate-800 shadow-sm"
                : "bg-[#121c2d] border border-[#2d4a6a] text-white"
            }`}
          >
            <div className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-700" : "text-[#8ba3c1]"}`}>
              <Sparkles className={`w-4 h-4 shrink-0 ${isLight ? "text-teal-600" : "text-[#00c2c7]"}`} />
              <span>
                <strong className={isLight ? "text-slate-900" : "text-white"}>Quick Area Auto-Fill:</strong> Set standard floor area to instantly calculate all floor civil works, electrical, plumbing and wall painting.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition ${
                  isLight
                    ? "bg-white border-teal-300 shadow-sm"
                    : "bg-[#0e1624] border-[#2d4a6a]"
                }`}
              >
                <span className={`text-[11px] whitespace-nowrap ${isLight ? "text-slate-700 font-semibold" : "text-[#8ba3c1]"}`}>
                  Floor Area:
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={batchFloorArea || ""}
                  onChange={(e) => setBatchFloorArea(Number(e.target.value) || 0)}
                  className={`w-20 bg-transparent text-xs font-mono font-bold outline-none text-right ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                  placeholder="1500"
                />
                <span className={`text-[10px] ${isLight ? "text-slate-500 font-mono" : "text-[#5d7a9e]"}`}>sft</span>
              </div>

              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition ${
                  isLight
                    ? "bg-white border-purple-300 shadow-sm"
                    : "bg-[#0e1624] border-[#2d4a6a]"
                }`}
                title="Painting wall area is approx 3.5× to 4× the floor area"
              >
                <span className={`text-[11px] whitespace-nowrap ${isLight ? "text-slate-700 font-semibold" : "text-[#8ba3c1]"}`}>
                  Wall Factor:
                </span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  step="0.5"
                  value={wallAreaMultiplier || ""}
                  onChange={(e) => setWallAreaMultiplier(Number(e.target.value) || 3.5)}
                  className={`w-12 bg-transparent text-xs font-mono font-bold outline-none text-center ${
                    isLight ? "text-purple-700" : "text-[#a855f7]"
                  }`}
                  placeholder="3.5"
                />
                <span className={`text-[10px] ${isLight ? "text-purple-600 font-mono font-bold" : "text-[#5d7a9e]"}`}>×</span>
              </div>

              <button
                type="button"
                onClick={handleApplyBatchFloorArea}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer ${
                  isLight
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : "bg-[#2ecc71] hover:bg-[#27ae60] text-[#0f1c2e] shadow-[#2ecc71]/20"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to All</span>
              </button>
            </div>
          </div>

          {/* Interactive Contractor Rates Table */}
          <div
            className={`rounded-2xl overflow-hidden transition-colors ${
              isLight
                ? "bg-white border border-slate-300 shadow-sm"
                : "bg-[#121c2d] border border-[#2d4a6a] shadow-xl"
            }`}
          >
            <div
              className={`p-3.5 border-b flex items-center justify-between flex-wrap gap-2 transition-colors ${
                isLight
                  ? "bg-slate-100 border-slate-200"
                  : "bg-[#152338] border-[#2d4a6a]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`} />
                <h3 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Contractor Work Items & Rate Table ({items.length} Items)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {items.filter((i) => i.category === "civil_floor").length !== projectStories && (
                  <button
                    type="button"
                    onClick={handleSyncWithProjectStories}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                      isLight
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-xs"
                        : "text-[#f5a623] hover:text-white bg-[#f5a623]/20 hover:bg-[#f5a623]/30 border-[#f5a623]/50"
                    }`}
                    title={`Click to synchronize items with project's ${projectStories} storeys`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync with Project ({projectStories} Storeys)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddFloorItem}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    isLight
                      ? "bg-white hover:bg-slate-200/70 text-teal-800 border-slate-300 shadow-xs"
                      : "text-[#00c2c7] hover:text-[#38bdf8] bg-[#1a2b42] hover:bg-[#243b55] border-[#2d4a6a]"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Another Floor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    isLight
                      ? "bg-white hover:bg-slate-200/70 text-emerald-800 border-slate-300 shadow-xs"
                      : "text-[#2ecc71] hover:text-white bg-[#1a2b42] hover:bg-[#243b55] border-[#2d4a6a]"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Item</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[11px] font-semibold uppercase tracking-wider border-b transition-colors ${
                      isLight
                        ? "bg-slate-100/90 text-slate-700 border-slate-200"
                        : "bg-[#0e1624] text-[#8ba3c1] border-[#24374e]"
                    }`}
                  >
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
                <tbody
                  className={`divide-y font-sans ${
                    isLight ? "divide-slate-200" : "divide-[#24374e]/60"
                  }`}
                >
                  {items.map((item, idx) => {
                    const badge = getCategoryBadge(item.category);
                    const CategoryIcon = badge.icon;

                    return (
                      <tr
                        key={item.id}
                        className={`transition ${
                          isLight ? "hover:bg-slate-50" : "hover:bg-[#152338]/60"
                        }`}
                      >
                        {/* Serial */}
                        <td
                          className={`py-2.5 px-3 text-center font-mono ${
                            isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"
                          }`}
                        >
                          {idx + 1}
                        </td>

                        {/* Description & Notes */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.workType}
                            onChange={(e) => updateItem(item.id, { workType: e.target.value })}
                            className={`w-full bg-transparent text-xs font-semibold outline-none focus:border-b pb-0.5 ${
                              isLight
                                ? "text-slate-900 focus:border-teal-600"
                                : "text-white focus:border-[#00c2c7]"
                            }`}
                          />
                          {item.notes && (
                            <div
                              className={`text-[10px] mt-0.5 font-normal ${
                                isLight ? "text-slate-500" : "text-[#5d7a9e]"
                              }`}
                            >
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
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
                              isLight
                                ? "bg-white border-slate-300 shadow-xs"
                                : "bg-[#0e1624] border-[#2d4a6a]"
                            }`}
                          >
                            <span className={`text-[10px] ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>৳</span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={item.rate || ""}
                              onChange={(e) =>
                                updateItem(item.id, { rate: Number(e.target.value) || 0 })
                              }
                              className={`w-16 bg-transparent text-xs font-mono font-bold outline-none text-right ${
                                isLight ? "text-slate-900" : "text-white"
                              }`}
                            />
                          </div>
                        </td>

                        {/* Unit */}
                        <td
                          className={`py-2.5 px-3 text-center font-mono uppercase text-[10px] ${
                            isLight ? "text-slate-600 font-semibold" : "text-[#8ba3c1]"
                          }`}
                        >
                          {item.unit}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-right">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
                              isLight
                                ? "bg-white border-slate-300 shadow-xs"
                                : "bg-[#0e1624] border-[#2d4a6a]"
                            }`}
                          >
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                              }
                              className={`w-20 bg-transparent text-xs font-mono font-bold outline-none text-right ${
                                isLight ? "text-slate-900" : "text-white"
                              }`}
                            />
                            <span className={`text-[9px] ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>
                              {item.unit}
                            </span>
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}
                        >
                          ৳ {item.totalCost.toLocaleString("en-IN")}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className={`p-1 rounded transition ${
                              isLight
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                : "text-[#5d7a9e] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10"
                            }`}
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
                <tfoot
                  className={`border-t-2 font-mono transition-colors ${
                    isLight
                      ? "bg-slate-100 border-slate-300"
                      : "bg-[#152338] border-[#2d4a6a]"
                  }`}
                >
                  <tr>
                    <td
                      colSpan={6}
                      className={`py-3 px-4 font-bold text-right ${
                        isLight ? "text-slate-800" : "text-white"
                      }`}
                    >
                      Grand Total Contractor & Labour Cost (মোট কন্ট্রাক্টর খরচ):
                    </td>
                    <td
                      className={`py-3 px-3 text-right text-base font-black ${
                        isLight ? "text-emerald-700 font-bold" : "text-[#2ecc71]"
                      }`}
                    >
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
            <div
              className={`rounded-2xl p-4 space-y-3 animate-fadeIn transition-colors ${
                isLight
                  ? "bg-white border border-teal-300 shadow-lg text-slate-800"
                  : "bg-[#152338] border border-[#00c2c7]/50 shadow-2xl text-white"
              }`}
            >
              <div
                className={`flex items-center justify-between pb-2 border-b ${
                  isLight ? "border-slate-200" : "border-[#2d4a6a]"
                }`}
              >
                <h4
                  className={`text-sm font-bold flex items-center gap-2 ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  <Plus className={`w-4 h-4 ${isLight ? "text-teal-600" : "text-[#00c2c7]"}`} />
                  Add Custom Contractor Work Item
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className={`text-xs ${
                    isLight ? "text-slate-500 hover:text-slate-800" : "text-[#8ba3c1] hover:text-white"
                  }`}
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label
                    className={`text-[11px] block mb-1 ${
                      isLight ? "text-slate-700 font-medium" : "text-[#8ba3c1]"
                    }`}
                  >
                    Work Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boundary wall construction / Septic tank"
                    value={customWorkType}
                    onChange={(e) => setCustomWorkType(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none border transition ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                        : "bg-[#0e1624] border-[#2d4a6a] text-white focus:border-[#00c2c7]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] block mb-1 ${
                      isLight ? "text-slate-700 font-medium" : "text-[#8ba3c1]"
                    }`}
                  >
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ContractorCategory)}
                    className={`w-full rounded-xl px-2 py-2 text-xs outline-none border transition ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                        : "bg-[#0e1624] border-[#2d4a6a] text-white focus:border-[#00c2c7]"
                    }`}
                  >
                    <option value="civil_floor">Civil Construction</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="painting">Painting</option>
                    <option value="custom">Other / Finishing</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`text-[11px] block mb-1 ${
                      isLight ? "text-slate-700 font-medium" : "text-[#8ba3c1]"
                    }`}
                  >
                    Rate (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="Rate"
                    value={customRate || ""}
                    onChange={(e) => setCustomRate(Number(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none border font-mono text-right transition ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                        : "bg-[#0e1624] border-[#2d4a6a] text-white focus:border-[#00c2c7]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] block mb-1 ${
                      isLight ? "text-slate-700 font-medium" : "text-[#8ba3c1]"
                    }`}
                  >
                    Quantity *
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="1"
                      value={customQty || ""}
                      onChange={(e) => setCustomQty(Number(e.target.value) || 0)}
                      className={`w-full rounded-xl px-2 py-2 text-xs outline-none border font-mono text-right transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                          : "bg-[#0e1624] border-[#2d4a6a] text-white focus:border-[#00c2c7]"
                      }`}
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as any)}
                      className={`rounded-xl px-1.5 py-2 text-[10px] font-mono border transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-[#0e1624] border-[#2d4a6a] text-white"
                      }`}
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
                    className={`w-full rounded-xl px-3 py-1.5 text-xs outline-none border transition ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-700 placeholder-slate-400"
                        : "bg-[#0e1624] border-[#2d4a6a] text-[#8ba3c1]"
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className={`w-full font-bold text-xs py-2 px-4 rounded-xl transition shadow-md cursor-pointer ${
                      isLight
                        ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                        : "bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] shadow-[#00c2c7]/20"
                    }`}
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comprehensive Category Cost Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Civil Total */}
            <div
              className={`rounded-2xl p-3.5 flex flex-col justify-between transition-colors ${
                isLight
                  ? "bg-white border border-teal-200 shadow-sm"
                  : "bg-[#121c2d] border border-[#00c2c7]/40 shadow-md"
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs mb-2 ${
                  isLight ? "text-slate-600" : "text-[#8ba3c1]"
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  <Building2 className={`w-4 h-4 ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`} />
                  Civil Construction
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight
                      ? "bg-teal-50 text-teal-800 border-teal-200"
                      : "bg-[#00c2c7]/15 text-[#00c2c7] border-[#00c2c7]/30"
                  }`}
                >
                  {summary.totalBuiltupAreaSft.toLocaleString()} sft
                </span>
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  isLight ? "text-teal-700" : "text-[#00c2c7]"
                }`}
              >
                ৳ {summary.civilFloorTotal.toLocaleString("en-IN")}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>
                Ground + All Storey Civil Works
              </div>
            </div>

            {/* Electrical Total */}
            <div
              className={`rounded-2xl p-3.5 flex flex-col justify-between transition-colors ${
                isLight
                  ? "bg-white border border-amber-200 shadow-sm"
                  : "bg-[#121c2d] border border-[#f5a623]/40 shadow-md"
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs mb-2 ${
                  isLight ? "text-slate-600" : "text-[#8ba3c1]"
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  <Zap className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-[#f5a623]"}`} />
                  Electrical Labour
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30"
                  }`}
                >
                  ৳20 / sft
                </span>
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  isLight ? "text-amber-700" : "text-[#f5a623]"
                }`}
              >
                ৳ {summary.electricalTotal.toLocaleString("en-IN")}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>
                Conduit, wiring & boards installation
              </div>
            </div>

            {/* Plumbing Total */}
            <div
              className={`rounded-2xl p-3.5 flex flex-col justify-between transition-colors ${
                isLight
                  ? "bg-white border border-sky-200 shadow-sm"
                  : "bg-[#121c2d] border border-[#38bdf8]/40 shadow-md"
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs mb-2 ${
                  isLight ? "text-slate-600" : "text-[#8ba3c1]"
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  <Wrench className={`w-4 h-4 ${isLight ? "text-sky-600" : "text-[#38bdf8]"}`} />
                  Plumbing Labour
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30"
                  }`}
                >
                  ৳25 / sft
                </span>
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  isLight ? "text-sky-700" : "text-[#38bdf8]"
                }`}
              >
                ৳ {summary.plumbingTotal.toLocaleString("en-IN")}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>
                Water lines, sanitary & fixtures
              </div>
            </div>

            {/* Painting Total */}
            <div
              className={`rounded-2xl p-3.5 flex flex-col justify-between transition-colors ${
                isLight
                  ? "bg-white border border-purple-200 shadow-sm"
                  : "bg-[#121c2d] border border-[#a855f7]/40 shadow-md"
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs mb-2 ${
                  isLight ? "text-slate-600" : "text-[#8ba3c1]"
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  <Paintbrush className={`w-4 h-4 ${isLight ? "text-purple-600" : "text-[#a855f7]"}`} />
                  Painting Labour
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30"
                  }`}
                >
                  ৳10 / sft wall
                </span>
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  isLight ? "text-purple-700" : "text-[#a855f7]"
                }`}
              >
                ৳ {summary.paintingTotal.toLocaleString("en-IN")}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? "text-slate-500 font-medium" : "text-[#5d7a9e]"}`}>
                {summary.totalPaintingWallAreaSft.toLocaleString()} sq.ft wall & ceiling
              </div>
            </div>
          </div>

          {/* Grand Budget Card */}
          <div
            className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              isLight
                ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-2 border-emerald-500 shadow-md text-slate-900"
                : "bg-gradient-to-r from-[#11291f] via-[#0e2219] to-[#152e23] border-2 border-[#2ecc71] shadow-2xl text-white"
            }`}
          >
            <div>
              <div
                className={`text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1 ${
                  isLight ? "text-emerald-800" : "text-[#2ecc71]"
                }`}
              >
                <Coins className="w-4 h-4" />
                Comprehensive Contractor & Labour Budget (কন্ট্রাক্টর মোট চুক্তি মূল্য)
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                ৳ {summary.grandTotalCost.toLocaleString("en-IN")}
              </div>
              <div
                className={`text-[11px] mt-1 ${
                  isLight ? "text-slate-600 font-medium" : "text-[#8ba3c1]"
                }`}
              >
                {summary.itemsCount} total contractor tasks • Ready for contract agreement & client BOQ report
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSaveToProject(false)}
              className="flex items-center gap-2 bg-[#2ecc71] hover:bg-[#27ae60] text-[#0f1c2e] font-bold px-5 py-2.5 rounded-xl transition active:scale-95 shadow-lg shadow-[#2ecc71]/25 shrink-0 cursor-pointer"
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
