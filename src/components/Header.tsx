import React from "react";
import { Project, EstimateType } from "../types";
import { FolderKanban, Plus, Layers, HardHat, FileSpreadsheet } from "lucide-react";

interface HeaderProps {
  activeTab: EstimateType;
  setActiveTab: (tab: EstimateType) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProjectModal: () => void;
  onOpenReportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenReportModal,
}) => {
  return (
    <header className="relative bg-[#152033] border-b border-[#2d4a6a] shrink-0 z-30">
      {/* Top accent gradient bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#f5a623] via-[#e67e22] to-[#00c2c7]" />

      <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg p-1 flex items-center justify-center shadow-md shrink-0">
            {/* Hybrid Civil Logo SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <rect x="15" y="45" width="22" height="42" rx="3" fill="#152033" />
              <rect x="23" y="53" width="7" height="7" rx="1" fill="#ffffff" />
              <rect x="40" y="25" width="26" height="62" rx="3" fill="#f5a623" />
              <rect x="46" y="32" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="47" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="62" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              {/* Crane */}
              <path d="M72 32h16m-8 0v20m0 0l-3 4m3-4l3 4" stroke="#152033" strokeWidth="4" strokeLinecap="round" />
              <line x1="72" y1="32" x2="72" y2="87" stroke="#152033" strokeWidth="4" />
              <path d="M10 88h80" stroke="#00c2c7" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide leading-none">
                ASHRAF CIVIL STUDIO
              </h1>
              <span className="hidden sm:inline-block text-[9px] bg-[#00c2c7]/20 border border-[#00c2c7]/40 text-[#00c2c7] px-1.5 py-0.5 rounded font-mono font-bold">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#8ba3c1] leading-tight mt-0.5">
              ashraf.ai.studio · Engineering Estimation & File System
            </p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Active project dropdown */}
          <div className="flex items-center bg-[#243b55] border border-[#2d4a6a] rounded-lg px-2 py-1 max-w-[200px] sm:max-w-[260px]">
            <FolderKanban className="w-3.5 h-3.5 text-[#f5a623] shrink-0 mr-1.5" />
            <select
              className="bg-transparent text-[#f1f5f9] text-[11px] font-medium outline-none truncate w-full cursor-pointer"
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
                    {p.name}
                  </option>
                ))
              )}
            </select>
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
