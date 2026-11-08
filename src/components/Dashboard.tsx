import React, { useState, useEffect } from "react";
import { Project, ProjectEstimateItem, EstimateType, GlobalMaterialRates } from "../types";
import {
  FolderKanban,
  Plus,
  Minus,
  Trash2,
  Download,
  Upload,
  ExternalLink,
  Layers,
  Building2,
  Columns,
  SquareDashedBottom,
  Footprints,
  BrickWall,
  Grid3X3,
  Calculator,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
  HardHat,
  Receipt,
  FileText,
  Edit3,
  Sun,
  Moon,
  CircleDot,
  Cylinder,
  LayoutGrid,
  Table,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldCheck,
  Shield,
  LogOut,
  Sparkles,
  Coins,
  Eye,
  Lock,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { ConfirmModal } from "./common/ConfirmModal";
import { EditEstimateModal } from "./EditEstimateModal";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  extractItemMaterials,
  DEFAULT_MATERIAL_RATES,
  recalculateEstimateWithRates,
} from "../utils/reportBreakdown";

interface DashboardProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProjectModal: () => void;
  onOpenEditProjectModal: () => void;
  onDeleteProject: (id: string) => Promise<void>;
  onDeleteEstimate: (id: string) => Promise<void>;
  onRenameEstimate: (estimateId: string, newName: string) => Promise<void>;
  onNavigateToCalculator: (type: EstimateType, estimateToLoad?: ProjectEstimateItem) => void;
  onOpenReportModal: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAuthModal?: () => void;
  onImportProject: (projectData: any) => Promise<void>;
  onAddDefaultBuildingList?: () => Promise<void>;
  onUpdateProject?: (id: string, data: any) => Promise<void>;
  onOpenServiceVoucher?: () => void;
}

interface MaterialRateInputProps {
  label: string;
  unit: string;
  value: number;
  colorBorder: string;
  colorText: string;
  colorFocus: string;
  subtext: string;
  isLight: boolean;
  onCommit: (val: number) => void;
}

const MaterialRateInput: React.FC<MaterialRateInputProps> = ({
  label,
  unit,
  value,
  colorBorder,
  colorText,
  colorFocus,
  subtext,
  isLight,
  onCommit,
}) => {
  const [str, setStr] = useState<string>(() => String(value));

  // Sync if value changes externally (e.g. Preset clicked)
  useEffect(() => {
    setStr(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStr(e.target.value);
  };

  const handleBlur = () => {
    const parsed = parseFloat(str);
    if (isNaN(parsed) || parsed <= 0) {
      setStr(String(value));
      return;
    }
    const finalVal = Math.round(parsed * 100) / 100;
    setStr(String(finalVal));
    if (finalVal !== value) {
      onCommit(finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div
      className={`rounded-xl p-2.5 flex flex-col justify-between space-y-1.5 transition border ${
        isLight
          ? "bg-slate-50 border-slate-200 shadow-xs hover:border-slate-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20"
          : `bg-[#121c2d] ${colorBorder} focus-within:${colorFocus}`
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] uppercase font-bold tracking-wide ${
            isLight ? "text-slate-800" : colorText
          }`}
        >
          {label}
        </span>
        <span
          className={`text-[9px] font-mono ${
            isLight ? "text-slate-500" : "text-[#8ba3c1]"
          }`}
        >
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`text-xs font-mono font-semibold ${
            isLight ? "text-slate-500" : "text-[#8ba3c1]"
          }`}
        >
          ৳
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={str}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full font-mono font-bold text-xs px-2 py-1 rounded border outline-none transition ${
            isLight
              ? "bg-white text-slate-900 border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
              : `bg-[#1a2b42] text-white border-[#2d4a6a] focus:${colorFocus}`
          }`}
        />
      </div>
      <div
        className={`text-[9px] truncate font-mono ${
          isLight ? "text-slate-600 font-medium" : "text-[#8ba3c1]"
        }`}
      >
        {subtext}
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenEditProjectModal,
  onDeleteProject,
  onDeleteEstimate,
  onRenameEstimate,
  onNavigateToCalculator,
  onOpenReportModal,
  onOpenAdminPanel,
  onOpenAuthModal,
  onImportProject,
  onAddDefaultBuildingList,
  onUpdateProject,
  onOpenServiceVoucher,
}) => {
  const { isLight, toggleTheme } = useTheme();
  const { currentUser, appUser, isAdmin, isViewer, isEditor, userRole, signInWithGoogle, logout } = useAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [fileImportError, setFileImportError] = useState("");
  const [fileViewMode, setFileViewMode] = useState<"cards" | "table">("cards");
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const toggleFileExpand = (id: string) => {
    setExpandedFiles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Determine project permissions: Admin, Owner, or explicitly Assigned Editor
  const activeUserEmail = (currentUser?.email || appUser?.email || "").toLowerCase().trim();
  const activeUserId = currentUser?.uid || appUser?.uid;

  const isAssignedEditor = Boolean(
    activeProject &&
    (
      (activeUserId && activeProject.assignedTo === activeUserId) ||
      (activeUserEmail && activeProject.assignedToEmail && activeProject.assignedToEmail.toLowerCase() === activeUserEmail) ||
      (activeUserId && activeProject.assignedUserIds?.includes(activeUserId)) ||
      (activeUserEmail && activeProject.assignedUserEmails?.some((e) => e.toLowerCase() === activeUserEmail))
    )
  );

  const isOwner = Boolean(
    activeProject &&
    (
      (activeUserId && activeProject.ownerId === activeUserId) ||
      (activeUserEmail && activeProject.ownerEmail && activeProject.ownerEmail.toLowerCase() === activeUserEmail)
    )
  );

  // If Admin or explicitly assigned by Admin, user has full editing rights for this project!
  const canEditActiveProject =
    isAdmin || isAssignedEditor || (!isViewer && (isOwner || !activeProject?.ownerId));

  // Unified Material Rates state (set once for all items)
  const [rates, setRates] = useState<GlobalMaterialRates>(() => {
    return (
      activeProject?.rates || {
        cementRate: DEFAULT_MATERIAL_RATES.cementRate,
        sandRate: DEFAULT_MATERIAL_RATES.sandRate,
        localSandRate: DEFAULT_MATERIAL_RATES.localSandRate,
        sylhetSandRate: DEFAULT_MATERIAL_RATES.sylhetSandRate,
        aggRate: DEFAULT_MATERIAL_RATES.aggRate,
        steelRate: DEFAULT_MATERIAL_RATES.steelRate,
        brickRate: DEFAULT_MATERIAL_RATES.brickRate,
        tileRate: DEFAULT_MATERIAL_RATES.tileRate,
        boringRatePerFt: DEFAULT_MATERIAL_RATES.boringRatePerFt,
        sandPileCostPerFt: DEFAULT_MATERIAL_RATES.sandPileCostPerFt,
        grillRatePerSft: DEFAULT_MATERIAL_RATES.grillRatePerSft,
        aluminiumGlassRatePerSft: DEFAULT_MATERIAL_RATES.aluminiumGlassRatePerSft,
      }
    );
  });
  const [ratesUpdatedMsg, setRatesUpdatedMsg] = useState("");
  const [isApplyingRates, setIsApplyingRates] = useState(false);

  // Sync rates when activeProject changes
  useEffect(() => {
    if (activeProject?.rates) {
      setRates({
        cementRate: activeProject.rates.cementRate ?? DEFAULT_MATERIAL_RATES.cementRate,
        sandRate: activeProject.rates.sandRate ?? DEFAULT_MATERIAL_RATES.sandRate,
        localSandRate: activeProject.rates.localSandRate ?? DEFAULT_MATERIAL_RATES.localSandRate,
        sylhetSandRate: activeProject.rates.sylhetSandRate ?? DEFAULT_MATERIAL_RATES.sylhetSandRate,
        aggRate: activeProject.rates.aggRate ?? DEFAULT_MATERIAL_RATES.aggRate,
        steelRate: activeProject.rates.steelRate ?? DEFAULT_MATERIAL_RATES.steelRate,
        brickRate: activeProject.rates.brickRate ?? DEFAULT_MATERIAL_RATES.brickRate,
        tileRate: activeProject.rates.tileRate ?? DEFAULT_MATERIAL_RATES.tileRate,
        boringRatePerFt: activeProject.rates.boringRatePerFt ?? DEFAULT_MATERIAL_RATES.boringRatePerFt,
        sandPileCostPerFt: activeProject.rates.sandPileCostPerFt ?? DEFAULT_MATERIAL_RATES.sandPileCostPerFt,
        grillRatePerSft: activeProject.rates.grillRatePerSft ?? DEFAULT_MATERIAL_RATES.grillRatePerSft,
        aluminiumGlassRatePerSft: activeProject.rates.aluminiumGlassRatePerSft ?? DEFAULT_MATERIAL_RATES.aluminiumGlassRatePerSft,
      });
    }
  }, [activeProject?.id, activeProject?.rates]);

  // Recalculates all items across project whenever materials price is saved/updated
  const handleApplyMaterialRates = async (newRatesToApply?: GlobalMaterialRates) => {
    if (!activeProject || !onUpdateProject) return;
    const targetRates = newRatesToApply || rates;
    setIsApplyingRates(true);

    try {
      // Recalculate every estimate item in the project with the new material rates
      const updatedEstimates = (activeProject.estimates || []).map((est) =>
        recalculateEstimateWithRates(est, targetRates)
      );

      await onUpdateProject(activeProject.id, {
        rates: targetRates,
        estimates: updatedEstimates,
      });

      try {
        localStorage.setItem("ashraf_global_material_rates", JSON.stringify(targetRates));
      } catch (e) {}

      setRatesUpdatedMsg(`✓ Material rates updated! Recalculated all ${updatedEstimates.length} estimate items.`);
      setTimeout(() => setRatesUpdatedMsg(""), 3500);
    } catch (err) {
      console.error("Error applying material rates", err);
    } finally {
      setIsApplyingRates(false);
    }
  };

  const handleUpdateSingleRate = (key: keyof GlobalMaterialRates, val: number) => {
    const updated = { ...rates, [key]: val };
    setRates(updated);
    handleApplyMaterialRates(updated);
  };

  // In-app modal confirmations (no window.confirm!)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<ProjectEstimateItem | null>(null);
  const [estimateToEdit, setEstimateToEdit] = useState<ProjectEstimateItem | null>(null);

  // Compute portfolio statistics
  const totalProjects = projects.length;
  const totalEstimates = projects.reduce(
    (sum, p) => sum + (Array.isArray(p.estimates) ? p.estimates.length : 0),
    0
  );
  const totalPortfolioBudget = projects.reduce((sum, p) => {
    const estSum = Array.isArray(p.estimates)
      ? p.estimates.reduce((s, e) => s + (e.totalCost || 0), 0)
      : 0;
    return sum + estSum;
  }, 0);

  // Compute Active Project BOQ aggregates
  const estimates = Array.isArray(activeProject?.estimates)
    ? activeProject.estimates
    : [];

  // Helper to distinguish Grade Beams (1 Storey) from Floor Beams (Storeys Multiplied)
  const isEstGradeBeam = (e: ProjectEstimateItem) =>
    e.type === "beam" &&
    (e.data?.beamSubtype === "grade_beam" ||
      e.summary?.beamSubtype === "grade_beam" ||
      e.name?.toLowerCase().includes("grade") ||
      e.name?.toLowerCase().includes("gb"));

  // Helper to distinguish Short Columns (1 Storey Fixed) from Floor Columns
  const isEstShortCol = (e: ProjectEstimateItem) =>
    e.type === "column" &&
    (e.data?.colMode === "short" ||
      e.summary?.colMode === "short" ||
      e.name?.toLowerCase().includes("short"));

  const filteredEstimates =
    filterType === "all"
      ? estimates
      : filterType === "grade_beam"
      ? estimates.filter((e) => isEstGradeBeam(e))
      : filterType === "floor_beam"
      ? estimates.filter((e) => e.type === "beam" && !isEstGradeBeam(e))
      : filterType === "short_col"
      ? estimates.filter((e) => isEstShortCol(e))
      : filterType === "long_col"
      ? estimates.filter((e) => e.type === "column" && !isEstShortCol(e))
      : estimates.filter((e) => e.type === filterType);

  const activeTotalCost = estimates.reduce((s, e) => s + (e.totalCost || 0), 0);

  // Consolidated material sums
  let totalCementBags = 0;
  let totalSandCft = 0;
  let totalLocalSandCft = 0;
  let totalSylhetSandCft = 0;
  let totalStoneAggCft = 0;
  let totalPicketAggCft = 0;
  let totalPicketBricksPcs = 0;
  let totalBrickworkBricksPcs = 0;
  let totalAggCft = 0;
  let totalSteelKg = 0;
  let totalBricks = 0;
  let totalWindowAreaSft = 0;

  estimates.forEach((e) => {
    const s = e.summary || {};
    const d = e.data || {};
    const isBrickKhoa = Boolean(
      d.baseType === "brick" || d.baseType === "picket" ||
      (s.brickQty && s.brickQty > 0 && e.type !== "brick" && e.type !== "tiles")
    );

    const cBags = s.multipliedCementBags || s.cementBags || s.totalCementBags || 0;
    totalCementBags += cBags;

    const sCft = s.multipliedSandCft || s.sandCft || s.sandVolume || s.sandVol || s.totalSand || s.totalSandCft || 0;
    totalSandCft += sCft;

    // Sand split: 1/3 local + 2/3 sylhet for casting; 100% sylhet for sand pile (FM 2.5); 100% local for brick & tiles
    const isCasting = ["beam", "column", "footing", "slab", "stair", "situ_pile"].includes(e.type);
    const isSandPile = e.type === "sand_pile";
    const localPortion = isSandPile ? 0 : (isCasting ? sCft * (1 / 3) : sCft);
    const sylhetPortion = isSandPile ? sCft : (isCasting ? sCft * (2 / 3) : 0);
    totalLocalSandCft += localPortion;
    totalSylhetSandCft += sylhetPortion;

    const aCft = s.multipliedAggCft || s.aggCft || s.aggregateVolume || s.aggregateVol || s.totalAggCft || 0;
    const brk = s.multipliedBricks || s.totalBricks || s.brickQty || 0;

    // Separate stone aggregate, picket aggregate (brick khoa), and brick for brickwork
    if (e.type === "brick") {
      totalBrickworkBricksPcs += brk;
    } else if (isBrickKhoa) {
      totalPicketAggCft += aCft;
      totalPicketBricksPcs += brk;
    } else if (e.type !== "tiles" && e.type !== "sand_pile" && e.type !== "contractor" && e.type !== "paint") {
      totalStoneAggCft += aCft;
    }

    totalAggCft = totalStoneAggCft + totalPicketAggCft;
    totalBricks = totalBrickworkBricksPcs + totalPicketBricksPcs;

    const stKg = s.multipliedSteelKg || s.totalSteelKg || s.totalSteel || 0;
    totalSteelKg += stKg;

    // Track total window openings area for Square Bar Grill & Aluminium Frame with Glass
    if (e.type === "brick") {
      const mult = Math.max(1, s.multiplier || d.multiplier || 1);
      if (typeof s.totalWindowArea === "number" && s.totalWindowArea > 0) {
        totalWindowAreaSft += s.totalWindowArea;
      } else {
        const wallsList = Array.isArray(d.walls) ? d.walls : [];
        let singleFloorWin = 0;
        wallsList.forEach((w: any) => {
          const nos = w.nos > 0 ? w.nos : 1;
          if (w.openings && Array.isArray(w.openings)) {
            w.openings.forEach((op: any) => {
              if (op.type === "window") {
                singleFloorWin += (op.count || 0) * (op.width || 0) * (op.height || 0) * nos;
              }
            });
          } else if (w.windowCount) {
            singleFloorWin += (w.windowCount || 0) * (w.windowWidth || 0) * (w.windowHeight || 0) * nos;
          }
        });
        totalWindowAreaSft += singleFloorWin * mult;
      }
    }
  });

  const handleExportSingleEstimate = (est: ProjectEstimateItem) => {
    const jsonStr = JSON.stringify(est, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${est.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_estimate.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProject = (proj: Project) => {
    const jsonStr = JSON.stringify(proj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proj.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_project_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileImportError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.name) {
          setFileImportError("Invalid project file: missing 'name' field.");
          return;
        }
        await onImportProject(parsed);
      } catch (err: any) {
        setFileImportError(err.message || "Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const calculatorCards: {
    type: EstimateType;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }[] = [
    {
      type: "beam",
      name: "Beam Calculator (Two-Part)",
      description: "1. Grade Beam (1 Storey Fixed) & 2. Floor Beam (Superstructure Multiplied by Storeys)",
      icon: Columns,
      accent: "#00c2c7",
    },
    {
      type: "column",
      name: "Column Calculator (Short & Long)",
      description: "Short Column (1× Plinth Substructure with Footing Bend) & Long Column (Superstructure ×Storeys)",
      icon: Building2,
      accent: "#f5a623",
    },
    {
      type: "footing",
      name: "Footing Calculator",
      description: "Isolated footings with mat rebar, sand filling & brick soling",
      icon: SquareDashedBottom,
      accent: "#2ecc71",
    },
    {
      type: "situ_pile",
      name: "Cast-in-Situ Pile",
      description: "Bored concrete piles with longitudinal bars, spiral ties & boring costs",
      icon: CircleDot,
      accent: "#06b6d4",
    },
    {
      type: "sand_pile",
      name: "Sand Pile Calculator",
      description: "Ground improvement sand compaction piles, boring feet & sand volume",
      icon: Cylinder,
      accent: "#f59e0b",
    },
    {
      type: "slab",
      name: "Two-Way Slab",
      description: "Slab dimensions, main/dist bars, extra top @ L/3 & aggregates",
      icon: Layers,
      accent: "#9b59b6",
    },
    {
      type: "stair",
      name: "Staircase",
      description: "Waist slab, risers, treads, flight steel & dry mix quantities",
      icon: Footprints,
      accent: "#e74c3c",
    },
    {
      type: "brick",
      name: "Brickwork & Plaster",
      description: "10\"/5\" brick walls, mortar joints, openings & 12mm plaster",
      icon: BrickWall,
      accent: "#e67e22",
    },
    {
      type: "tiles",
      name: "Tiles Estimation",
      description: "Floor tiles, skirting, wastage, mortar base & labour rates",
      icon: Grid3X3,
      accent: "#1abc9c",
    },
    {
      type: "contractor",
      name: "Contractor & Labour",
      description: "Civil floor construction, electrical, plumbing & painting labour rates",
      icon: HardHat,
      accent: "#f59e0b",
    },
    {
      type: "structural",
      name: "Whole Building",
      description: "Multi-storey structural load, thumb rule BOQ & total budget",
      icon: Calculator,
      accent: "#3498db",
    },
  ];

  const getAccentForTheme = (accent: string) => {
    if (!isLight) return accent;
    switch (accent.toLowerCase()) {
      case "#00c2c7": return "#0f766e"; // deep teal
      case "#f5a623": return "#b45309"; // rich amber
      case "#2ecc71": return "#15803d"; // emerald
      case "#06b6d4": return "#0e7490"; // cyan
      case "#f59e0b": return "#b45309"; // amber
      case "#9b59b6": return "#6d28d9"; // purple
      case "#e74c3c": return "#b91c1c"; // red
      case "#e67e22": return "#c2410c"; // orange
      case "#1abc9c": return "#0f766e"; // dark mint
      case "#3498db": return "#1d4ed8"; // blue
      default: return accent;
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0f1c2e] text-[#f1f5f9] p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#152033] via-[#1a2b42] to-[#122238] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#00c2c7]/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold text-[#00c2c7] tracking-wider uppercase bg-[#00c2c7]/10 px-2 py-0.5 rounded border border-[#00c2c7]/30">
                Dolphin Box
              </span>
              <span className="text-xs text-[#8ba3c1]">
                · Developer: <strong className="text-white">Anonymous</strong> · Engineering Estimation & File System
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                  isLight
                    ? "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200"
                    : "bg-[#121a2b] text-[#8ba3c1] border-[#2d4a6a] hover:text-[#f5a623]"
                }`}
                title={
                  isLight
                    ? "High-Contrast Site Mode is Active (optimized for sunlight). Click to switch to Dark Mode."
                    : "Studio Dark Mode is Active. Click to switch to High-Contrast Site Mode for outdoor visits."
                }
              >
                {isLight ? (
                  <>
                    <Sun className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>Site Mode Active (Sunlight)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3 h-3 text-[#f5a623]" />
                    <span>Dark Mode · Click for Site Mode</span>
                  </>
                )}
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Civil Engineering Estimation & File System
            </h2>
            <p className="text-xs sm:text-sm text-[#8ba3c1] max-w-2xl mt-1">
              Manage civil projects, calculate structural quantities (Beam, Column, Footing, Slab, Stair, Brick, Tiles) and open, edit, or delete every estimation file safely.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isViewer ? (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-950/50 text-purple-300 border border-purple-500/40 select-none shadow-sm"
                title="Viewer Account: Read-Only Mode (Project creation and editing are disabled)"
              >
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>Viewer (Read-Only Mode)</span>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[#2d4a6a] transition shadow-sm active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-[#00c2c7]" />
                  <span>Import Project</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={onOpenNewProjectModal}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] hover:to-[#00989d] text-[#0f1c2e] px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-[#00c2c7]/20 active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add New Project</span>
                </button>
              </>
            )}
          </div>
        </div>

        {fileImportError && (
          <div className="mt-3 p-2 bg-[#ff4d6d]/20 border border-[#ff4d6d] text-[#ffb3c1] text-xs rounded-lg">
            {fileImportError}
          </div>
        )}

        {/* Global Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-[#2d4a6a]/60">
          <div className="bg-[#121a2b]/70 border border-[#2d4a6a] rounded-xl p-2.5">
            <div className="text-[10px] text-[#8ba3c1] font-medium flex items-center gap-1">
              <FolderKanban className="w-3 h-3 text-[#f5a623]" />
              Total Projects
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {totalProjects}
            </div>
          </div>

          <div className="bg-[#121a2b]/70 border border-[#2d4a6a] rounded-xl p-2.5">
            <div className="text-[10px] text-[#8ba3c1] font-medium flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#00c2c7]" />
              Saved Estimates
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#00c2c7] mt-0.5">
              {totalEstimates} files
            </div>
          </div>

          <div className="bg-[#121a2b]/70 border border-[#2d4a6a] rounded-xl p-2.5">
            <div className="text-[10px] text-[#8ba3c1] font-medium flex items-center gap-1">
              <Receipt className="w-3 h-3 text-[#2ecc71]" />
              Active Project Cost
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#2ecc71] mt-0.5">
              ৳ {Math.round(activeTotalCost).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-[#121a2b]/70 border border-[#2d4a6a] rounded-xl p-2.5">
            <div className="text-[10px] text-[#8ba3c1] font-medium flex items-center gap-1">
              <HardHat className="w-3 h-3 text-[#e67e22]" />
              Total Portfolio
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
              ৳ {Math.round(totalPortfolioBudget).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Account & Firebase Cloud Sync Callout */}
      {!currentUser && !appUser ? (
        <div className="bg-gradient-to-r from-[#142337] via-[#1a2d48] to-[#121c2d] border-2 border-emerald-500/50 rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-hidden">
          <div className="flex items-start sm:items-center gap-3 min-w-0 w-full md:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Account Login & Registration (Firebase Cloud)
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/40 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Personal Projects Isolated
                </span>
              </div>
              <p className="text-xs text-[#9bb3d1] mt-1 max-w-2xl leading-relaxed">
                Sign in to get your own private cloud-synced projects in Firebase. Every engineer's project files are securely isolated to their own account, and system administrators can oversee and manage all files.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuthModal || signInWithGoogle}
            className="w-full sm:w-auto justify-center flex items-center gap-2.5 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-white/10 transition active:scale-95 cursor-pointer shrink-0 border border-slate-300 ring-2 ring-emerald-500/40 hover:ring-emerald-500"
          >
            <span className="font-bold">Login / Register Workspace</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#142337] border border-[#2d4a6a] rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs w-full overflow-hidden">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            {(currentUser?.photoURL || appUser?.photoURL) ? (
              <img
                src={currentUser?.photoURL || appUser?.photoURL || ""}
                alt="Avatar"
                className="w-10 h-10 rounded-xl object-cover border border-[#00c2c7] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#00c2c7] text-[#0f1c2e] font-bold text-base flex items-center justify-center shrink-0">
                {((currentUser?.displayName || appUser?.displayName || currentUser?.email || appUser?.email || "E")[0]).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm truncate max-w-[180px] sm:max-w-none">
                  {currentUser?.displayName || appUser?.displayName || "Civil Engineer"}
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                    <Shield className="w-3 h-3" />
                    System Administrator (Master Control)
                  </span>
                ) : isViewer ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                    <Eye className="w-3 h-3 text-purple-400" />
                    Viewer (Read-Only Mode)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40 shrink-0">
                    <Edit3 className="w-3 h-3" />
                    Editor (Personal Cloud Workspace)
                  </span>
                )}
              </div>

              {/* Mobile-Friendly Email & Firebase Connection Status Badge */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-1 min-w-0">
                <span
                  className="text-[11px] text-[#8ba3c1] font-mono truncate max-w-[190px] xs:max-w-[240px] sm:max-w-xs block"
                  title={currentUser?.email || appUser?.email || ""}
                >
                  {currentUser?.email || appUser?.email}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>Connected to Firebase Cloud</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#2d4a6a]/40 shrink-0">
            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Control</span>
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-[#1a2b42] hover:bg-[#24374e] text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State when User has no projects yet */}
      {projects.length === 0 && (
        <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a2d47] to-[#0f1c2e] border-2 border-[#00c2c7] shadow-xl flex items-center justify-center text-[#00c2c7] mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00c2c7]/15 border border-[#00c2c7]/30 text-xs font-bold text-[#00c2c7] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Isolated Private Cloud Workspace</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Welcome, {appUser?.displayName || currentUser?.displayName || "Engineer"}
            </h3>
            <p className="text-xs text-[#8ba3c1] max-w-md mx-auto leading-relaxed">
              Your personal workspace is ready. You do not have any projects yet. Create your first engineering project to start calculating BOQ schedules, material breakdowns, and structural estimates.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenNewProjectModal}
              className="inline-flex items-center gap-2 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-bold px-5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-[#00c2c7]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Your First Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Project Card & BOQ Summary */}
      {activeProject ? (
        <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d4a6a] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded font-semibold border border-[#f5a623]/40">
                  Active Project
                </span>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {activeProject.name}
                </h3>

                {/* Assignment & Access Badges */}
                {isAssignedEditor && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-[#00c2c7]/20 text-[#00c2c7] px-2.5 py-0.5 rounded-full font-bold border border-[#00c2c7]/40 shadow-xs">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assigned to You by Admin (Editor)</span>
                  </span>
                )}
                {!isAssignedEditor && activeProject.assignedTo && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-[#00c2c7]/15 text-[#38bdf8] px-2.5 py-0.5 rounded-full font-semibold border border-[#00c2c7]/30">
                    <UserCheck className="w-3.5 h-3.5 text-[#00c2c7]" />
                    <span>Assigned Editor: {activeProject.assignedToName || activeProject.assignedToEmail}</span>
                  </span>
                )}

                {canEditActiveProject && (
                  <button
                    onClick={onOpenEditProjectModal}
                    className="p-1 text-[#00c2c7] hover:text-white hover:bg-[#00c2c7]/20 border border-[#00c2c7]/30 rounded-lg transition"
                    title="Edit Project Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8ba3c1] mt-1.5">
                {activeProject.client && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#00c2c7]" />
                    Client: <strong className="text-white">{activeProject.client}</strong>
                  </span>
                )}
                {activeProject.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#f5a623]" />
                    Location: <strong className="text-white">{activeProject.location}</strong>
                  </span>
                )}
                {activeProject.engineer && (
                  <span className="flex items-center gap-1">
                    <HardHat className="w-3.5 h-3.5 text-[#2ecc71]" />
                    Engineer: <strong className="text-white">{activeProject.engineer}</strong>
                  </span>
                )}
                {activeProject.ownerEmail && (
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-[#8ba3c1]">Owner:</span>
                    <strong className="text-white">{activeProject.ownerEmail}</strong>
                  </span>
                )}
                <div className="flex items-center gap-1.5 bg-[#1a2b42] px-2.5 py-1 rounded-lg border border-[#00c2c7]/40">
                  <Building2 className="w-4 h-4 text-[#00c2c7] shrink-0" />
                  <span className="text-xs font-bold text-white">Storeys:</span>
                  {onUpdateProject && canEditActiveProject ? (
                    <div className="flex items-center gap-1.5 bg-[#121c2d] px-2 py-0.5 rounded-lg border border-[#2d4a6a] storey-stepper-container">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = activeProject.stories || 1;
                          if (cur > 1) {
                            onUpdateProject(activeProject.id, { stories: cur - 1 });
                          }
                        }}
                        disabled={(activeProject.stories || 1) <= 1}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-[#243b55] hover:bg-[#00c2c7] border border-[#2d4a6a] disabled:opacity-30 disabled:cursor-not-allowed text-white hover:text-[#0f1c2e] text-xs font-bold transition cursor-pointer storey-stepper-btn active:scale-95 shadow-sm"
                        title="Decrease building storeys"
                        aria-label="Decrease building storeys"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="font-mono font-bold text-sm text-[#00c2c7] px-2 min-w-[24px] text-center storey-stepper-val">
                        {activeProject.stories || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = activeProject.stories || 1;
                          onUpdateProject(activeProject.id, { stories: cur + 1 });
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-[#243b55] hover:bg-[#00c2c7] border border-[#2d4a6a] text-white hover:text-[#0f1c2e] text-xs font-bold transition cursor-pointer storey-stepper-btn active:scale-95 shadow-sm"
                        title="Increase building storeys"
                        aria-label="Increase building storeys"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <strong className="text-[#00c2c7] text-xs font-mono px-1">{activeProject.stories || 1}</strong>
                  )}
                  {(activeProject.stories || 1) > 1 ? (
                    <span className="bg-[#00c2c7]/20 text-[#00c2c7] text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[#00c2c7]/30">
                      ×{activeProject.stories} Multiplied (Superstructure)
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#8ba3c1]">Single Floor</span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8ba3c1]" />
                  Updated: {new Date(activeProject.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Project Actions: Edit, BOQ, Export, Delete */}
            <div className="flex flex-wrap items-center gap-2">
              {canEditActiveProject && onAddDefaultBuildingList && (
                <button
                  type="button"
                  onClick={onAddDefaultBuildingList}
                  className="flex items-center gap-1.5 bg-[#1a2b42] hover:bg-[#243b55] text-[#00c2c7] border border-[#00c2c7]/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                  title="Auto-populate default building elements & contractor labour schedule (Beam, Column, Footing, Slab, Stair, Tile, Brick, Labour Rates)"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Auto-Add Elements</span>
                </button>
              )}
              {canEditActiveProject && (
                <button
                  onClick={onOpenEditProjectModal}
                  className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white border border-[#2d4a6a] px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                  title="Edit Project Name & Metadata"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#00c2c7]" />
                  <span>Edit Project</span>
                </button>
              )}

              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-[#00c2c7] border border-[#00c2c7]/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                title="View & Print Consolidated BOQ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>BOQ Report</span>
              </button>

              {onOpenServiceVoucher && (
                <button
                  type="button"
                  onClick={onOpenServiceVoucher}
                  className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
                  title="Open Service Voucher & Consultancy Invoices (সার্ভিস ভাউচার ও মেমো)"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Service Voucher</span>
                </button>
              )}

              <button
                onClick={() => handleExportProject(activeProject)}
                className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white border border-[#2d4a6a] px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                title="Download Project JSON Backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {canEditActiveProject && (
                <button
                  onClick={() => setProjectToDelete(activeProject)}
                  className="p-2 text-[#ff4d6d] hover:bg-[#ff4d6d]/15 border border-[#ff4d6d]/40 rounded-lg transition active:scale-95"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {!canEditActiveProject && (
                <span className="inline-flex items-center gap-1.5 bg-purple-950/40 text-purple-300 border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold select-none">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Read-Only Mode</span>
                </span>
              )}
            </div>
          </div>

          {/* Consolidated Material Quantities for Active Project */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#00c2c7] flex items-center justify-between">
              <span>Consolidated Materials for "{activeProject.name}"</span>
              <span className="text-[11px] text-[#8ba3c1]">
                Aggregated from {estimates.length} saved estimate files
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Total Cement</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {totalCementBags.toLocaleString()} bags
                </div>
                <div className="text-[9px] text-[#8ba3c1]">~{(totalCementBags * 50).toLocaleString()} kg</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Sylhet Sand (সিলেট)</div>
                <div className="text-base font-bold text-[#00c2c7] mt-0.5">
                  {Math.round(totalSylhetSandCft).toLocaleString()} cft
                </div>
                <div className="text-[9px] text-[#8ba3c1]">2/3 Casting @ ৳{rates.sylhetSandRate}</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f1f5f9]/40 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Local Sand (লোকাল)</div>
                <div className="text-base font-bold text-[#f1f5f9] mt-0.5">
                  {Math.round(totalLocalSandCft).toLocaleString()} cft
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Brick + 1/3 Cast @ ৳{rates.localSandRate}</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#38bdf8] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Stone Agg. (পাথর কুচি)</div>
                <div className="text-base font-bold text-[#38bdf8] mt-0.5">
                  {Math.round(totalStoneAggCft).toLocaleString()} cft
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Stone chips @ ৳{rates.aggRate}</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f97316] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Picket Khoa (পিকেট)</div>
                <div className="text-base font-bold text-[#f97316] mt-0.5">
                  {totalPicketBricksPcs.toLocaleString()} pcs
                </div>
                <div className="text-[9px] text-[#8ba3c1]">~{Math.round(totalPicketAggCft).toLocaleString()} cft khoa @ ৳{rates.brickRate}</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#e67e22] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Brickwork (গাথুনি)</div>
                <div className="text-base font-bold text-[#e67e22] mt-0.5">
                  {totalBrickworkBricksPcs.toLocaleString()} pcs
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Wall masonry @ ৳{rates.brickRate}</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#00c2c7] rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[#8ba3c1]">Total Rebar Steel</div>
                <div className="text-base font-bold text-[#00c2c7] mt-0.5">
                  {Math.round(totalSteelKg).toLocaleString()} kg
                </div>
                <div className="text-[9px] text-[#8ba3c1]">
                  {(totalSteelKg / 1000).toFixed(2)} Metric Tons
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-6 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-[#f5a623] mx-auto" />
          <h3 className="text-base font-bold text-white">No Active Project Selected</h3>
          <p className="text-xs text-[#8ba3c1] max-w-md mx-auto">
            Create a new project or select an existing project from the dropdown above to start saving your estimates.
          </p>
          <button
            onClick={onOpenNewProjectModal}
            className="inline-flex items-center gap-1.5 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Unified Project Materials Price Option (Set Once For All Items) */}
      {activeProject && (
        <div
          className={`rounded-2xl p-4 sm:p-5 space-y-4 transition-colors ${
            isLight
              ? "bg-white border border-slate-300 text-slate-800 shadow-sm"
              : "bg-[#152033] border border-[#00c2c7]/50 text-white shadow-xl"
          }`}
        >
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3.5 ${
              isLight ? "border-slate-200" : "border-[#2d4a6a]"
            }`}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                    isLight
                      ? "bg-teal-50 text-teal-800 border-teal-200"
                      : "bg-[#00c2c7]/20 text-[#00c2c7] border-[#00c2c7]/40"
                  }`}
                >
                  <Coins className={`w-3.5 h-3.5 ${isLight ? "text-teal-700" : "text-[#00c2c7]"}`} />
                  Materials Price Option
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-mono font-semibold border ${
                    isLight
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-[#2ecc71]/15 text-[#2ecc71] border-[#2ecc71]/30"
                  }`}
                >
                  Set Once For All Items
                </span>
              </div>
              <h3
                className={`text-base sm:text-lg font-bold mt-1 flex items-center gap-2 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                <span>Unified Material Rates & Price Master</span>
              </h3>
              <p
                className={`text-xs mt-0.5 max-w-2xl ${
                  isLight ? "text-slate-600" : "text-[#8ba3c1]"
                }`}
              >
                Set material rates once here for this project. When rates are changed, it automatically updates pricing across{" "}
                <strong className={isLight ? "text-slate-900" : "text-white"}>
                  all {estimates.length} items
                </strong>
                , calculation sheets, and BOQ totals below.
              </p>
            </div>

            {/* Presets and Apply Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-1 rounded-xl p-1 text-[11px] border ${
                  isLight
                    ? "bg-slate-100 border-slate-200"
                    : "bg-[#0e1624] border-[#2d4a6a]"
                }`}
              >
                <span
                  className={`px-1 font-semibold hidden sm:inline ${
                    isLight ? "text-slate-600" : "text-[#8ba3c1]"
                  }`}
                >
                  Presets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const preset: GlobalMaterialRates = {
                      cementRate: 550,
                      sandRate: 45,
                      localSandRate: 45,
                      sylhetSandRate: 110,
                      aggRate: 120,
                      steelRate: 95,
                      brickRate: 15,
                      tileRate: 180,
                      boringRatePerFt: 180,
                      sandPileCostPerFt: 120,
                      grillRatePerSft: 180,
                      aluminiumGlassRatePerSft: 420,
                    };
                    setRates(preset);
                    handleApplyMaterialRates(preset);
                  }}
                  className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    isLight
                      ? "bg-white hover:bg-slate-200/70 text-slate-800 border border-slate-200 shadow-xs"
                      : "bg-[#1a2b42] hover:bg-[#243b55] text-white hover:text-[#00c2c7]"
                  }`}
                  title="PWD / BNBC Standard Rates"
                >
                  PWD Standard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset: GlobalMaterialRates = {
                      cementRate: 580,
                      sandRate: 50,
                      localSandRate: 50,
                      sylhetSandRate: 120,
                      aggRate: 135,
                      steelRate: 98,
                      brickRate: 16,
                      tileRate: 195,
                      boringRatePerFt: 200,
                      sandPileCostPerFt: 130,
                      grillRatePerSft: 195,
                      aluminiumGlassRatePerSft: 460,
                    };
                    setRates(preset);
                    handleApplyMaterialRates(preset);
                  }}
                  className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    isLight
                      ? "bg-white hover:bg-slate-200/70 text-slate-800 border border-slate-200 shadow-xs"
                      : "bg-[#1a2b42] hover:bg-[#243b55] text-white hover:text-[#f5a623]"
                  }`}
                  title="Current Market 2025 Rates"
                >
                  Market 2025
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset: GlobalMaterialRates = {
                      cementRate: 620,
                      sandRate: 55,
                      localSandRate: 55,
                      sylhetSandRate: 135,
                      aggRate: 150,
                      steelRate: 105,
                      brickRate: 18,
                      tileRate: 220,
                      boringRatePerFt: 220,
                      sandPileCostPerFt: 140,
                      grillRatePerSft: 220,
                      aluminiumGlassRatePerSft: 520,
                    };
                    setRates(preset);
                    handleApplyMaterialRates(preset);
                  }}
                  className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    isLight
                      ? "bg-white hover:bg-slate-200/70 text-slate-800 border border-slate-200 shadow-xs"
                      : "bg-[#1a2b42] hover:bg-[#243b55] text-white hover:text-[#38bdf8]"
                  }`}
                  title="Dhaka / Metro High-End Rates"
                >
                  Metro High
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApplyMaterialRates()}
                disabled={isApplyingRates}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] font-bold text-xs px-4 py-2 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Save and recalculate all project estimates with these rates"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isApplyingRates ? "Updating All..." : "Update All Items"}</span>
              </button>
            </div>
          </div>

          {/* Toast/Notification feedback */}
          {ratesUpdatedMsg && (
            <div className="bg-[#2ecc71]/20 border border-[#2ecc71]/50 text-[#2ecc71] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{ratesUpdatedMsg}</span>
            </div>
          )}

          {/* 11 Material Unit Rates Input Grid (Normal click, smooth cursor & clearable inputs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2.5">
            {/* 1. Cement */}
            <MaterialRateInput
              label="Cement"
              unit="৳ / bag"
              value={rates.cementRate}
              colorBorder="border-[#f5a623]/40"
              colorText="text-[#f5a623]"
              colorFocus="border-[#f5a623]"
              subtext={`${totalCementBags.toLocaleString()} bags = ৳${Math.round(totalCementBags * rates.cementRate).toLocaleString("en-IN")}`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("cementRate", val)}
            />

            {/* 2. Sylhet Sand (সিলেট বালু FM 2.2-2.5) */}
            <MaterialRateInput
              label="Sylhet Sand"
              unit="৳ / cft"
              value={rates.sylhetSandRate}
              colorBorder="border-[#00c2c7]/40"
              colorText="text-[#00c2c7]"
              colorFocus="border-[#00c2c7]"
              subtext={`${Math.round(totalSylhetSandCft).toLocaleString()} cft = ৳${Math.round(totalSylhetSandCft * rates.sylhetSandRate).toLocaleString("en-IN")}`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("sylhetSandRate", val)}
            />

            {/* 3. Local Sand (লোকাল বালু FM 1.2-1.5) */}
            <MaterialRateInput
              label="Local Sand"
              unit="৳ / cft"
              value={rates.localSandRate}
              colorBorder="border-[#f1f5f9]/40"
              colorText="text-[#f1f5f9]"
              colorFocus="border-[#f1f5f9]"
              subtext={`${Math.round(totalLocalSandCft).toLocaleString()} cft = ৳${Math.round(totalLocalSandCft * rates.localSandRate).toLocaleString("en-IN")}`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("localSandRate", val)}
            />

            {/* 4. Aggregate */}
            <MaterialRateInput
              label="Stone Agg."
              unit="৳ / cft"
              value={rates.aggRate}
              colorBorder="border-[#38bdf8]/40"
              colorText="text-[#38bdf8]"
              colorFocus="border-[#38bdf8]"
              subtext={`${Math.round(totalStoneAggCft).toLocaleString()} cft Stone = ৳${Math.round(totalStoneAggCft * rates.aggRate).toLocaleString("en-IN")}`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("aggRate", val)}
            />

            {/* 5. Rebar Steel */}
            <MaterialRateInput
              label="Steel Rebar"
              unit="৳ / kg"
              value={rates.steelRate}
              colorBorder="border-[#00c2c7]/40"
              colorText="text-[#00c2c7]"
              colorFocus="border-[#00c2c7]"
              subtext={`${Math.round(totalSteelKg).toLocaleString()} kg = ৳${Math.round(totalSteelKg * rates.steelRate).toLocaleString("en-IN")}`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("steelRate", val)}
            />

            {/* 6. Bricks */}
            <MaterialRateInput
              label="Bricks"
              unit="৳ / pc"
              value={rates.brickRate}
              colorBorder="border-[#e67e22]/40"
              colorText="text-[#e67e22]"
              colorFocus="border-[#e67e22]"
              subtext={`${totalBrickworkBricksPcs.toLocaleString()} wall + ${totalPicketBricksPcs.toLocaleString()} picket pcs`}
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("brickRate", val)}
            />

            {/* 7. Tiles */}
            <MaterialRateInput
              label="Tiles"
              unit="৳ / pc"
              value={rates.tileRate}
              colorBorder="border-[#1abc9c]/40"
              colorText="text-[#1abc9c]"
              colorFocus="border-[#1abc9c]"
              subtext="Floor & wall tile"
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("tileRate", val)}
            />

            {/* 8. Situ Pile Boring */}
            <MaterialRateInput
              label="Situ Boring"
              unit="৳ / rft"
              value={rates.boringRatePerFt}
              colorBorder="border-[#06b6d4]/40"
              colorText="text-[#06b6d4]"
              colorFocus="border-[#06b6d4]"
              subtext="Bored pile drilling"
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("boringRatePerFt", val)}
            />

            {/* 9. Sand Pile Boring */}
            <MaterialRateInput
              label="Sand Pile"
              unit="৳ / rft"
              value={rates.sandPileCostPerFt}
              colorBorder="border-[#f59e0b]/40"
              colorText="text-[#f59e0b]"
              colorFocus="border-[#f59e0b]"
              subtext="Sand compaction"
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("sandPileCostPerFt", val)}
            />

            {/* 10. Square Bar Grill */}
            <MaterialRateInput
              label="Square Grill"
              unit="৳ / sft"
              value={rates.grillRatePerSft}
              colorBorder="border-[#ec4899]/40"
              colorText="text-[#ec4899]"
              colorFocus="border-[#ec4899]"
              subtext={
                totalWindowAreaSft > 0
                  ? `${Math.round(totalWindowAreaSft).toLocaleString()} sft = ৳${Math.round(totalWindowAreaSft * rates.grillRatePerSft).toLocaleString("en-IN")}`
                  : "MS security grill"
              }
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("grillRatePerSft", val)}
            />

            {/* 11. Aluminium Frame with Glass */}
            <MaterialRateInput
              label="Alum + Glass"
              unit="৳ / sft"
              value={rates.aluminiumGlassRatePerSft}
              colorBorder="border-[#818cf8]/40"
              colorText="text-[#818cf8]"
              colorFocus="border-[#818cf8]"
              subtext={
                totalWindowAreaSft > 0
                  ? `${Math.round(totalWindowAreaSft).toLocaleString()} sft = ৳${Math.round(totalWindowAreaSft * rates.aluminiumGlassRatePerSft).toLocaleString("en-IN")}`
                  : "Window glass frame"
              }
              isLight={isLight}
              onCommit={(val) => handleUpdateSingleRate("aluminiumGlassRatePerSft", val)}
            />
          </div>

          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t text-xs ${
              isLight ? "border-slate-200" : "border-[#2d4a6a]/60"
            }`}
          >
            <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-600" : "text-[#8ba3c1]"}`}>
              <ShieldCheck className={`w-4 h-4 ${isLight ? "text-teal-600" : "text-[#00c2c7]"}`} />
              <span>
                Foundation elements (<strong>Isolated Footing</strong>, <strong>Situ Pile</strong>,{" "}
                <strong>Sand Pile</strong>) are built once for foundation level (1x multiplier).
              </span>
            </div>
            <div
              className={`font-mono text-xs font-bold ${
                isLight ? "text-teal-700" : "text-[#00c2c7]"
              }`}
            >
              Total Project Valuation: ৳{" "}
              {estimates.reduce((sum, e) => sum + (e.totalCost || 0), 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {/* Estimates File System Section */}
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#2d4a6a] pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#00c2c7]" />
              Project Estimate Files ({filteredEstimates.length})
            </h3>
            <p className="text-[11px] text-[#8ba3c1]">
              Saved calculation sheets in this project with complete itemized material takeoffs, specifications, and costs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Cards vs All Materials Table */}
            <div className="flex items-center bg-[#0e1624] border border-[#2d4a6a] rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setFileViewMode("cards")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  fileViewMode === "cards"
                    ? "bg-[#00c2c7] text-[#0f1c2e]"
                    : "text-[#8ba3c1] hover:text-white"
                }`}
                title="Cards View with Full Material Matrix"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setFileViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  fileViewMode === "table"
                    ? "bg-[#00c2c7] text-[#0f1c2e]"
                    : "text-[#8ba3c1] hover:text-white"
                }`}
                title="All Materials Engineering Table"
              >
                <Table className="w-3.5 h-3.5" />
                <span>All Materials Table</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar max-w-full">
              {[
                { id: "all", label: "All Files" },
                { id: "grade_beam", label: "Grade Beams (1×)" },
                { id: "floor_beam", label: "Floor Beams (Storeys)" },
                { id: "short_col", label: "Short Columns (1×)" },
                { id: "long_col", label: "Floor Columns (Storeys)" },
                { id: "beam", label: "All Beams" },
                { id: "column", label: "All Columns" },
                { id: "footing", label: "Footings" },
                { id: "situ_pile", label: "Situ Piles" },
                { id: "sand_pile", label: "Sand Piles" },
                { id: "slab", label: "Slabs" },
                { id: "stair", label: "Stairs" },
                { id: "brick", label: "Brickwork" },
                { id: "tiles", label: "Tiles" },
                { id: "contractor", label: "Contractor Rates" },
                { id: "structural", label: "Structural" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                    filterType === f.id
                      ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                      : "bg-[#243b55] text-[#8ba3c1] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredEstimates.length === 0 ? (
          <div className="p-8 text-center bg-[#121a2b] border border-[#2d4a6a]/60 rounded-xl space-y-2">
            <Layers className="w-8 h-8 text-[#8ba3c1] mx-auto opacity-50" />
            <div className="text-xs text-[#8ba3c1] font-semibold">
              {!activeProject ? "No project selected yet." : "No estimate files saved yet in this project."}
            </div>
            <p className="text-[11px] text-[#8ba3c1]/70">
              {!activeProject
                ? "Click 'Add New Project' above to create your first personal project."
                : "Select any calculator module below to calculate quantities and click 'Save File'."}
            </p>
          </div>
        ) : fileViewMode === "table" ? (
          /* =========================================================
             VIEW MODE: FULL MATERIALS ENGINEERING BOQ TABLE
             ========================================================= */
          <div className="overflow-x-auto border border-[#2d4a6a] rounded-xl bg-[#0e1624]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1a2b42] text-white border-b border-[#2d4a6a]">
                  <th className="py-2.5 px-3 font-bold w-10 text-center">#</th>
                  <th className="py-2.5 px-3 font-bold">Estimate File / Element</th>
                  <th className="py-2.5 px-2 font-bold text-center">Mult</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#f5a623]">Cement (Bags)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#f1f5f9]">Sand (Sylhet / Local cft)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#38bdf8]">Stone/Khoa (cft)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#00c2c7]">Steel (kg)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#e67e22]">Bricks (pcs)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#1abc9c]">Tiles (pcs)</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#c4b5fd]">Vol / Boring</th>
                  <th className="py-2.5 px-3 font-bold text-right text-[#2ecc71]">Total Cost (৳)</th>
                  <th className="py-2.5 px-3 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d4a6a]/60 text-white">
                {filteredEstimates.map((est, idx) => {
                  const mat = extractItemMaterials(est);
                  const isGradeBeam = isEstGradeBeam(est);
                  const isShortCol = isEstShortCol(est);
                  const isCombinedCol =
                    est.type === "column" &&
                    (est.data?.colMode === "combined" ||
                      est.summary?.colMode === "combined" ||
                      (!isShortCol && (est.summary?.shortColumn || est.data?.columns?.[0]?.category === "combined")));
                  const isFoundation = est.type === "footing" || est.type === "situ_pile" || est.type === "sand_pile";
                  const calcMeta = calculatorCards.find((c) => c.type === est.type);
                  const Icon = calcMeta?.icon || FileText;
                  return (
                    <tr
                      key={est.id}
                      className="hover:bg-[#152338] transition font-sans"
                    >
                      <td className="py-2.5 px-3 text-center text-[#8ba3c1] font-mono font-bold text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${getAccentForTheme(calcMeta?.accent || "#00c2c7")}${isLight ? "18" : "20"}`,
                              color: getAccentForTheme(calcMeta?.accent || "#00c2c7"),
                              border: isLight ? `1px solid ${getAccentForTheme(calcMeta?.accent || "#00c2c7")}35` : undefined,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-[280px]" title={est.name}>
                              {est.name}
                            </div>
                            <div className="text-[10px] text-[#8ba3c1] truncate font-mono">
                              {isGradeBeam
                                ? "GRADE BEAM"
                                : est.type === "beam"
                                ? "FLOOR BEAM"
                                : isShortCol
                                ? "SHORT COLUMN"
                                : isCombinedCol
                                ? "COLUMN (SHORT & LONG)"
                                : est.type === "contractor"
                                ? "CONTRACTOR & LABOUR SCHEDULE"
                                : est.type.toUpperCase()} · {new Date(est.date).toLocaleDateString()}
                              {mat.mixRatio ? ` · Mix ${mat.mixRatio}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {est.type === "contractor" ? (
                          <span
                            className="bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                            title={`Contractor Schedule: ${est.data?.stories || 1} Storeys Covered`}
                          >
                            {est.data?.stories ? `${est.data.stories} Storeys` : "Contract"}
                          </span>
                        ) : isGradeBeam ? (
                          <span
                            className="bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                            title="Grade Beam: Plinth substructure constructed once (1 storey fixed)"
                          >
                            1× Grade Beam
                          </span>
                        ) : isShortCol ? (
                          <span
                            className="bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                            title="Short Column: Plinth substructure constructed once (1 storey fixed)"
                          >
                            1× Short Col
                          </span>
                        ) : isCombinedCol ? (
                          <span
                            className="bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                            title={`Combined Column: Short (1×) + Long (×${mat.multiplier} Storeys)`}
                          >
                            Short 1× + Long ×{mat.multiplier}
                          </span>
                        ) : isFoundation ? (
                          <span
                            className="bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                            title="Foundation Substructure: Used once for building (no storey multiplier)"
                          >
                            1× Fnd
                          </span>
                        ) : (
                          <span className="bg-[#1a2b42] text-[#00c2c7] border border-[#00c2c7]/30 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                            {mat.multiplier}x {est.type === "beam" ? "Floor Beam" : est.type === "column" ? "Floor Col" : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.cementBags > 0 ? (
                          <div>
                            <span className="font-bold text-[#f5a623]">{mat.cementBags}</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">৳{mat.cementCost.toLocaleString("en-IN")}</div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.sandCft > 0 ? (
                          <div>
                            {mat.sylhetSandCft > 0 ? (
                              <div className="text-[11px] leading-tight">
                                <span className="font-bold text-[#00c2c7]">{mat.sylhetSandCft}</span>
                                <span className="text-[9px] text-[#8ba3c1] ml-0.5">Syl</span>
                                <div className="text-[#f1f5f9] font-bold">
                                  <span>{mat.localSandCft}</span>
                                  <span className="text-[9px] text-[#8ba3c1] ml-0.5">Loc</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-[#f1f5f9]">{mat.localSandCft || mat.sandCft}</span>
                                <span className="text-[9px] text-[#8ba3c1] ml-0.5">Loc</span>
                              </div>
                            )}
                            <div className="text-[9px] text-[#8ba3c1]/70 mt-0.5">৳{mat.sandCost.toLocaleString("en-IN")}</div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.aggCft > 0 ? (
                          <div>
                            <span className="font-bold text-[#38bdf8]">{mat.aggCft}</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">
                              {mat.aggType === "brick_khoa" ? (
                                <span className="text-[#f5a623]">Khoa (Picket)</span>
                              ) : (
                                `Stone · ৳${mat.aggCost.toLocaleString("en-IN")}`
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.steelKg > 0 ? (
                          <div>
                            <span className="font-bold text-[#00c2c7]">{mat.steelKg.toLocaleString("en-IN")}</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">৳{mat.steelCost.toLocaleString("en-IN")}</div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.bricksPcs > 0 ? (
                          <div>
                            <span className="font-bold text-[#e67e22]">{mat.bricksPcs.toLocaleString("en-IN")}</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">৳{mat.brickCost.toLocaleString("en-IN")}</div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.tilesPcs > 0 ? (
                          <div>
                            <span className="font-bold text-[#1abc9c]">{mat.tilesPcs.toLocaleString("en-IN")}</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">{mat.tilesBoxes} bxs ({mat.tileAreaSqft} sqft)</div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {mat.pilesCount > 0 ? (
                          <div className="text-[#f43f5e]">
                            <span className="font-bold">{mat.boringRft} rft</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">{mat.pilesCount} piles</div>
                          </div>
                        ) : (mat.wetVolCft > 0 || mat.dryVolCft > 0) ? (
                          <div className="text-[#c4b5fd]">
                            <span className="font-bold">{mat.wetVolCft || mat.dryVolCft} cft</span>
                            <div className="text-[9px] text-[#8ba3c1]/70">Wet vol</div>
                          </div>
                        ) : est.type === "contractor" ? (
                          <div className="text-[#f59e0b]">
                            <span className="font-bold">{est.summary?.itemsCount || est.data?.items?.length || 0} tasks</span>
                            <div className="text-[9px] text-[#8ba3c1]/80">
                              {est.summary?.totalBuiltupAreaSft ? `${Number(est.summary.totalBuiltupAreaSft).toLocaleString()} sft` : "Labour Rate"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8ba3c1]/40">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2ecc71] whitespace-nowrap">
                        ৳ {Math.round(est.totalCost).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToCalculator(
                                (est.type === "tile" ? "tiles" : est.type) as EstimateType,
                                est
                              )
                            }
                            className="p-1 text-[#00c2c7] hover:bg-[#243b55] rounded transition"
                            title="Open in Calculator"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {canEditActiveProject && (
                            <button
                              type="button"
                              onClick={() => setEstimateToEdit(est)}
                              className="p-1 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded transition"
                              title="Edit / Rename File"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExportSingleEstimate(est)}
                            className="p-1 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded transition"
                            title="Download JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {canEditActiveProject && (
                            <button
                              type="button"
                              onClick={() => setEstimateToDelete(est)}
                              className="p-1 text-[#8ba3c1] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/20 rounded transition"
                              title="Delete File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const totals = filteredEstimates.reduce(
                    (acc, e) => {
                      const m = extractItemMaterials(e);
                      return {
                        cement: acc.cement + m.cementBags,
                        sand: acc.sand + m.sandCft,
                        sylhetSand: acc.sylhetSand + m.sylhetSandCft,
                        localSand: acc.localSand + m.localSandCft,
                        agg: acc.agg + (m.aggType === "brick_khoa" ? 0 : m.aggCft),
                        steel: acc.steel + m.steelKg,
                        bricks: acc.bricks + m.bricksPcs,
                        tiles: acc.tiles + m.tilesPcs,
                        vol: acc.vol + (m.wetVolCft || m.dryVolCft),
                        cost: acc.cost + (e.totalCost || 0),
                      };
                    },
                    { cement: 0, sand: 0, sylhetSand: 0, localSand: 0, agg: 0, steel: 0, bricks: 0, tiles: 0, vol: 0, cost: 0 }
                  );
                  return (
                    <tr className="bg-[#152033] border-t-2 border-[#00c2c7] text-white font-bold text-xs">
                      <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-[#00c2c7]">
                        Grand Total Material Sums ({filteredEstimates.length} Files):
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#f5a623]">
                        {totals.cement.toLocaleString()} bags
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#f1f5f9]">
                        <div>{Number(totals.sand.toFixed(1)).toLocaleString()} cft</div>
                        {(totals.sylhetSand > 0 || totals.localSand > 0) && (
                          <div className="text-[9px] font-normal text-[#8ba3c1] mt-0.5 whitespace-nowrap">
                            <span className="text-[#00c2c7] font-semibold">{Number(totals.sylhetSand.toFixed(1)).toLocaleString()} Syl</span>
                            {" · "}
                            <span className="text-[#f1f5f9] font-semibold">{Number(totals.localSand.toFixed(1)).toLocaleString()} Loc</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#38bdf8]">
                        {Number(totals.agg.toFixed(1)).toLocaleString()} cft
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#00c2c7]">
                        {Math.round(totals.steel).toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#e67e22]">
                        {totals.bricks > 0 ? `${totals.bricks.toLocaleString()} pcs` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#1abc9c]">
                        {totals.tiles > 0 ? `${totals.tiles.toLocaleString()} pcs` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#c4b5fd]">
                        {totals.vol > 0 ? `${Number(totals.vol.toFixed(1))} cft` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#2ecc71] text-sm font-extrabold whitespace-nowrap">
                        ৳ {Math.round(totals.cost).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-[#8ba3c1]">
                        Consolidated
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        ) : (
          /* =========================================================
             VIEW MODE: DETAILED CARDS SHOWING ALL MATERIALS OF EVERY ITEM
             ========================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredEstimates.map((est) => {
              const calcMeta = calculatorCards.find((c) => c.type === est.type);
              const Icon = calcMeta?.icon || FileText;
              const mat = extractItemMaterials(est);
              const isGradeBeam = isEstGradeBeam(est);
              const isShortCol = isEstShortCol(est);
              const isCombinedCol =
                est.type === "column" &&
                (est.data?.colMode === "combined" ||
                  est.summary?.colMode === "combined" ||
                  (!isShortCol && (est.summary?.shortColumn || est.data?.columns?.[0]?.category === "combined")));
              const isFoundation = est.type === "footing" || est.type === "situ_pile" || est.type === "sand_pile";
              const isExpanded = Boolean(expandedFiles[est.id]);

              return (
                <div
                  key={est.id}
                  className="bg-[#121a2b] border border-[#2d4a6a] hover:border-[#00c2c7]/60 rounded-xl p-3.5 transition shadow-lg flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Header: Icon, Name, Date, Mult, Cost */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${getAccentForTheme(calcMeta?.accent || "#00c2c7")}${isLight ? "18" : "20"}`,
                            color: getAccentForTheme(calcMeta?.accent || "#00c2c7"),
                            border: isLight ? `1px solid ${getAccentForTheme(calcMeta?.accent || "#00c2c7")}35` : undefined,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate" title={est.name}>
                            {est.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-[#8ba3c1] uppercase font-mono">
                              {isGradeBeam
                                ? "Grade Beam"
                                : est.type === "beam"
                                ? "Floor Beam"
                                : isShortCol
                                ? "Short Column"
                                : isCombinedCol
                                ? "Column (Short & Long)"
                                : est.type} · {new Date(est.date).toLocaleDateString()}
                            </span>
                            {isGradeBeam ? (
                              <span className="bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                                1× Grade Beam (Plinth Level)
                              </span>
                            ) : isShortCol ? (
                              <span className="bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                                1× Short Column (Plinth Level)
                              </span>
                            ) : isCombinedCol ? (
                              <span className="bg-[#00c2c7]/20 border border-[#00c2c7]/40 text-[#00c2c7] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                                Short 1× + Long ×{mat.multiplier}
                              </span>
                            ) : isFoundation ? (
                              <span className="bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                                1× Foundation (Used Once)
                              </span>
                            ) : mat.isMultiplying ? (
                              <span className="bg-[#00c2c7]/20 border border-[#00c2c7]/40 text-[#00c2c7] px-1 py-0.2 rounded text-[9px] font-mono font-bold">
                                {mat.multiplier}x {est.type === "beam" ? "Floor Beam" : "Multiplier"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-[#2ecc71]">
                          ৳ {Math.round(est.totalCost).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    {/* ALL MATERIALS / CONTRACTOR BREAKDOWN SHOWCASE */}
                    <div className="pt-2 border-t border-[#2d4a6a]/60 space-y-2">
                      <div className="text-[10px] font-bold text-[#00c2c7] flex items-center justify-between">
                        <span>{est.type === "contractor" ? "Contractor & Labour Breakdown:" : "All Item Materials:"}</span>
                        <span className="text-[9px] text-[#8ba3c1] font-mono">
                          {est.type === "contractor"
                            ? `${est.summary?.itemsCount || est.data?.items?.length || 0} Tasks Specified`
                            : isFoundation
                            ? "Foundation Substructure (Used Once)"
                            : isGradeBeam
                            ? "Grade Beam (1 Storey Fixed)"
                            : isShortCol
                            ? "Short Column (1 Storey Fixed)"
                            : isCombinedCol
                            ? `Short 1× + Long ×${mat.multiplier} Storeys`
                            : mat.isMultiplying
                            ? `${mat.multiplier} Storeys Total`
                            : "1 Storey"}
                        </span>
                      </div>

                      {est.type === "contractor" ? (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 text-[10px]">
                            {/* Civil Construction */}
                            <div className={`p-1.5 rounded-lg border ${
                              isLight ? "bg-white border-teal-200 shadow-xs" : "bg-[#1a2b42] border-[#00c2c7]/30"
                            }`}>
                              <div className={`text-[8px] uppercase font-mono flex items-center justify-between ${
                                isLight ? "text-slate-600" : "text-[#8ba3c1]"
                              }`}>
                                <span>Civil Works</span>
                                <span className={isLight ? "text-teal-700 font-bold" : "text-[#00c2c7]"}>
                                   {est.summary?.totalBuiltupAreaSft ? `${Number(est.summary.totalBuiltupAreaSft).toLocaleString()} sft` : ""}
                                </span>
                              </div>
                              <div className={`font-bold text-[11px] font-mono ${
                                isLight ? "text-teal-800" : "text-[#00c2c7]"
                              }`}>
                                ৳ {Number(est.summary?.civilFloorTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <div className={`text-[8px] ${isLight ? "text-slate-500" : "text-[#8ba3c1]/70"}`}>
                                Ground & Storey RCC/Masonry
                              </div>
                            </div>

                            {/* Tiles Fitting Labour */}
                            <div className={`p-1.5 rounded-lg border ${
                              isLight ? "bg-white border-emerald-200 shadow-xs" : "bg-[#1a2b42] border-[#10b981]/30"
                            }`}>
                              <div className={`text-[8px] uppercase font-mono flex items-center justify-between ${
                                isLight ? "text-slate-600" : "text-[#8ba3c1]"
                              }`}>
                                <span>Tiles Work</span>
                                <span className={isLight ? "text-emerald-700 font-bold" : "text-[#10b981]"}>৳35/sft</span>
                              </div>
                              <div className={`font-bold text-[11px] font-mono ${
                                isLight ? "text-emerald-800" : "text-[#10b981]"
                              }`}>
                                ৳ {Number(est.summary?.tilesTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <div className={`text-[8px] ${isLight ? "text-slate-500" : "text-[#8ba3c1]/70"}`}>
                                Floor & wall tiles fitting
                              </div>
                            </div>

                            {/* Electrical Labour */}
                            <div className={`p-1.5 rounded-lg border ${
                              isLight ? "bg-white border-amber-200 shadow-xs" : "bg-[#1a2b42] border-[#f5a623]/30"
                            }`}>
                              <div className={`text-[8px] uppercase font-mono flex items-center justify-between ${
                                isLight ? "text-slate-600" : "text-[#8ba3c1]"
                              }`}>
                                <span>Electrical</span>
                                <span className={isLight ? "text-amber-700 font-bold" : "text-[#f5a623]"}>৳20/sft</span>
                              </div>
                              <div className={`font-bold text-[11px] font-mono ${
                                isLight ? "text-amber-800" : "text-[#f5a623]"
                              }`}>
                                ৳ {Number(est.summary?.electricalTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <div className={`text-[8px] ${isLight ? "text-slate-500" : "text-[#8ba3c1]/70"}`}>
                                Conduit, wiring & boards
                              </div>
                            </div>

                            {/* Plumbing Labour */}
                            <div className={`p-1.5 rounded-lg border ${
                              isLight ? "bg-white border-sky-200 shadow-xs" : "bg-[#1a2b42] border-[#38bdf8]/30"
                            }`}>
                              <div className={`text-[8px] uppercase font-mono flex items-center justify-between ${
                                isLight ? "text-slate-600" : "text-[#8ba3c1]"
                              }`}>
                                <span>Plumbing</span>
                                <span className={isLight ? "text-sky-700 font-bold" : "text-[#38bdf8]"}>৳25/sft</span>
                              </div>
                              <div className={`font-bold text-[11px] font-mono ${
                                isLight ? "text-sky-800" : "text-[#38bdf8]"
                              }`}>
                                ৳ {Number(est.summary?.plumbingTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <div className={`text-[8px] ${isLight ? "text-slate-500" : "text-[#8ba3c1]/70"}`}>
                                Water lines & fixtures
                              </div>
                            </div>

                            {/* Painting Labour */}
                            <div className={`p-1.5 rounded-lg border ${
                              isLight ? "bg-white border-purple-200 shadow-xs" : "bg-[#1a2b42] border-[#a855f7]/30"
                            }`}>
                              <div className={`text-[8px] uppercase font-mono flex items-center justify-between ${
                                isLight ? "text-slate-600" : "text-[#8ba3c1]"
                              }`}>
                                <span>Painting</span>
                                <span className={isLight ? "text-purple-700 font-bold" : "text-[#a855f7]"}>৳10/sft</span>
                              </div>
                              <div className={`font-bold text-[11px] font-mono ${
                                isLight ? "text-purple-800" : "text-[#a855f7]"
                              }`}>
                                ৳ {Number(est.summary?.paintingTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <div className={`text-[8px] ${isLight ? "text-slate-500" : "text-[#8ba3c1]/70"}`}>
                                {est.summary?.totalPaintingWallAreaSft ? `${Number(est.summary.totalPaintingWallAreaSft).toLocaleString()} sft wall` : "Wall & ceiling"}
                              </div>
                            </div>
                          </div>

                          {/* Custom / Additional if present */}
                          {Boolean(est.summary?.customTotal) && (
                            <div className={`p-1.5 rounded-lg border flex items-center justify-between text-[10px] ${
                              isLight ? "bg-white border-emerald-200 shadow-xs" : "bg-[#1a2b42] border-[#2ecc71]/30"
                            }`}>
                              <span className={`text-[8px] uppercase font-mono ${isLight ? "text-slate-600" : "text-[#8ba3c1]"}`}>
                                Additional / Custom Work
                              </span>
                              <span className={`font-bold font-mono ${isLight ? "text-emerald-800" : "text-[#2ecc71]"}`}>
                                ৳ {Number(est.summary.customTotal).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          {/* Cement */}
                          {mat.cementBags > 0 && (
                            <div className="bg-[#1a2b42] border border-[#f5a623]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Cement</div>
                              <div className="font-bold text-[#f5a623] text-[11px]">
                                {mat.cementBags} bags
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.cementCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Sylhet Sand (2/3 for casting) */}
                          {mat.sylhetSandCft > 0 && (
                            <div className="bg-[#1a2b42] border border-[#00c2c7]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#00c2c7] uppercase font-mono font-semibold">
                                Sylhet Sand (2/3)
                              </div>
                              <div className="font-bold text-[#00c2c7] text-[11px]">
                                {mat.sylhetSandCft} cft
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.sylhetSandCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Local Sand (1/3 for casting, 100% for brickwork/tiles) */}
                          {mat.localSandCft > 0 && (
                            <div className="bg-[#1a2b42] border border-[#f1f5f9]/15 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono font-semibold">
                                {mat.sylhetSandCft > 0 ? "Local Sand (1/3)" : "Local Sand"}
                              </div>
                              <div className="font-bold text-[#f1f5f9] text-[11px]">
                                {mat.localSandCft} cft
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.localSandCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Fallback if legacy sand with no split */}
                          {mat.sylhetSandCft === 0 && mat.localSandCft === 0 && mat.sandCft > 0 && (
                            <div className="bg-[#1a2b42] border border-[#f1f5f9]/15 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Sand</div>
                              <div className="font-bold text-[#f1f5f9] text-[11px]">
                                {mat.sandCft} cft
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.sandCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Aggregates (Stone / Khoa) */}
                          {mat.aggCft > 0 && (
                            <div className="bg-[#1a2b42] border border-[#38bdf8]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">
                                {mat.aggType === "brick_khoa" ? "Khoa (Picket)" : "Stone Agg"}
                              </div>
                              <div className="font-bold text-[#38bdf8] text-[11px]">
                                {mat.aggCft} cft
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                {mat.aggType === "brick_khoa" ? (
                                  <span className="text-[#f5a623]">Picket Applied</span>
                                ) : (
                                  `৳ ${mat.aggCost.toLocaleString("en-IN")}`
                                )}
                              </div>
                            </div>
                          )}

                          {/* Rebar Steel */}
                          {mat.steelKg > 0 && (
                            <div className="bg-[#1a2b42] border border-[#00c2c7]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Rebar Steel</div>
                              <div className="font-bold text-[#00c2c7] text-[11px]">
                                {mat.steelKg.toLocaleString("en-IN")} kg
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.steelCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Bricks */}
                          {mat.bricksPcs > 0 && (
                            <div className="bg-[#1a2b42] border border-[#e67e22]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Bricks</div>
                              <div className="font-bold text-[#e67e22] text-[11px]">
                                {mat.bricksPcs.toLocaleString("en-IN")} pcs
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                ৳ {mat.brickCost.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}

                          {/* Tiles */}
                          {mat.tilesPcs > 0 && (
                            <div className="bg-[#1a2b42] border border-[#1abc9c]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Tiles</div>
                              <div className="font-bold text-[#1abc9c] text-[11px]">
                                {mat.tilesPcs.toLocaleString("en-IN")} tiles
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                {mat.tilesBoxes} boxes ({mat.tileAreaSqft} sqft)
                              </div>
                            </div>
                          )}

                          {/* Concrete Volume */}
                          {(mat.wetVolCft > 0 || mat.dryVolCft > 0) && (
                            <div className="bg-[#1a2b42] border border-[#c4b5fd]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Concrete Vol</div>
                              <div className="font-bold text-[#c4b5fd] text-[11px]">
                                {mat.wetVolCft || mat.dryVolCft} cft
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                Dry: {mat.dryVolCft || (mat.wetVolCft * 1.54).toFixed(1)} cft
                              </div>
                            </div>
                          )}

                          {/* Piles / Boring */}
                          {mat.pilesCount > 0 && (
                            <div className="bg-[#1a2b42] border border-[#f43f5e]/25 rounded-lg p-1.5">
                              <div className="text-[8px] text-[#8ba3c1] uppercase font-mono">Piles & Depth</div>
                              <div className="font-bold text-[#f43f5e] text-[11px]">
                                {mat.pilesCount} Piles
                              </div>
                              <div className="text-[8px] text-[#8ba3c1]/70">
                                {mat.boringRft} rft ({mat.pileDiameterIn}" dia)
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rebar Diameter Breakdown tags if present */}
                      {Object.keys(mat.steelBreakdown).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[9px] text-[#8ba3c1] font-semibold">Rebars:</span>
                          {Object.entries(mat.steelBreakdown).map(([dia, w]) => (
                            <span
                              key={dia}
                              className="text-[9px] bg-[#0e1624] border border-[#00c2c7]/30 text-[#00c2c7] px-1.5 py-0.2 rounded font-mono font-medium"
                            >
                              Ø{dia}mm: {w}kg
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expand / Collapse Full Specs */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleFileExpand(est.id)}
                          className="w-full flex items-center justify-between text-[10px] text-[#8ba3c1] hover:text-[#00c2c7] py-0.5 transition cursor-pointer"
                        >
                          <span>{isExpanded ? "▲ Hide Specifications" : "▼ Show Full Specifications"}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-1 p-2 bg-[#0e1624] border border-[#2d4a6a]/60 rounded-lg text-[10px] text-[#8ba3c1] space-y-1">
                            {mat.specifications.map((s, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="text-[#00c2c7] font-bold">•</span>
                                <span>{s}</span>
                              </div>
                            ))}
                            <div className="pt-1 border-t border-[#2d4a6a]/40 text-[9px] text-[#8ba3c1]/80">
                              Applied Rates: Cement @ ৳{mat.rates.cementRate} | Sand @ ৳{mat.rates.sandRate} | Agg @ ৳{mat.rates.aggRate} | Steel @ ৳{mat.rates.steelRate}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Open & Edit, Rename/Details, Export, Delete */}
                  <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-[#2d4a6a]/60">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToCalculator(
                          (est.type === "tile" ? "tiles" : est.type) as EstimateType,
                          est
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-white py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition active:scale-95"
                      title="Open and edit parameters in calculator"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open File</span>
                    </button>

                    {canEditActiveProject && (
                      <button
                        type="button"
                        onClick={() => setEstimateToEdit(est)}
                        className="p-1.5 text-[#8ba3c1] hover:text-[#00c2c7] hover:bg-[#243b55] rounded-lg transition"
                        title="Rename or view all materials details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleExportSingleEstimate(est)}
                      className="p-1.5 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded-lg transition"
                      title="Download estimate file (.json)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {canEditActiveProject && (
                      <button
                        type="button"
                        onClick={() => setEstimateToDelete(est)}
                        className="p-1.5 text-[#8ba3c1] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/15 rounded-lg transition"
                        title="Delete estimate file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Calculator Launchpad */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#00c2c7]" />
            Civil Engineering Calculator Modules
          </h3>
          <span className="text-[11px] text-[#8ba3c1]">
            Select any module to start calculating
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {calculatorCards.map((card) => {
            const Icon = card.icon;
            const count =
              (Array.isArray(activeProject?.estimates)
                ? activeProject.estimates.filter((e) => e.type === card.type)
                : []
              ).length || 0;

            return (
              <div
                key={card.type}
                onClick={() => onNavigateToCalculator(card.type)}
                className="group bg-[#152033] hover:bg-[#1a2b42] border border-[#2d4a6a] hover:border-[#00c2c7] rounded-xl p-3.5 cursor-pointer transition-all duration-200 shadow hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition"
                      style={{
                        backgroundColor: `${getAccentForTheme(card.accent)}${isLight ? "18" : "20"}`,
                        color: getAccentForTheme(card.accent),
                        border: isLight ? `1px solid ${getAccentForTheme(card.accent)}35` : undefined,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {count > 0 && (
                      <span className="text-[10px] bg-[#243b55] text-[#00c2c7] border border-[#00c2c7]/30 px-2 py-0.5 rounded-full font-mono font-bold">
                        {count} saved
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-[#00c2c7] transition">
                    {card.name}
                  </h4>
                  <p className="text-[11px] text-[#8ba3c1] mt-1 leading-snug">
                    {card.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#2d4a6a]/40 flex items-center justify-between text-[10px] text-[#00c2c7] font-semibold">
                  <span>Launch Estimator</span>
                  <span className="group-hover:translate-x-0.5 transition">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Project Deletion */}
      <ConfirmModal
        isOpen={Boolean(projectToDelete)}
        title="Delete Project"
        message={`Are you sure you want to permanently delete project "${projectToDelete?.name}" and all of its ${projectToDelete?.estimates?.length || 0} saved estimate files? This cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={async () => {
          if (projectToDelete) {
            await onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
          }
        }}
        onClose={() => setProjectToDelete(null)}
      />

      {/* Confirmation Modal for Estimate Deletion */}
      <ConfirmModal
        isOpen={Boolean(estimateToDelete)}
        title="Delete Estimate File"
        message={`Are you sure you want to delete estimate file "${estimateToDelete?.name}"? It will be permanently removed from project "${activeProject?.name}".`}
        confirmLabel="Delete File"
        onConfirm={async () => {
          if (estimateToDelete) {
            await onDeleteEstimate(estimateToDelete.id);
            setEstimateToDelete(null);
          }
        }}
        onClose={() => setEstimateToDelete(null)}
      />

      {/* Modal for Renaming / Editing Estimate metadata */}
      <EditEstimateModal
        isOpen={Boolean(estimateToEdit)}
        estimate={estimateToEdit}
        onClose={() => setEstimateToEdit(null)}
        onRename={async (estimateId, newName) => {
          await onRenameEstimate(estimateId, newName);
        }}
        onOpenInCalculator={(est) => {
          onNavigateToCalculator(est.type, est);
        }}
      />
    </div>
  );
};
