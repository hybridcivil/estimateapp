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
} from "lucide-react";
import { Project, AppUser } from "../types";
import { fetchAllProjectsForAdmin, fetchAllUsersForAdmin, deleteProject } from "../services/api";
import { BOOTSTRAP_ADMIN_EMAIL } from "../context/AuthContext";

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
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const totalCostAll = allProjects.reduce((sum, p) => sum + (p.totalCost || 0), 0);

  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ownerEmail && p.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.engineer && p.engineer.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesUser = userFilter === "all" || p.ownerEmail === userFilter || p.ownerId === userFilter;
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
                Manage all registered engineers, cloud projects, and system access · {BOOTSTRAP_ADMIN_EMAIL}
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
            <div className="text-xl font-bold font-mono text-white">{allUsers.length}</div>
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
            <div className="text-xs font-mono font-bold text-amber-400 truncate" title={BOOTSTRAP_ADMIN_EMAIL}>
              {BOOTSTRAP_ADMIN_EMAIL}
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
                  <option value="all">All Owners</option>
                  {allUsers.map((u) => (
                    <option key={u.uid} value={u.email || u.uid}>
                      {u.displayName || u.email || u.uid}
                    </option>
                  ))}
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
                            ৳ {(p.totalCost || 0).toLocaleString("en-IN")}
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
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24374e]">
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
                  );
                })}
              </div>
            )
          ) : (
            // Users / Engineers Tab
            <div className="space-y-2">
              <div className="bg-[#152033] border border-[#24374e] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1624] text-[#8ba3c1] uppercase font-mono text-[10px] border-b border-[#24374e]">
                    <tr>
                      <th className="py-2.5 px-4">User / Engineer</th>
                      <th className="py-2.5 px-4">Email Address</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Projects Owned</th>
                      <th className="py-2.5 px-4">Last Activity</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24374e]">
                    {allUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#8ba3c1]">
                          No registered users recorded in database yet.
                        </td>
                      </tr>
                    ) : (
                      allUsers.map((u) => {
                        const userProjs = allProjects.filter(
                          (p) => p.ownerId === u.uid || p.ownerEmail === u.email
                        );
                        const isBootstrap =
                          u.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

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
                                  <div className="w-7 h-7 rounded-full bg-[#24374e] text-[#00c2c7] font-bold flex items-center justify-center font-mono">
                                    {(u.displayName || u.email || "E")[0].toUpperCase()}
                                  </div>
                                )}
                                <span className="font-semibold text-white">
                                  {u.displayName || "Civil Engineer"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[#8ba3c1]">
                              {u.email || "No email"}
                            </td>
                            <td className="py-2.5 px-4">
                              {u.role === "admin" || isBootstrap ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                  <Shield className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40">
                                  Engineer
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-white">
                              {userProjs.length}
                            </td>
                            <td className="py-2.5 px-4 text-[#8ba3c1] font-mono text-[11px]">
                              {u.lastLoginAt
                                ? new Date(u.lastLoginAt).toLocaleDateString()
                                : "Unknown"}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setUserFilter(u.email || u.uid);
                                  setActiveTab("projects");
                                }}
                                className="px-2.5 py-1 bg-[#1a2b42] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7] rounded text-[11px] font-semibold transition"
                              >
                                View Projects
                              </button>
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
            <span>Admin privileges allow supervisory oversight of all project files in Firestore.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
