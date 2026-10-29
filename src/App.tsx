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
import { ContractorCalculator } from "./components/calculators/ContractorCalculator";
import { StructuralCalculator } from "./components/calculators/StructuralCalculator";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { LoginRegistrationModal } from "./components/LoginRegistrationModal";
import { AuthScreen } from "./components/AuthScreen";
import { WorkspaceLoadingScreen } from "./components/WorkspaceLoadingScreen";
import { createDefaultBuildingEstimates } from "./utils/buildingSchedule";

function MainAppContent() {
  const { currentUser, appUser, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<EstimateType>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Application flow: Splash -> (if not logged in: Auth, else: Load Workspace) -> Main App
  const [flowState, setFlowState] = useState<"splash" | "auth" | "loading_workspace" | "app">("splash");

  // Loaded estimate file state for calculator inspection and in-place editing
  const [loadedEstimate, setLoadedEstimate] = useState<ProjectEstimateItem | null>(null);

  // Admin Control Panel Modal State
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Login & Registration Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  const handleSplashFinish = () => {
    if (currentUser || appUser) {
      setFlowState("loading_workspace");
    } else {
      setFlowState("auth");
    }
  };

  const handleAuthSuccess = () => {
    setFlowState("loading_workspace");
  };

  // If user signs out while in app, transition immediately to Login/Registration screen
  useEffect(() => {
    if (flowState === "app" && !currentUser && !appUser && !authLoading) {
      setProjects([]);
      setActiveProject(null);
      setFlowState("auth");
    }
  }, [currentUser, appUser, authLoading, flowState]);

  // Load projects scoped strictly to the authenticated user
  const loadProjects = useCallback(async (preserveActiveId?: string) => {
    const userToUse = appUser || (currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email || "",
      displayName: currentUser.displayName || "Civil Engineer",
      role: isAdmin ? "admin" as const : (appUser?.role || "editor"),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    } : null);

    if (!userToUse) {
      setProjects([]);
      setActiveProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchProjects(userToUse);
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
        // User has no projects yet; start clean with 0 projects until they create one
        setActiveProject(null);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
      showToast("Could not load projects from server. Using local mode.", "info");
    } finally {
      setLoading(false);
    }
  }, [appUser, currentUser, isAdmin]);

  // Trigger project loading when entering loading_workspace or when user ID changes
  useEffect(() => {
    setProjects([]);
    setActiveProject(null);
    if (appUser || currentUser) {
      loadProjects();
    }
  }, [loadProjects, appUser?.uid, currentUser?.uid]);

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
    const created = await createProject(data, appUser);
    const storiesCount = created.stories || data.stories || 1;
    if (data.includeDefaultList && (!created.estimates || created.estimates.length === 0)) {
      const defaultEstimates = createDefaultBuildingEstimates(storiesCount);
      for (const est of defaultEstimates) {
        try {
          await saveEstimateToProject(created.id, est, created, appUser);
        } catch (e) {
          console.warn("Error saving default building estimate", e);
        }
      }
    }
    await loadProjects(created.id);
    showToast(
      data.includeDefaultList
        ? `Project "${created.name}" created with 7 building element templates (${storiesCount} ${storiesCount === 1 ? 'floor' : 'floors'})!`
        : `Clean project "${created.name}" created successfully!`
    );
  };

  const handleAddDefaultBuildingList = async () => {
    if (!activeProject) {
      setIsNewProjectModalOpen(true);
      return;
    }
    const stories = activeProject.stories || 1;
    const defaultEstimates = createDefaultBuildingEstimates(stories);
    const getEstKey = (e: { type: string; name?: string; data?: any; summary?: any }) => {
      if (e.type === "beam") {
        const subtype = e.data?.beamSubtype || e.summary?.beamSubtype;
        if (subtype) return subtype;
        if (e.name?.toLowerCase().includes("grade") || e.name?.toLowerCase().includes("gb")) return "grade_beam";
        return "floor_beam";
      }
      return e.type;
    };
    const existingKeys = new Set(
      Array.isArray(activeProject.estimates) ? activeProject.estimates.map(getEstKey) : []
    );
    let addedCount = 0;
    for (const est of defaultEstimates) {
      const key = getEstKey(est);
      if (!existingKeys.has(key)) {
        try {
          await saveEstimateToProject(activeProject.id, est, activeProject, appUser);
          addedCount++;
          existingKeys.add(key);
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
          }, activeProject, appUser);
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
    const contextProj = (activeProject && activeProject.id === id) ? activeProject : null;
    const updated = await updateProject(id, data, appUser, contextProj);
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
    const created = await createProject(
      {
        name: projectData.name,
        client: projectData.client || "",
        location: projectData.location || "",
        engineer: projectData.engineer || appUser?.displayName || "Anonymous",
        notes: projectData.notes || "",
      },
      appUser
    );

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
      const activeUser = appUser || (currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || "Civil Engineer",
        role: isAdmin ? ("admin" as const) : ("engineer" as const),
      } : null);

      const res = await saveEstimateToProject(
        activeProject.id,
        estimateData,
        activeProject,
        activeUser
      );

      if (res.success && res.estimate) {
        // Immediately update React states so there is zero delay and zero empty state
        const updatedEstimates = [...(activeProject.estimates || [])];
        const existingIdx = updatedEstimates.findIndex((e) => e.id === res.estimate.id);
        if (existingIdx !== -1) {
          updatedEstimates[existingIdx] = res.estimate;
        } else {
          updatedEstimates.unshift(res.estimate);
        }

        const updatedProj: Project = {
          ...activeProject,
          estimates: updatedEstimates,
          updatedAt: new Date().toISOString(),
        };

        setActiveProject(updatedProj);
        setProjects((prev) =>
          prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
        );
        setLoadedEstimate(res.estimate);

        showToast(
          estimateData.id
            ? `Updated "${estimateData.name}" in project "${activeProject.name}"!`
            : `Saved "${estimateData.name}" to project "${activeProject.name}"!`
        );

        // Background sync to ensure remote/local alignment
        loadProjects(activeProject.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save estimate.", "error");
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!activeProject) return;
    try {
      await deleteEstimateFromProject(
        activeProject.id,
        estimateId,
        activeProject,
        appUser?.uid || currentUser?.uid
      );
      if (loadedEstimate && loadedEstimate.id === estimateId) {
        setLoadedEstimate(null);
      }
      const updatedEstimates = (activeProject.estimates || []).filter((e) => e.id !== estimateId);
      const updatedProj: Project = {
        ...activeProject,
        estimates: updatedEstimates,
        updatedAt: new Date().toISOString(),
      };
      setActiveProject(updatedProj);
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
      );
      showToast("Estimate file removed from project.", "info");
      loadProjects(activeProject.id);
    } catch (err: any) {
      showToast("Failed to remove estimate.", "error");
    }
  };

  const handleRenameEstimate = async (estimateId: string, newName: string) => {
    if (!activeProject) return;
    try {
      const success = await renameEstimate(
        activeProject.id,
        estimateId,
        newName,
        activeProject,
        appUser?.uid || currentUser?.uid
      );
      if (success) {
        const updatedEstimates = (activeProject.estimates || []).map((e) =>
          e.id === estimateId ? { ...e, name: newName } : e
        );
        const updatedProj: Project = {
          ...activeProject,
          estimates: updatedEstimates,
          updatedAt: new Date().toISOString(),
        };
        setActiveProject(updatedProj);
        setProjects((prev) =>
          prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
        );
        if (loadedEstimate && loadedEstimate.id === estimateId) {
          setLoadedEstimate({ ...loadedEstimate, name: newName });
        }
        showToast(`Estimate renamed to "${newName}".`);
        loadProjects(activeProject.id);
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

  if (flowState === "splash") {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (flowState === "auth") {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
  }

  if (flowState === "loading_workspace") {
    return (
      <WorkspaceLoadingScreen
        isReady={!loading}
        onFinish={() => setFlowState("app")}
      />
    );
  }

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
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
            Loading Dolphin Box workspace...
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
                onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
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

            {activeTab === "contractor" && (
              <ContractorCalculator
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

      {/* Admin Supervisory Panel */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onSelectProject={(p) => {
          setActiveProject(p);
          setIsAdminPanelOpen(false);
        }}
        currentUserId={currentUser?.uid}
      />

      {/* Account Login & Registration Modal */}
      <LoginRegistrationModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />


    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

