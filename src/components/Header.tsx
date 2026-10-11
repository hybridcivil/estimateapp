import React from "react";
import { Project, EstimateType } from "../types";
import {
  FolderKanban,
  Plus,
  FileSpreadsheet,
  Edit3,
  Smartphone,
  Monitor,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  activeTab: EstimateType;
  setActiveTab: (tab: EstimateType) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProjectModal: () => void;
  onOpenEditProjectModal: () => void;
  onOpenReportModal: () => void;
  viewMode: "auto" | "web" | "app";
  onSetViewMode: (mode: "auto" | "web" | "app") => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenEditProjectModal,
  onOpenReportModal,
  viewMode,
  onSetViewMode,
}) => {
  const { theme, toggleTheme, isLight } = useTheme();

  return (
    <header className="relative bg-[#152033] border-b border-[#2d4a6a] shrink-0 z-30">
      {/* Top accent gradient bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#f5a623] via-[#e67e22] to-[#00c2c7]" />

      <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand & Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setActiveTab("dashboard")}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg p-1 flex items-center justify-center shadow-md shrink-0">
            {/* Hybrid Civil Logo SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <rect x="15" y="45" width="22" height="42" rx="3" fill="#152033" />
              <rect x="23" y="53" width="7" height="7" rx="1" fill="#ffffff" />
              <rect x="40" y="25" width="26" height="62" rx="3" fill="#f5a623" />
              <rect x="46" y="32" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="47" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="62" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              {/* Crane */}
              <path
                d="M72 32h16m-8 0v20m0 0l-3 4m3-4l3 4"
                stroke="#152033"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line x1="72" y1="32" x2="72" y2="87" stroke="#152033" strokeWidth="4" />
              <path d="M10 88h80" stroke="#00c2c7" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide leading-none">
                ASHRAF CIVIL STUDIO
              </h1>
              <span className="hidden sm:inline-block text-[9px] bg-[#00c2c7]/20 border border-[#00c2c7]/40 text-[#00c2c7] px-1.5 py-0.2 rounded font-mono font-bold">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#8ba3c1] leading-tight mt-0.5">
              copyright@engr.ashraf · Engineering Estimation & File System
            </p>
          </div>
        </div>

        {/* Center/Right: View Mode Toggle & Project Selector & Actions */}
        <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
          {/* View Mode Switcher (Web View vs App View) */}
          <div className="flex items-center bg-[#0e1624] border border-[#2d4a6a] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onSetViewMode("web")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition ${
                viewMode === "web"
                  ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
              title="Switch to Desktop / Web View"
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden md:inline">Web View</span>
            </button>

            <button
              type="button"
              onClick={() => onSetViewMode("app")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition ${
                viewMode === "app"
                  ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
              title="Switch to Mobile / App View"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden md:inline">App View</span>
            </button>

            <button
              type="button"
              onClick={() => onSetViewMode("auto")}
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold transition ${
                viewMode === "auto"
                  ? "bg-[#243b55] text-[#f5a623]"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
              title="Auto-detect screen size"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span className="hidden lg:inline text-[9px]">Auto</span>
            </button>
          </div>

          {/* High-Contrast Site Visit Theme Switcher */}
          <div
            className="flex items-center bg-[#0e1624] border border-[#2d4a6a] rounded-lg p-0.5"
            role="group"
            aria-label="Theme mode switcher"
          >
            <button
              type="button"
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition ${
                !isLight
                  ? "bg-[#243b55] text-[#00c2c7] font-bold shadow-xs"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
              title="Studio Dark Mode (Standard indoor display)"
            >
              <Moon className="w-3 h-3 text-[#00c2c7]" />
              <span className="hidden lg:inline">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => theme !== "light" && toggleTheme()}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition ${
                isLight
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs ring-1 ring-amber-400"
                  : "text-[#8ba3c1] hover:text-[#f5a623]"
              }`}
              title="High-Contrast Light Mode (Sunlight & Site Visits)"
            >
              <Sun
                className={`w-3 h-3 ${
                  isLight ? "text-slate-950 fill-slate-950" : "text-[#f5a623]"
                }`}
              />
              <span className="hidden sm:inline">Site Mode</span>
              <span className="sm:hidden">Site</span>
            </button>
          </div>

          {/* Active project dropdown + Quick Edit Button */}
          <div className="flex items-center bg-[#243b55] border border-[#2d4a6a] rounded-lg pl-2 pr-1 py-0.5 max-w-[170px] sm:max-w-[240px]">
            <FolderKanban className="w-3.5 h-3.5 text-[#f5a623] shrink-0 mr-1.5" />
            <select
              className="bg-transparent text-[#f1f5f9] text-[11px] font-medium outline-none truncate w-full cursor-pointer py-1"
              value={activeProject?.id || ""}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
            >
              {projects.length === 0 ? (
                <option value="">No Projects</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a2b42] text-white">
                    {p.name} ({p.stories || 1} {p.stories === 1 ? "Floor" : "Floors"})
                  </option>
                ))
              )}
            </select>

            {activeProject && (
              <button
                type="button"
                onClick={onOpenEditProjectModal}
                className="p-1 text-[#8ba3c1] hover:text-[#00c2c7] transition shrink-0 ml-1"
                title="Edit Current Project"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* New Project Button */}
          <button
            onClick={onOpenNewProjectModal}
            className="flex items-center gap-1 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition active:scale-95 shadow-sm"
            title="Create New Project"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Project</span>
          </button>

          {/* BOQ Summary Report */}
          {activeProject && (
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-1 bg-[#1a2b42] hover:bg-[#243b55] border border-[#2d4a6a] text-[#f5a623] px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition active:scale-95"
              title="Project BOQ Summary & Print"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">BOQ Rollup</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
