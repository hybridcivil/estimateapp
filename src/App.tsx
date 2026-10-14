import React, { useState, useEffect, useCallback } from "react";
import { Project, EstimateType, ProjectEstimateItem } from "./types";
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  saveEstimateToProject,
  deleteEstimateFromProject,
  renameEstimate,
} from "./services/api";

import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./components/Dashboard";
import { NewProjectModal } from "./components/NewProjectModal";
import { ReportModal } from "./components/ReportModal";
import { SplashScreen } from "./components/SplashScreen";

import { BeamCalculator } from "./components/calculators/BeamCalculator";
import { ColumnCalculator } from "./components/calculators/ColumnCalculator";
import { FootingCalculator } from "./components/calculators/FootingCalculator";
import { SituPileCalculator } from "./components/calculators/SituPileCalculator";
import { SandPileCalculator } from "./components/calculators/SandPileCalculator";
import { SlabCalculator } from "./components/calculators/SlabCalculator";
import { StairCalculator } from "./components/calculators/StairCalculator";
import { BrickCalculator } from "./components/calculators/BrickCalculator";
import { TileCalculator } from "./components/calculators/TileCalculator";
import { StructuralCalculator } from "./components/calculators/StructuralCalculator";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { createDefaultBuildingEstimates } from "./utils/buildingSchedule";

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<EstimateType>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Loaded estimate file state for calculator inspection and in-place editing
  const [loadedEstimate, setLoadedEstimate] = useState<ProjectEstimateItem | null>(null);

  // Splash Screen State
  const [showInitialSplash, setShowInitialSplash] = useState(true);

  // View mode: "auto" (responsive CSS), "web" (force desktop layout), "app" (mobile app-styled layout)
  const [viewMode, setViewMode] = useState<"auto" | "web" | "app">(() => {
    try {
      const saved = localStorage.getItem("ashraf_studio_view_mode");
      if (saved === "web" || saved === "app" || saved === "auto") return saved;
    } catch (e) {}
    return "auto";
  });

  const handleSetViewMode = (mode: "auto" | "web" | "app") => {
    setViewMode(mode);
    try {
      localStorage.setItem("ashraf_studio_view_mode", mode);
    } catch (e) {}
  };

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load projects on start
  const loadProjects = useCallback(async (preserveActiveId?: string) => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);

      if (data.length > 0) {
        if (preserveActiveId) {
          const matching = data.find((p) => p.id === preserveActiveId);
          setActiveProject(matching || data[0]);
        } else {
          setActiveProject((prev) => {
            if (prev) {
              const updated = data.find((p) => p.id === prev.id);
              return updated || data[0];
            }
            return data[0];
          });
        }
      } else {
        // Automatically create a default starter project if none exists
        try {
          const starter = await createProject({
            name: "Ashraf Commercial Tower",
            client: "Ashraf Properties Ltd.",
            location: "Dhanmondi, Dhaka",
            engineer: "Engr. Ashraf",
            notes: "Multi-storey RCC structure designed with BNBC / ACI codes.",
          });
          setProjects([starter]);
          setActiveProject(starter);
        } catch (e) {
          console.error("Starter project creation error", e);
        }
      }
    } catch (err) {
      console.error("Failed to load projects", err);
      showToast("Could not load projects from server. Using local mode.", "info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Project management handlers
  const handleCreateProject = async (data: {
    name: string;
    client: string;
    location: string;
    engineer: string;
    notes?: string;
    stories?: number;
    includeDefaultList?: boolean;
  }) => {
    const created = await createProject(data);
    const storiesCount = created.stories || data.stories || 1;
    if (data.includeDefaultList && (!created.estimates || created.estimates.length === 0)) {
      const defaultEstimates = createDefaultBuildingEstimates(storiesCount);
      for (const est of defaultEstimates) {
        try {
          await saveEstimateToProject(created.id, est);
        } catch (e) {
          console.warn("Error saving default building estimate", e);
        }
      }
    }
    await loadProjects(created.id);
    showToast(
      data.includeDefaultList
        ? `Project "${created.name}" created with all 7 building elements (${storiesCount} ${storiesCount === 1 ? 'floor' : 'floors'} multiplied)!`
        : `Project "${created.name}" created successfully!`
    );
  };

  const handleAddDefaultBuildingList = async () => {
    if (!activeProject) {
      setIsNewProjectModalOpen(true);
      return;
    }
    const stories = activeProject.stories || 1;
    const defaultEstimates = createDefaultBuildingEstimates(stories);
    const existingTypes = new Set(
      Array.isArray(activeProject.estimates) ? activeProject.estimates.map((e) => e.type) : []
    );
    let addedCount = 0;
    for (const est of defaultEstimates) {
      if (!existingTypes.has(est.type)) {
        try {
          await saveEstimateToProject(activeProject.id, est);
          addedCount++;
        } catch (e) {
          console.warn("Error saving building element", e);
        }
      }
    }
    // If all already exist, add with new copy name
    if (addedCount === 0) {
      for (const est of defaultEstimates) {
        try {
          await saveEstimateToProject(activeProject.id, {
            ...est,
            name: `${est.name} (Copy)`,
          });
          addedCount++;
        } catch (e) {}
      }
    }
    await loadProjects(activeProject.id);
    showToast(`Added ${addedCount} building items (multiplied across ${stories} storeys) to "${activeProject.name}"!`);
  };

  const handleUpdateProject = async (id: string, data: Partial<{
    name: string;
    client: string;
    location: string;
    engineer: string;
    notes?: string;
    stories?: number;
    rates?: any;
    estimates?: ProjectEstimateItem[];
  }>) => {
    const updated = await updateProject(id, data);
    if (updated) {
      await loadProjects(id);
      const storiesMsg =
        data.stories !== undefined && activeProject && data.stories !== activeProject.stories
          ? ` (${data.stories} storeys multiplier updated across all estimates)`
          : "";
      showToast(`Project "${updated.name}" updated successfully!${storiesMsg}`);
    } else {
      showToast("Could not update project details.", "error");
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    await loadProjects();
    showToast("Project deleted.", "info");
  };

  const handleImportProject = async (projectData: any) => {
    const created = await createProject({
      name: projectData.name,
      client: projectData.client || "",
      location: projectData.location || "",
      engineer: projectData.engineer || "Engr. Ashraf",
      notes: projectData.notes || "",
    });

    // If imported file contains saved estimates, save them to the new project
    if (Array.isArray(projectData.estimates)) {
      for (const est of projectData.estimates) {
        try {
          await saveEstimateToProject(created.id, est);
        } catch (e) {
          console.warn("Error importing estimate item", e);
        }
      }
    }

    await loadProjects(created.id);
    showToast(`Project "${created.name}" imported with ${projectData.estimates?.length || 0} estimate files!`);
  };

  // Estimate saving handler (supports both creating new and updating existing)
  const handleSaveEstimate = async (estimateData: {
    id?: string;
    type: string;
    name: string;
    totalCost: number;
    summary: Record<string, any>;
    data: Record<string, any>;
  }) => {
    if (!activeProject) {
      setIsNewProjectModalOpen(true);
      showToast("Please create or select a project first to save your estimate.", "info");
      return;
    }

    try {
      const res = await saveEstimateToProject(activeProject.id, estimateData);
      if (res.success) {
        // Refresh project list to reflect updated estimates
        await loadProjects(activeProject.id);
        // Also update loadedEstimate state with the saved item so edit mode stays current
        if (res.estimate) {
          setLoadedEstimate(res.estimate);
        }
        showToast(
          estimateData.id
            ? `Updated "${estimateData.name}" in project "${activeProject.name}"!`
            : `Saved "${estimateData.name}" to project "${activeProject.name}"!`
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save estimate.", "error");
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!activeProject) return;
    try {
      await deleteEstimateFromProject(activeProject.id, estimateId);
      if (loadedEstimate && loadedEstimate.id === estimateId) {
        setLoadedEstimate(null);
      }
      await loadProjects(activeProject.id);
      showToast("Estimate file removed from project.", "info");
    } catch (err: any) {
      showToast("Failed to remove estimate.", "error");
    }
  };

  const handleRenameEstimate = async (estimateId: string, newName: string) => {
    if (!activeProject) return;
    try {
      const success = await renameEstimate(activeProject.id, estimateId, newName);
      if (success) {
        if (loadedEstimate && loadedEstimate.id === estimateId) {
          setLoadedEstimate({ ...loadedEstimate, name: newName });
        }
        await loadProjects(activeProject.id);
        showToast(`Estimate renamed to "${newName}".`);
      } else {
        showToast("Could not rename estimate.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to rename estimate.", "error");
    }
  };

  const handleNavigateToCalculator = (
    type: EstimateType,
    estimateToLoad?: ProjectEstimateItem
  ) => {
    const calcType = ((type as string) === "tile" ? "tiles" : type) as EstimateType;
    setActiveTab(calcType);
    if (estimateToLoad) {
      setLoadedEstimate({
        ...estimateToLoad,
        type: calcType,
      });
      showToast(`Loaded "${estimateToLoad.name}" into ${calcType.toUpperCase()} calculator.`);
    } else {
      setLoadedEstimate(null);
    }
  };

  const isAppView = viewMode === "app";

  return (
    <div
      className={`flex flex-col h-screen w-screen bg-[#0f1c2e] text-[#f1f5f9] overflow-hidden font-sans select-none antialiased ${
        isAppView ? "max-w-md mx-auto border-x border-[#2d4a6a] shadow-2xl" : ""
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-[#ff4d6d] border-[#ff758f] text-white"
              : toast.type === "info"
              ? "bg-[#243b55] border-[#00c2c7] text-[#00c2c7]"
              : "bg-[#152033] border-[#2ecc71] text-[#2ecc71]"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => {
          setActiveProject(p);
          setLoadedEstimate(null);
        }}
        onOpenNewProjectModal={() => {
          setEditingProject(null);
          setIsNewProjectModalOpen(true);
        }}
        onOpenEditProjectModal={() => {
          if (activeProject) {
            setEditingProject(activeProject);
            setIsNewProjectModalOpen(true);
          }
        }}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
      />

      {/* Calculator Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === "dashboard") {
            setLoadedEstimate(null);
          }
        }}
        activeProject={activeProject}
        isAppView={isAppView}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {loading && projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#8ba3c1] text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00c2c7] mr-3" />
            Loading Ashraf Civil Studio workspace...
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                projects={projects}
                activeProject={activeProject}
                onSelectProject={(p) => {
                  setActiveProject(p);
                  setLoadedEstimate(null);
                }}
                onOpenNewProjectModal={() => {
                  setEditingProject(null);
                  setIsNewProjectModalOpen(true);
                }}
                onOpenEditProjectModal={() => {
                  if (activeProject) {
                    setEditingProject(activeProject);
                    setIsNewProjectModalOpen(true);
                  }
                }}
                onDeleteProject={handleDeleteProject}
                onDeleteEstimate={handleDeleteEstimate}
                onRenameEstimate={handleRenameEstimate}
                onNavigateToCalculator={handleNavigateToCalculator}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                onImportProject={handleImportProject}
                onAddDefaultBuildingList={handleAddDefaultBuildingList}
                onUpdateProject={handleUpdateProject}
              />
            )}

            {activeTab === "beam" && (
              <BeamCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "column" && (
              <ColumnCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "footing" && (
              <FootingCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "situ_pile" && (
              <SituPileCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "sand_pile" && (
              <SandPileCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "slab" && (
              <SlabCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "stair" && (
              <StairCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "brick" && (
              <BrickCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "tiles" && (
              <TileCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}

            {activeTab === "structural" && (
              <StructuralCalculator
                activeProject={activeProject}
                loadedEstimate={loadedEstimate}
                onClearLoadedEstimate={() => setLoadedEstimate(null)}
                onSaveEstimate={handleSaveEstimate}
                onDeleteEstimate={handleDeleteEstimate}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setEditingProject(null);
        }}
        initialProject={editingProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={activeProject}
      />

      {/* Splash Screen on Initial Load */}
      {showInitialSplash && (
        <SplashScreen onFinish={() => setShowInitialSplash(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}

