import React from "react";
import { EstimateType, Project } from "../types";
import {
  LayoutDashboard,
  Columns,
  SquareDashedBottom,
  Grid3X3,
  Layers,
  Footprints,
  BrickWall,
  Calculator,
  Building2,
} from "lucide-react";

interface NavigationProps {
  activeTab: EstimateType;
  setActiveTab: (tab: EstimateType) => void;
  activeProject: Project | null;
}

interface NavItem {
  id: EstimateType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "beam", label: "Beam", icon: Columns },
  { id: "column", label: "Column", icon: Building2 },
  { id: "footing", label: "Footing", icon: SquareDashedBottom },
  { id: "slab", label: "Two-Way Slab", icon: Layers },
  { id: "stair", label: "Staircase", icon: Footprints },
  { id: "brick", label: "Brickwork", icon: BrickWall },
  { id: "tiles", label: "Tiles", icon: Grid3X3 },
  { id: "structural", label: "Structural Load", icon: Calculator },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  activeProject,
}) => {
  const getEstimateCountForTab = (type: EstimateType) => {
    if (!activeProject || type === "dashboard") return 0;
    return activeProject.estimates.filter((e) => e.type === type).length;
  };

  return (
    <nav className="bg-[#121a2b] border-b border-[#2d4a6a] px-2 py-1.5 shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 min-w-max mx-auto max-w-7xl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = getEstimateCountForTab(item.id);

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap relative ${
                isActive
                  ? "bg-[#00c2c7] text-[#0f1c2e] shadow-md shadow-[#00c2c7]/20 font-bold"
                  : "text-[#8ba3c1] hover:text-[#f1f5f9] hover:bg-[#1a2b42]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#0f1c2e]" : "text-[#8ba3c1]"}`} />
              <span>{item.label}</span>

              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${
                    isActive
                      ? "bg-[#0f1c2e] text-[#00c2c7]"
                      : "bg-[#243b55] text-[#f5a623] border border-[#2d4a6a]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
