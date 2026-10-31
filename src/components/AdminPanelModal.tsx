import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  FolderKanban,
  Trash2,
  ExternalLink,
  Search,
  X,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Key,
  Globe,
  UserCheck,
  UserPlus,
  UserMinus,
  UserCog,
  CheckCircle2,
} from "lucide-react";
import { Project, AppUser, UserRole } from "../types";
import {
  fetchAllProjectsForAdmin,
  fetchAllUsersForAdmin,
  deleteProject,
  calculateProjectTotalCost,
  assignProjectToUser,
  unassignProjectFromUser,
} from "../services/api";
import { BOOTSTRAP_ADMIN_EMAIL, useAuth } from "../context/AuthContext";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (p: Project) => void;
  currentUserId?: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const { currentUser, appUser, assignUserRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "email_password" | "google">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleNotice, setRoleNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Project Assignment State
  const [assignModalProject, setAssignModalProject] = useState<Project | null>(null);
  const [selectedAssigneeUid, setSelectedAssigneeUid] = useState<string>("");
  const [transferOwnership, setTransferOwnership] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignNotice, setAssignNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [assignModalSearch, setAssignModalSearch] = useState<string>("");
  const [quickAssignUser, setQuickAssignUser] = useState<AppUser | null>(null);
  const [quickAssignProjectId, setQuickAssignProjectId] = useState<string>("");

  const handleOpenAssignModal = (project: Project) => {
    setAssignModalProject(project);
    setSelectedAssigneeUid(project.assignedTo || "");
    setTransferOwnership(false);
    setAssignNotice(null);
    setAssignModalSearch("");
  };

  const handleCloseAssignModal = () => {
    setAssignModalProject(null);
    setSelectedAssigneeUid("");
    setAssignNotice(null);
  };

  const handleAssignSubmit = async () => {
    if (!assignModalProject || !selectedAssigneeUid) return;
    const targetUser = allUsers.find((u) => u.uid === selectedAssigneeUid);
    if (!targetUser) {
      setAssignNotice({ text: "Please select a registered engineer.", error: true });
      return;
    }

    setIsAssigning(true);
    setAssignNotice(null);
    try {
      const assignedByName =
        currentUser?.displayName || currentUser?.email || appUser?.displayName || "Admin";

      const res = await assignProjectToUser(assignModalProject.id, targetUser, {
        transferOwnership,
        assignedBy: assignedByName,
      });

      if (res.success && res.project) {
        const updated = res.project;
        setAllProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setAssignModalProject(updated);
        const actionLabel = transferOwnership
          ? `Ownership transferred to ${targetUser.displayName || targetUser.email}`
          : `Assigned as Editor to ${targetUser.displayName || targetUser.email}`;
        setAssignNotice({
          text: `✓ Success! "${updated.name}" is now ${actionLabel}.`,
        });
        setTimeout(() => {
          handleCloseAssignModal();
        }, 1800);
      } else {
        setAssignNotice({ text: res.error || "Failed to assign project", error: true });
      }
    } catch (err: any) {
      setAssignNotice({ text: err.message || "Failed to assign project", error: true });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignProject = async (project: Project) => {
    setIsAssigning(true);
    setAssignNotice(null);
    try {
      const res = await unassignProjectFromUser(project.id);
      if (res.success && res.project) {
        const updated = res.project;
        setAllProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        if (assignModalProject?.id === project.id) {
          setAssignModalProject(updated);
          setSelectedAssigneeUid("");
        }
        setAssignNotice({
          text: `✓ Assignment removed. "${project.name}" is now reverted to Owner-only access.`,
        });
        setTimeout(() => {
          if (assignModalProject?.id === project.id) {
            handleCloseAssignModal();
          }
        }, 1800);
      } else {
        setAssignNotice({ text: res.error || "Failed to unassign project", error: true });
      }
    } catch (err: any) {
      setAssignNotice({ text: err.message || "Failed to unassign project", error: true });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleQuickAssignSubmit = async () => {
    if (!quickAssignUser || !quickAssignProjectId) return;
    const targetProject = allProjects.find((p) => p.id === quickAssignProjectId);
    if (!targetProject) return;

    setIsAssigning(true);
    try {
      const assignedByName =
        currentUser?.displayName || currentUser?.email || appUser?.displayName || "Admin";

      const res = await assignProjectToUser(targetProject.id, quickAssignUser, {
        transferOwnership: false,
        assignedBy: assignedByName,
      });

      if (res.success && res.project) {
        const updated = res.project;
        setAllProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setRoleNotice({
          text: `✓ Assigned "${targetProject.name}" to ${quickAssignUser.displayName || quickAssignUser.email} for editing.`,
        });
        setTimeout(() => setRoleNotice(null), 4000);
        setQuickAssignUser(null);
        setQuickAssignProjectId("");
      } else {
        setRoleNotice({ text: res.error || "Failed to assign project", error: true });
      }
    } catch (err: any) {
      setRoleNotice({ text: err.message || "Failed to assign project", error: true });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRoleChange = async (user: AppUser, newRole: UserRole) => {
    setUpdatingUserId(user.uid);
    setRoleNotice(null);
    try {
      const res = await assignUserRole(user.uid, newRole, user.email);
      if (res.success) {
        setAllUsers((prev) =>
          prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u))
        );
        setRoleNotice({
          text: `Role for "${user.displayName || user.email}" updated to ${newRole.toUpperCase()}.`,
        });
        setTimeout(() => setRoleNotice(null), 4000);
      } else {
        setRoleNotice({ text: res.error || "Failed to update role", error: true });
      }
    } catch (err: any) {
      setRoleNotice({ text: err.message || "Failed to update role", error: true });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, users] = await Promise.all([
        fetchAllProjectsForAdmin(),
        fetchAllUsersForAdmin(),
      ]);
      setAllProjects(projs);
      setAllUsers(users);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCostAll = allProjects.reduce((sum, p) => sum + calculateProjectTotalCost(p), 0);

  const emailPasswordUsers = allUsers.filter(
    (u) => u.authProvider === "email_password" || (!u.photoURL && u.authProvider !== "google")
  );
  const googleUsers = allUsers.filter(
    (u) => u.authProvider === "google" || Boolean(u.photoURL)
  );

  const filteredUsers = allUsers.filter((u) => {
    const isEmailPass =
      u.authProvider === "email_password" || (!u.photoURL && u.authProvider !== "google");
    if (userTypeFilter === "email_password" && !isEmailPass) return false;
    if (userTypeFilter === "google" && isEmailPass) return false;

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchesName = (u.displayName || "").toLowerCase().includes(q);
      const matchesEmail = (u.email || "").toLowerCase().includes(q);
      const matchesRole = (u.role || "").toLowerCase().includes(q);
      const matchesProvider = isEmailPass
        ? "email password register registered workspace".includes(q)
        : "google gmail oauth".includes(q);
      return matchesName || matchesEmail || matchesRole || matchesProvider;
    }
    return true;
  });

  const filteredProjects = allProjects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      (p.ownerEmail && p.ownerEmail.toLowerCase().includes(q)) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
      (p.engineer && p.engineer.toLowerCase().includes(q)) ||
      (p.assignedToEmail && p.assignedToEmail.toLowerCase().includes(q)) ||
      (p.assignedToName && p.assignedToName.toLowerCase().includes(q));

    const matchesUser =
      userFilter === "all" ||
      p.ownerEmail === userFilter ||
      p.ownerId === userFilter ||
      p.assignedTo === userFilter ||
      p.assignedToEmail === userFilter;
    return matchesSearch && matchesUser;
  });

  const handleDelete = async (projectId: string) => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      setAllProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Admin delete error:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#121c2d] border border-[#2d4a6a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24374e] bg-gradient-to-r from-[#17263c] to-[#121c2d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Admin System Control Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#8ba3c1]">
                Manage all registered engineers, cloud projects, and system access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-[#8ba3c1] hover:text-white hover:bg-[#1a2b42] rounded-lg transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#00c2c7]" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#8ba3c1] hover:text-white hover:bg-[#1a2b42] rounded-lg transition"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0e1624] border-b border-[#24374e]">
          <div className="bg-[#152033] p-3 rounded-xl border border-[#24374e]">
            <div className="flex items-center justify-between text-xs text-[#8ba3c1] mb-1">
              <span>Total System Projects</span>
              <FolderKanban className="w-3.5 h-3.5 text-[#00c2c7]" />
            </div>
            <div className="text-xl font-bold font-mono text-white">{allProjects.length}</div>
          </div>

          <div className="bg-[#152033] p-3 rounded-xl border border-[#24374e]">
            <div className="flex items-center justify-between text-xs text-[#8ba3c1] mb-1">
              <span>Registered Users</span>
              <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-bold font-mono text-white">{allUsers.length}</span>
              <span className="text-[10px] text-[#8ba3c1] font-mono">
                ({emailPasswordUsers.length} Email/Pass · {googleUsers.length} Google)
              </span>
            </div>
          </div>

          <div className="bg-[#152033] p-3 rounded-xl border border-[#24374e]">
            <div className="flex items-center justify-between text-xs text-[#8ba3c1] mb-1">
              <span>System Valuation</span>
              <DollarSign className="w-3.5 h-3.5 text-[#2ecc71]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#2ecc71]">
              ৳ {totalCostAll.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-[#152033] p-3 rounded-xl border border-[#24374e]">
            <div className="flex items-center justify-between text-xs text-[#8ba3c1] mb-1">
              <span>Root Administrator</span>
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 truncate" title={currentUser?.email || appUser?.email || BOOTSTRAP_ADMIN_EMAIL}>
              {currentUser?.email || appUser?.email || BOOTSTRAP_ADMIN_EMAIL}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[#24374e] bg-[#121c2d]">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("projects")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "projects"
                  ? "border-[#00c2c7] text-[#00c2c7]"
                  : "border-transparent text-[#8ba3c1] hover:text-white"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>All Projects ({allProjects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "users"
                  ? "border-[#00c2c7] text-[#00c2c7]"
                  : "border-transparent text-[#8ba3c1] hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Registered Engineers ({allUsers.length})</span>
            </button>
          </div>

          {activeTab === "projects" && (
            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8ba3c1]" />
                <input
                  type="text"
                  placeholder="Search project or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] outline-none w-48 sm:w-64"
                />
              </div>

              {allUsers.length > 0 && (
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="py-1 px-2 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">All Owners ({allProjects.length})</option>
                  {allUsers.map((u) => {
                    const count = allProjects.filter((p) => p.ownerId === u.uid || p.ownerEmail === u.email).length;
                    return (
                      <option key={u.uid} value={u.email || u.uid}>
                        {u.displayName || u.email || u.uid} ({count} {count === 1 ? "project" : "projects"})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-[#8ba3c1]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00c2c7] mb-2" />
              <span>Loading system records from Firestore...</span>
            </div>
          ) : activeTab === "projects" ? (
            filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-xs text-[#8ba3c1]">
                No projects found matching the filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProjects.map((p) => {
                  const estCount = p.estimates?.length || 0;
                  const isOwnerAdmin =
                    p.ownerEmail?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

                  return (
                    <div
                      key={p.id}
                      className="bg-[#152033] border border-[#24374e] hover:border-[#00c2c7]/40 rounded-xl p-3.5 transition flex flex-col justify-between space-y-3 shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <h3 className="text-sm font-bold text-white hover:text-[#00c2c7] transition">
                              {p.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8ba3c1]">
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-[#f5a623]" />
                                {p.client || "Client"}
                              </span>
                              <span>•</span>
                              <span>{p.location || "Bangladesh"}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#101928] text-[#2ecc71] border border-[#2ecc71]/30 shrink-0">
                            ৳ {calculateProjectTotalCost(p).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Owner Badge */}
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] bg-[#0e1624] px-2.5 py-1.5 rounded-lg border border-[#24374e]">
                          <Users className="w-3 h-3 text-[#38bdf8] shrink-0" />
                          <span className="text-[#8ba3c1]">Owner:</span>
                          <span className="font-mono text-white font-semibold truncate">
                            {p.ownerEmail || p.ownerName || p.ownerId || "Anonymous"}
                          </span>
                          {isOwnerAdmin && (
                            <span className="ml-auto text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              Admin
                            </span>
                          )}
                        </div>

                        {/* Assigned Editor Badge */}
                        {p.assignedTo ? (
                          <div className="flex items-center justify-between gap-1.5 mt-1.5 text-[10px] bg-[#0c1f2e] px-2.5 py-1.5 rounded-lg border border-[#00c2c7]/40 shadow-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <UserCheck className="w-3 h-3 text-[#00c2c7] shrink-0" />
                              <span className="text-[#8ba3c1]">Assigned Editor:</span>
                              <span className="font-mono text-[#00c2c7] font-bold truncate">
                                {p.assignedToName || p.assignedToEmail || p.assignedTo}
                              </span>
                            </div>
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40 shrink-0">
                              Can Edit
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] bg-[#0e1624]/60 px-2.5 py-1 rounded-lg border border-[#24374e]/60 text-[#8ba3c1]">
                            <Users className="w-3 h-3 text-[#8ba3c1]/40 shrink-0" />
                            <span className="text-[10px] text-[#8ba3c1]/70">Editor: Owner only (not assigned)</span>
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center justify-between text-[10px] text-[#8ba3c1] mt-2 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recent"}
                          </span>
                          <span>
                            {p.stories || 1} Floor{p.stories !== 1 ? "s" : ""} · {estCount} Estimates
                          </span>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#24374e]">
                        <button
                          onClick={() => handleOpenAssignModal(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#17273c] hover:bg-[#00c2c7] text-[#00c2c7] hover:text-[#0f1c2e] border border-[#00c2c7]/40 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Assign this project to an engineer for editing"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>{p.assignedTo ? "Reassign" : "Assign to Engineer"}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onSelectProject(p);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#00c2c7]/20 hover:bg-[#00c2c7] text-[#00c2c7] hover:text-[#0f1c2e] rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Open this user's project in main workspace"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect & Edit</span>
                          </button>

                        {deleteConfirmId === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-[#24374e] hover:bg-[#2d4a6a] text-xs text-[#8ba3c1] rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 text-[#ff4d6d] hover:bg-[#ff4d6d]/20 rounded-lg transition"
                            title="Delete this project as Admin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Users / Engineers Tab
            <div className="space-y-3">
              {/* Filter pills and search bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0e1624] p-3 rounded-xl border border-[#24374e]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setUserTypeFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      userTypeFilter === "all"
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-sm"
                        : "bg-[#152033] text-[#8ba3c1] hover:text-white border border-[#24374e]"
                    }`}
                  >
                    All Engineers ({allUsers.length})
                  </button>
                  <button
                    onClick={() => setUserTypeFilter("email_password")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
                      userTypeFilter === "email_password"
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "bg-[#152033] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Email & Password ({emailPasswordUsers.length})</span>
                  </button>
                  <button
                    onClick={() => setUserTypeFilter("google")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
                      userTypeFilter === "google"
                        ? "bg-blue-500 text-white font-bold shadow-sm"
                        : "bg-[#152033] text-blue-400 hover:text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google Sign-In ({googleUsers.length})</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8ba3c1]" />
                  <input
                    type="text"
                    placeholder="Search engineer, email, or role..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#1a2b42] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] outline-none w-52 sm:w-64 focus:border-[#00c2c7]"
                  />
                </div>
              </div>

              {/* Role update notice toast/banner */}
              {roleNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                    roleNotice.error
                      ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{roleNotice.text}</span>
                  </div>
                  <button
                    onClick={() => setRoleNotice(null)}
                    className="p-1 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Engineers Table */}
              <div className="bg-[#152033] border border-[#24374e] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1624] text-[#8ba3c1] uppercase font-mono text-[10px] border-b border-[#24374e]">
                    <tr>
                      <th className="py-2.5 px-4">User / Engineer</th>
                      <th className="py-2.5 px-4">Login / Auth Method</th>
                      <th className="py-2.5 px-4">Email Address</th>
                      <th className="py-2.5 px-4">Assigned Role (Editor/Viewer)</th>
                      <th className="py-2.5 px-4">Projects Owned</th>
                      <th className="py-2.5 px-4">Last Activity</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24374e]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#8ba3c1]">
                          No registered engineers found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const userProjs = allProjects.filter(
                          (p) => p.ownerId === u.uid || p.ownerEmail === u.email
                        );
                        const isBootstrap =
                          u.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
                        const isEmailPass =
                          u.authProvider === "email_password" || (!u.photoURL && u.authProvider !== "google");

                        return (
                          <tr key={u.uid} className="hover:bg-[#1a2b42]/50 transition">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName || "User"}
                                    className="w-7 h-7 rounded-full border border-[#2d4a6a]"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono border border-emerald-500/30">
                                    {(u.displayName || u.email || "E")[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white">
                                    {u.displayName || "Civil Engineer"}
                                  </span>
                                  <span className="text-[10px] text-[#8ba3c1] font-mono">
                                    {u.uid}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {isEmailPass ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <Key className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>Email & Password</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  <Globe className="w-2.5 h-2.5 text-blue-400" />
                                  <span>Google Sign-In</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[#8ba3c1]">
                              {u.email || "No email"}
                            </td>
                            <td className="py-2.5 px-4">
                              {isBootstrap ? (
                                <span
                                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                                  title="Permanent System Super Admin"
                                >
                                  <Shield className="w-3 h-3 text-amber-400" />
                                  <span>Super Admin</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="relative inline-block">
                                    <select
                                      value={u.role === "viewer" ? "viewer" : u.role === "admin" ? "admin" : "editor"}
                                      disabled={updatingUserId === u.uid}
                                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                                      aria-label={`Role for ${u.displayName || u.email}`}
                                      className={`text-[11px] font-bold py-1 pl-2.5 pr-6 rounded-lg cursor-pointer transition border appearance-none outline-none font-sans ${
                                        u.role === "viewer"
                                          ? "bg-purple-950/60 text-purple-300 border-purple-500/50 hover:border-purple-400"
                                          : u.role === "admin"
                                          ? "bg-amber-950/60 text-amber-300 border-amber-500/50 hover:border-amber-400"
                                          : "bg-teal-950/60 text-[#00c2c7] border-[#00c2c7]/50 hover:border-[#00c2c7]"
                                      }`}
                                    >
                                      <option value="editor" className="bg-[#152033] text-[#00c2c7]">
                                        Editor (Full Edit)
                                      </option>
                                      <option value="viewer" className="bg-[#152033] text-purple-300">
                                        Viewer (Read-Only)
                                      </option>
                                      <option value="admin" className="bg-[#152033] text-amber-300">
                                        Admin (Supervisor)
                                      </option>
                                    </select>
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-[#8ba3c1]">
                                      ▼
                                    </span>
                                  </div>
                                  {updatingUserId === u.uid && (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00c2c7]" />
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs">
                              {(() => {
                                const ownedProjs = allProjects.filter(
                                  (p) => p.ownerId === u.uid || p.ownerEmail === u.email
                                );
                                const assignedProjs = allProjects.filter(
                                  (p) => p.assignedTo === u.uid || p.assignedToEmail === u.email
                                );
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">{ownedProjs.length}</span>
                                    {assignedProjs.length > 0 && (
                                      <span className="text-[10px] text-[#00c2c7] font-semibold bg-[#00c2c7]/15 px-1.5 py-0.2 rounded border border-[#00c2c7]/30">
                                        +{assignedProjs.length} assigned
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-4 text-[#8ba3c1] font-mono text-[11px]">
                              {u.lastLoginAt
                                ? new Date(u.lastLoginAt).toLocaleDateString()
                                : "Unknown"}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setQuickAssignUser(u);
                                    setQuickAssignProjectId(allProjects[0]?.id || "");
                                  }}
                                  className="px-2.5 py-1 bg-[#152a3d] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7] border border-[#00c2c7]/40 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                  title={`Assign a project to ${u.displayName || u.email} for editing`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Assign Project</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setUserFilter(u.email || u.uid);
                                    setActiveTab("projects");
                                  }}
                                  className="px-2.5 py-1 bg-[#1a2b42] hover:bg-[#2d4a6a] text-white rounded text-[11px] font-semibold transition cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#24374e] bg-[#0e1624] flex items-center justify-between text-xs text-[#8ba3c1]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin privileges allow supervisory oversight and assigning any project to any user for editing.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>

        {/* Project Assignment Modal (Admin assigns project to any user) */}
        {assignModalProject && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-[#142337] border-2 border-[#00c2c7] rounded-2xl shadow-2xl p-5 text-white flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-[#24374e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00c2c7]/20 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Assign Project for Editing</h3>
                    <p className="text-xs text-[#8ba3c1] truncate max-w-xs font-mono">
                      Project: <span className="text-white font-semibold">{assignModalProject.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAssignModal}
                  className="p-1.5 text-[#8ba3c1] hover:text-white rounded-lg hover:bg-[#1a2b42]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status and Current Assignment Info */}
              <div className="bg-[#0e1624] p-3 rounded-xl border border-[#24374e] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8ba3c1]">
                  <span>Primary Owner:</span>
                  <span className="font-mono text-white font-semibold">
                    {assignModalProject.ownerName || assignModalProject.ownerEmail || assignModalProject.ownerId || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8ba3c1]">Current Assigned Editor:</span>
                  {assignModalProject.assignedTo ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[#00c2c7] font-bold bg-[#00c2c7]/15 px-2 py-0.5 rounded border border-[#00c2c7]/30">
                        {assignModalProject.assignedToName || assignModalProject.assignedToEmail || assignModalProject.assignedTo}
                      </span>
                      <button
                        onClick={() => handleUnassignProject(assignModalProject)}
                        disabled={isAssigning}
                        className="px-2 py-0.5 bg-red-950/70 hover:bg-red-800 text-red-300 border border-red-500/40 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Remove assignment and revert to owner only"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#8ba3c1] italic">None (Owner only)</span>
                  )}
                </div>
              </div>

              {/* Feedback Notice */}
              {assignNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    assignNotice.error
                      ? "bg-red-950/70 text-red-200 border border-red-500/40"
                      : "bg-emerald-950/70 text-emerald-200 border border-emerald-500/40"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignNotice.text}</span>
                </div>
              )}

              {/* Target Engineer Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Select Registered Engineer to Assign:</span>
                  <span className="text-[10px] font-normal text-[#8ba3c1]">
                    {allUsers.length} engineers available
                  </span>
                </label>

                {/* Filter search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8ba3c1]" />
                  <input
                    type="text"
                    placeholder="Search engineer name or email..."
                    value={assignModalSearch}
                    onChange={(e) => setAssignModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] outline-none focus:border-[#00c2c7]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 bg-[#0e1624] p-1.5 rounded-xl border border-[#24374e]">
                  {allUsers
                    .filter((u) => {
                      if (!assignModalSearch.trim()) return true;
                      const q = assignModalSearch.toLowerCase();
                      return (
                        (u.displayName || "").toLowerCase().includes(q) ||
                        (u.email || "").toLowerCase().includes(q) ||
                        (u.role || "").toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const isSelected = selectedAssigneeUid === u.uid;
                      const isOwner =
                        assignModalProject.ownerId === u.uid ||
                        (assignModalProject.ownerEmail && u.email && assignModalProject.ownerEmail.toLowerCase() === u.email.toLowerCase());

                      return (
                        <div
                          key={u.uid}
                          onClick={() => setSelectedAssigneeUid(u.uid)}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 border ${
                            isSelected
                              ? "bg-[#00c2c7]/20 border-[#00c2c7] text-white"
                              : "bg-[#152033] hover:bg-[#1a2b42] border-[#24374e] text-[#8ba3c1] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-6 h-6 rounded-full shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] text-xs font-bold flex items-center justify-center shrink-0">
                                {(u.displayName || u.email || "E")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                {u.displayName || "Civil Engineer"}
                                {isOwner && (
                                  <span className="ml-1.5 text-[9px] text-[#f5a623] font-normal">
                                    (Current Owner)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8ba3c1] font-mono truncate">
                                {u.email || u.uid}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#1a2b42] text-[#8ba3c1] border border-[#2d4a6a]">
                              {u.role || "editor"}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#00c2c7] shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Assignment Mode: Editor (Shared) vs Transfer Ownership */}
              <div className="space-y-2 bg-[#0e1624] p-3 rounded-xl border border-[#24374e]">
                <div className="text-xs font-bold text-white mb-1">Choose Assignment Action:</div>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={!transferOwnership}
                    onChange={() => setTransferOwnership(false)}
                    className="mt-0.5 accent-[#00c2c7]"
                  />
                  <div>
                    <span className="font-bold text-white">Assign as Project Editor (Shared)</span>
                    <p className="text-[11px] text-[#8ba3c1] leading-tight mt-0.5">
                      The assigned engineer gets full editing rights and this project appears in their dashboard. Original owner remains primary owner.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1 border-t border-[#24374e]">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={transferOwnership}
                    onChange={() => setTransferOwnership(true)}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <span className="font-bold text-amber-400">Transfer Full Ownership</span>
                    <p className="text-[11px] text-[#8ba3c1] leading-tight mt-0.5">
                      Transfers complete ownership of this project to the selected engineer.
                    </p>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24374e]">
                <button
                  type="button"
                  onClick={handleCloseAssignModal}
                  disabled={isAssigning}
                  className="px-4 py-2 bg-[#1a2b42] hover:bg-[#24374e] text-xs font-semibold rounded-xl text-[#8ba3c1] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignSubmit}
                  disabled={isAssigning || !selectedAssigneeUid}
                  className="px-5 py-2 bg-[#00c2c7] hover:bg-[#00a8ad] disabled:opacity-50 text-[#0f1c2e] font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{transferOwnership ? "Transfer Ownership" : "Confirm Assignment"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Assign from Engineers List Modal */}
        {quickAssignUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-[#142337] border-2 border-[#00c2c7] rounded-2xl shadow-2xl p-5 text-white flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-[#24374e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00c2c7]/20 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Assign Project to Engineer</h3>
                    <p className="text-xs text-[#00c2c7] font-semibold truncate">
                      {quickAssignUser.displayName || quickAssignUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickAssignUser(null)}
                  className="p-1.5 text-[#8ba3c1] hover:text-white rounded-lg hover:bg-[#1a2b42]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Select Project to Assign for Editing:</label>
                <select
                  value={quickAssignProjectId}
                  onChange={(e) => setQuickAssignProjectId(e.target.value)}
                  className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white outline-none cursor-pointer"
                >
                  <option value="">-- Choose a Project ({allProjects.length} available) --</option>
                  {allProjects.map((p) => {
                    const isAlreadyAssigned =
                      p.assignedTo === quickAssignUser.uid || p.assignedToEmail === quickAssignUser.email;
                    const isAlreadyOwner =
                      p.ownerId === quickAssignUser.uid || p.ownerEmail === quickAssignUser.email;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Client: {p.client || "N/A"})
                        {isAlreadyOwner ? " [Already Owner]" : isAlreadyAssigned ? " [Already Assigned]" : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-[#8ba3c1]">
                  Once assigned, {quickAssignUser.displayName || quickAssignUser.email} will be able to view and edit this project in their own workspace.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24374e]">
                <button
                  type="button"
                  onClick={() => setQuickAssignUser(null)}
                  className="px-4 py-2 bg-[#1a2b42] hover:bg-[#24374e] text-xs font-semibold rounded-xl text-[#8ba3c1] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickAssignSubmit}
                  disabled={isAssigning || !quickAssignProjectId}
                  className="px-5 py-2 bg-[#00c2c7] hover:bg-[#00a8ad] disabled:opacity-50 text-[#0f1c2e] font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Assign for Editing</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
