import React, { useState, useRef, useEffect } from "react";
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
  Shield,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  activeTab: EstimateType;
  setActiveTab: (tab: EstimateType) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenNewProjectModal: () => void;
  onOpenEditProjectModal: () => void;
  onOpenReportModal: () => void;
  onOpenAdminPanel?: () => void;
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
  onOpenAdminPanel,
  viewMode,
  onSetViewMode,
}) => {
  const { theme, toggleTheme, isLight } = useTheme();
  const { currentUser, appUser, isAdmin, signInWithGoogle, logout, loading: authLoading } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              <span
                className="hidden md:inline-flex items-center gap-1 text-[9px] bg-[#2ecc71]/15 border border-[#2ecc71]/40 text-[#2ecc71] px-1.5 py-0.5 rounded font-mono font-semibold"
                title="Connected to Firebase Firestore: ashraf-civil-studio"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] animate-pulse" />
                Firebase Cloud Sync
              </span>
            </div>
            <p className="text-[10px] text-[#8ba3c1] leading-tight mt-0.5">
              Civil Engineering Estimation & Multi-Storey BOQ File System
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

          {/* Admin Control Center Button (Only visible to Admin) */}
          {isAdmin && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition active:scale-95 shadow-sm cursor-pointer"
              title="Open System Admin Control Center"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin Control</span>
              <span className="lg:hidden">Admin</span>
            </button>
          )}

          {/* Firebase Authentication & Google Account Menu */}
          {authLoading ? (
            <div className="w-7 h-7 rounded-full bg-[#1a2b42] animate-pulse" />
          ) : currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 bg-[#1a2b42] hover:bg-[#243b55] border border-[#2d4a6a] p-1 pr-2 rounded-xl transition cursor-pointer"
                title={currentUser.email || "User profile"}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-6 h-6 rounded-lg object-cover border border-[#00c2c7]/40"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-[#00c2c7] text-[#0f1c2e] font-bold text-xs flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || "E")[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left leading-none">
                  <span className="text-[11px] font-bold text-white truncate max-w-[100px]">
                    {currentUser.displayName || "Engineer"}
                  </span>
                  <span className="text-[9px] text-[#8ba3c1] font-mono truncate max-w-[100px]">
                    {isAdmin ? "Admin" : "Engineer"}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-[#8ba3c1]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#152033] border border-[#2d4a6a] rounded-xl shadow-2xl p-2.5 z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-2.5 pb-2 border-b border-[#24374e]">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-9 h-9 rounded-xl object-cover border border-[#00c2c7]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#00c2c7] text-[#0f1c2e] font-bold text-sm flex items-center justify-center">
                        {(currentUser.displayName || currentUser.email || "E")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate text-xs">
                        {currentUser.displayName || "Civil Engineer"}
                      </div>
                      <div className="text-[10px] text-[#8ba3c1] font-mono truncate">
                        {currentUser.email}
                      </div>
                      <div className="mt-1">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            <Shield className="w-2.5 h-2.5" />
                            System Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40">
                            Verified Engineer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions inside dropdown */}
                  <div className="space-y-1">
                    {isAdmin && onOpenAdminPanel && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdminPanel();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-amber-400 hover:bg-amber-500/15 font-semibold text-[11px] transition text-left cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin Control Center</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-400 hover:bg-red-500/15 font-semibold text-[11px] transition text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out from Firebase</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-950 px-2.5 py-1.5 rounded-lg font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              title="Sign in with Google to store your personal projects in Firebase"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="hidden sm:inline">Google Sign In</span>
              <span className="sm:hidden">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
