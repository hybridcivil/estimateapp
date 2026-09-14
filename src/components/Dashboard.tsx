import React, { useState } from "react";
import { Project, ProjectEstimateItem, EstimateType } from "../types";
import {
  FolderKanban,
  Plus,
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
} from "lucide-react";

interface DashboardProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProjectModal: () => void;
  onDeleteProject: (id: string) => Promise<void>;
  onDeleteEstimate: (id: string) => Promise<void>;
  onNavigateToCalculator: (type: EstimateType, estimateToLoad?: ProjectEstimateItem) => void;
  onOpenReportModal: () => void;
  onImportProject: (projectData: any) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onDeleteProject,
  onDeleteEstimate,
  onNavigateToCalculator,
  onOpenReportModal,
  onImportProject,
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [fileImportError, setFileImportError] = useState("");

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
  const filteredEstimates =
    filterType === "all"
      ? estimates
      : estimates.filter((e) => e.type === filterType);

  const activeTotalCost = estimates.reduce((s, e) => s + (e.totalCost || 0), 0);

  // Consolidated material sums
  let totalCementBags = 0;
  let totalSandCft = 0;
  let totalAggCft = 0;
  let totalSteelKg = 0;
  let totalBricks = 0;

  estimates.forEach((e) => {
    const s = e.summary || {};
    if (s.cementBags) totalCementBags += s.cementBags;
    if (s.totalCementBags) totalCementBags += s.totalCementBags;

    if (s.sandVolume) totalSandCft += s.sandVolume;
    if (s.sandVol) totalSandCft += s.sandVol;
    if (s.totalSand) totalSandCft += s.totalSand;
    if (s.totalSandCft) totalSandCft += s.totalSandCft;

    if (s.aggregateVolume) totalAggCft += s.aggregateVolume;
    if (s.aggregateVol) totalAggCft += s.aggregateVol;
    if (s.totalAggCft) totalAggCft += s.totalAggCft;

    if (s.totalSteel) totalSteelKg += s.totalSteel;
    if (s.totalSteelKg) totalSteelKg += s.totalSteelKg;

    if (s.totalBricks) totalBricks += s.totalBricks;
    if (s.brickQty) totalBricks += s.brickQty;
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
      name: "Beam Calculator",
      description: "RC Beams with top, bottom & extra bars, stirrups & mix volume",
      icon: Columns,
      accent: "#00c2c7",
    },
    {
      type: "column",
      name: "Column Calculator",
      description: "Short & slender columns with ties, footing overlap & concrete",
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
      type: "structural",
      name: "Whole Building",
      description: "Multi-storey structural load, thumb rule BOQ & total budget",
      icon: Calculator,
      accent: "#3498db",
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0f1c2e] text-[#f1f5f9] p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#152033] via-[#1a2b42] to-[#122238] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#00c2c7]/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#00c2c7] tracking-wider uppercase bg-[#00c2c7]/10 px-2 py-0.5 rounded border border-[#00c2c7]/30">
                Ashraf Civil Studio
              </span>
              <span className="text-xs text-[#8ba3c1]">
                · Project Estimation Dashboard
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Civil Engineering Estimation & File System
            </h2>
            <p className="text-xs sm:text-sm text-[#8ba3c1] max-w-2xl mt-1">
              Create civil engineering projects, calculate structural quantities (Beam, Column, Footing, Slab, Stair, Brickwork, Tiles) and store every estimate file safely.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[#2d4a6a] transition shadow-sm">
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
              Active Project Budget
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#2ecc71] mt-0.5">
              ৳ {Math.round(activeTotalCost).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-[#121a2b]/70 border border-[#2d4a6a] rounded-xl p-2.5">
            <div className="text-[10px] text-[#8ba3c1] font-medium flex items-center gap-1">
              <HardHat className="w-3 h-3 text-[#e67e22]" />
              All Projects Portfolio
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
              ৳ {Math.round(totalPortfolioBudget).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Active Project Card & BOQ Summary */}
      {activeProject ? (
        <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d4a6a] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded font-semibold border border-[#f5a623]/40">
                  Active Project
                </span>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {activeProject.name}
                </h3>
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
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8ba3c1]" />
                  Updated: {new Date(activeProject.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Project Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-[#00c2c7] border border-[#00c2c7]/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                title="View & Print Consolidated BOQ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>BOQ Report</span>
              </button>

              <button
                onClick={() => handleExportProject(activeProject)}
                className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white border border-[#2d4a6a] px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                title="Download Project JSON Backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Project</span>
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete project "${activeProject.name}" and all its saved estimates?`
                    )
                  ) {
                    onDeleteProject(activeProject.id);
                  }
                }}
                className="p-1.5 text-[#ff4d6d] hover:bg-[#ff4d6d]/15 border border-[#ff4d6d]/40 rounded-lg transition"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Total Cement</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {totalCementBags.toLocaleString()} bags
                </div>
                <div className="text-[9px] text-[#8ba3c1]">~{(totalCementBags * 50).toLocaleString()} kg</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Total Sand</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {Math.round(totalSandCft).toLocaleString()} cft
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Fine & Coarse</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Aggregate / Picket</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {Math.round(totalAggCft).toLocaleString()} cft
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Concrete base</div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-[#8ba3c1]">Total Rebar Steel</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {Math.round(totalSteelKg).toLocaleString()} kg
                </div>
                <div className="text-[9px] text-[#8ba3c1]">
                  {(totalSteelKg / 1000).toFixed(2)} Metric Tons
                </div>
              </div>

              <div className="bg-[#1a2b42] border border-[#f5a623] rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[#8ba3c1]">Total Bricks</div>
                <div className="text-base font-bold text-[#f5a623] mt-0.5">
                  {totalBricks.toLocaleString()} pcs
                </div>
                <div className="text-[9px] text-[#8ba3c1]">Walls & Pickets</div>
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

      {/* Estimates File System Section */}
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2d4a6a] pb-2.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#00c2c7]" />
              Project Estimate Files ({filteredEstimates.length})
            </h3>
            <p className="text-[11px] text-[#8ba3c1]">
              Saved calculation sheets in this project. Every file can be loaded, edited or exported.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "All Files" },
              { id: "beam", label: "Beams" },
              { id: "column", label: "Columns" },
              { id: "footing", label: "Footings" },
              { id: "slab", label: "Slabs" },
              { id: "stair", label: "Stairs" },
              { id: "brick", label: "Brickwork" },
              { id: "tiles", label: "Tiles" },
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

        {filteredEstimates.length === 0 ? (
          <div className="p-8 text-center bg-[#121a2b] border border-[#2d4a6a]/60 rounded-xl space-y-2">
            <Layers className="w-8 h-8 text-[#8ba3c1] mx-auto opacity-50" />
            <div className="text-xs text-[#8ba3c1]">
              No estimate files saved for this filter.
            </div>
            <p className="text-[11px] text-[#8ba3c1]/70">
              Select one of the calculators below to calculate quantities and click "Save to Project".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredEstimates.map((est) => {
              const calcMeta = calculatorCards.find((c) => c.type === est.type);
              const Icon = calcMeta?.icon || FileText;
              return (
                <div
                  key={est.id}
                  className="bg-[#121a2b] border border-[#2d4a6a] hover:border-[#00c2c7]/50 rounded-xl p-3 transition shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${calcMeta?.accent || "#00c2c7"}20`,
                            color: calcMeta?.accent || "#00c2c7",
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {est.name}
                          </h4>
                          <span className="text-[10px] text-[#8ba3c1] uppercase font-mono">
                            {est.type} · {new Date(est.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-[#2ecc71]">
                          ৳ {Math.round(est.totalCost).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    {/* Summary snippets */}
                    <div className="mt-2.5 pt-2 border-t border-[#2d4a6a]/60 grid grid-cols-3 gap-1 text-[10px] text-center">
                      {est.summary?.cementBags !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#f5a623]">
                          {est.summary.cementBags} bags
                        </div>
                      )}
                      {est.summary?.totalSteel !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#00c2c7]">
                          {est.summary.totalSteel} kg
                        </div>
                      )}
                      {est.summary?.dryVolume !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#c4b5fd]">
                          {est.summary.dryVolume} cft
                        </div>
                      )}
                      {est.summary?.totalBricks !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#e67e22]">
                          {est.summary.totalBricks} bricks
                        </div>
                      )}
                      {est.summary?.tiles !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#1abc9c]">
                          {est.summary.tiles} tiles
                        </div>
                      )}
                      {est.summary?.totalBuiltUpArea !== undefined && (
                        <div className="bg-[#1a2b42] rounded px-1 py-0.5 text-[#3498db]">
                          {est.summary.totalBuiltUpArea} sqft
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-[#2d4a6a]/60">
                    <button
                      onClick={() => onNavigateToCalculator(est.type, est)}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#243b55] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-white py-1 px-2 rounded text-[11px] font-semibold transition"
                      title="Open and edit this estimate"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open & Edit</span>
                    </button>

                    <button
                      onClick={() => handleExportSingleEstimate(est)}
                      className="p-1 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded transition"
                      title="Download estimate file (.json)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete saved estimate "${est.name}"?`
                          )
                        ) {
                          onDeleteEstimate(est.id);
                        }
                      }}
                      className="p-1 text-[#8ba3c1] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/15 rounded transition"
                      title="Delete estimate"
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
                        backgroundColor: `${card.accent}20`,
                        color: card.accent,
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
    </div>
  );
};
