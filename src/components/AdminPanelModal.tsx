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
import { Project, AppUser, UserRole, UserSubscription, SubscriptionPlan, SubscriptionStatus, AppNotification, NotificationType, NotificationPriority } from "../types";
import {
  fetchAllProjectsForAdmin,
  fetchAllUsersForAdmin,
  deleteProject,
  calculateProjectTotalCost,
  assignProjectToUser,
  unassignProjectFromUser,
  updateUserSubscription,
  fetchNotifications,
  sendNotification,
  deleteNotification,
} from "../services/api";
import { BOOTSTRAP_ADMIN_EMAIL, useAuth } from "../context/AuthContext";
import {
  CreditCard,
  Bell,
  Send,
  Sparkles,
  MessageSquare,
  HeartHandshake,
  BookOpen,
  CalendarDays,
  Clock,
  CheckCircle,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"projects" | "users" | "notifications" | "notices_history">("projects");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "email_password" | "google">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleNotice, setRoleNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Subscription Edit Modal State
  const [editingSubUser, setEditingSubUser] = useState<AppUser | null>(null);
  const [subPlan, setSubPlan] = useState<SubscriptionPlan>("pro");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>("active");
  const [subValidUntil, setSubValidUntil] = useState<string>("");
  const [subMaxProjects, setSubMaxProjects] = useState<number>(50);
  const [subBillingNotes, setSubBillingNotes] = useState<string>("");
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Send Notification Form State
  const [notifTargetUid, setNotifTargetUid] = useState<string>("all"); // "all" or user UID
  const [notifType, setNotifType] = useState<NotificationType>("subscription");
  const [notifPriority, setNotifPriority] = useState<NotificationPriority>("normal");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifActionUrl, setNotifActionUrl] = useState("");
  const [notifActionLabel, setNotifActionLabel] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccessNotice, setNotifSuccessNotice] = useState<string | null>(null);

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

  const handleOpenEditSub = (user: AppUser) => {
    setEditingSubUser(user);
    const existingSub = user.subscription;
    setSubPlan(existingSub?.plan || "pro");
    setSubStatus(existingSub?.status || "active");
    setSubValidUntil(existingSub?.validUntil ? existingSub.validUntil.slice(0, 10) : "");
    setSubMaxProjects(existingSub?.maxProjects ?? 50);
    setSubBillingNotes(existingSub?.billingNotes || "");
  };

  const handleSaveSub = async () => {
    if (!editingSubUser) return;
    setIsSavingSub(true);
    try {
      const updatedSub: UserSubscription = {
        plan: subPlan,
        status: subStatus,
        validUntil: subValidUntil ? new Date(subValidUntil).toISOString() : undefined,
        maxProjects: Number(subMaxProjects) || 50,
        billingNotes: subBillingNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || appUser?.email || "Admin",
      };

      const res = await updateUserSubscription(editingSubUser.uid, updatedSub);
      if (res.success) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u.uid === editingSubUser.uid ? { ...u, subscription: updatedSub } : u
          )
        );
        setRoleNotice({
          text: `✓ সাবস্ক্রিপশন সফলভাবে আপডেট করা হয়েছে (${editingSubUser.displayName || editingSubUser.email}: ${subPlan.toUpperCase()} - ${subStatus.toUpperCase()})`,
        });
        setTimeout(() => setRoleNotice(null), 4000);
        setEditingSubUser(null);
      } else {
        setRoleNotice({ text: res.error || "Failed to update subscription", error: true });
      }
    } catch (err: any) {
      setRoleNotice({ text: err.message || "Failed to save subscription", error: true });
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleApplyPresetTemplate = (templateKey: "sub_reminder" | "sub_active" | "rates_update" | "guide" | "thanks") => {
    if (templateKey === "sub_reminder") {
      setNotifType("subscription");
      setNotifPriority("high");
      setNotifTitle("সাবস্ক্রিপশন নবায়ন সংক্রান্ত নোটিশ");
      setNotifMessage(
        "প্রিয় প্রকৌশলী,\n\nআপনার Dolphin Box সিভিল এস্টিমেশন একাউন্টের সাবস্ক্রিপশনের মেয়াদ শীঘ্রই শেষ হতে যাচ্ছে। নিরবচ্ছিন্ন সেবা ও আপনার সেভ করা প্রজেক্টগুলো সক্রিয় রাখতে অনুগ্রহ করে অ্যাডমিন বা সাপোর্ট সেন্টারের সাথে যোগাযোগ করে একাউন্ট রিনিউ করুন।\n\nধন্যবাদ,\nসিস্টেম অ্যাডমিন"
      );
      setNotifActionLabel("সাপোর্টে যোগাযোগ");
      setNotifActionUrl("");
    } else if (templateKey === "sub_active") {
      setNotifType("subscription");
      setNotifPriority("normal");
      setNotifTitle("অভিনন্দন! আপনার সাবস্ক্রিপশন সক্রিয় হয়েছে");
      setNotifMessage(
        "প্রিয় প্রকৌশলী,\n\nআপনার Dolphin Box প্রো এস্টিমেটর লাইসেন্স সফলভাবে সক্রিয় করা হয়েছে। এখন আপনি আনলিমিটেড মাল্টি-স্টোরি আরসিসি ও সিভিল এস্টিমেট, সার্ভিস ভাউচার বিলিং এবং বিস্তারিত মেটেরিয়াল রিপোর্ট তৈরি করতে পারবেন।\n\nশুভ কামনা!"
      );
      setNotifActionLabel("এস্টিমেশন শুরু করুন");
      setNotifActionUrl("");
    } else if (templateKey === "rates_update") {
      setNotifType("notice");
      setNotifPriority("normal");
      setNotifTitle("জরুরি নোটিশ: মেটেরিয়াল রেট আপডেট করা হয়েছে");
      setNotifMessage(
        "সকল প্রকৌশলীদের দৃষ্টি আকর্ষণ করা যাচ্ছে,\n\nবাজার দর অনুযায়ী রড (৫০০W), সিমেন্ট (OPC/PCC), লাল সিলেট বালু, লোকাল বালু এবং ব্রিক চিপসের বর্তমান রেট শিডিউল আপডেট করা হয়েছে। আপনার চলমান প্রজেক্টের গ্লোবাল রেট পেজে নতুন দর যাচাই করে এস্টিমেট সম্পন্ন করুন।"
      );
      setNotifActionLabel("রেট শিডিউল দেখুন");
      setNotifActionUrl("");
    } else if (templateKey === "guide") {
      setNotifType("guide");
      setNotifPriority("normal");
      setNotifTitle("ব্যবহার নির্দেশিকা: সার্ভিস ভাউচার ও মেমো জেনারেশন");
      setNotifMessage(
        "টিপস ও গাইড:\n১. সার্ভিস ভাউচার মেনু থেকে আপনার ফার্মের নাম ও লোগো হেডার পরিবর্তন করে নিতে পারেন।\n২. প্রতিটি ভাউচার প্রতিটি ইউজারের জন্য সম্পূর্ণ গোপনীয় ও ক্লাউড সেভ থাকে।\n৩. সরাসরি প্রিন্ট অথবা Save as PDF দিয়ে ক্লায়েন্টকে মেমো প্রদান করুন।"
      );
      setNotifActionLabel("ভাউচার মেনু খুলুন");
      setNotifActionUrl("");
    } else if (templateKey === "thanks") {
      setNotifType("thanks");
      setNotifPriority("normal");
      setNotifTitle("Dolphin Box পরিবারের সাথে থাকার জন্য আন্তরিক ধন্যবাদ");
      setNotifMessage(
        "প্রিয় সহকর্মী ও প্রকৌশলীবৃন্দ,\n\nDolphin Box সিভিল ইঞ্জিনিয়ারিং এস্টিমেশন প্ল্যাটফর্ম ব্যবহার করে আমাদের সাথে যুক্ত থাকার জন্য আপনাকে অসংখ্য ধন্যবাদ ও শুভেচ্ছা। আমরা প্রতিনিয়ত প্ল্যাটফর্মটিকে আপনাদের জন্য আরও নিখুঁত ও সহজ করার কাজ করছি।"
      );
      setNotifActionLabel("ড্যাশবোর্ড");
      setNotifActionUrl("");
    }
  };

  const handleSendNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setIsSendingNotif(true);
    setNotifSuccessNotice(null);
    try {
      const targetUser = allUsers.find((u) => u.uid === notifTargetUid);
      const recipientName =
        notifTargetUid === "all"
          ? "All Engineers"
          : targetUser?.displayName || targetUser?.email || "Engineer";
      const recipientEmail = notifTargetUid === "all" ? undefined : targetUser?.email;

      const newNotif: Partial<AppNotification> = {
        recipientUid: notifTargetUid,
        recipientEmail,
        recipientName,
        type: notifType,
        priority: notifPriority,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        actionUrl: notifActionUrl.trim() || undefined,
        actionLabel: notifActionLabel.trim() || undefined,
        readBy: [],
        createdBy: currentUser?.email || appUser?.email || "Admin",
      };

      const res = await sendNotification(newNotif);
      if (res.success && res.notification) {
        setAllNotifications((prev) => [res.notification!, ...prev]);
        setNotifSuccessNotice(
          `✓ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে (${notifTargetUid === "all" ? "সকল ইঞ্জিনিয়ারদের নিকট ব্রডকাস্ট" : recipientName})`
        );
        setNotifTitle("");
        setNotifMessage("");
        setNotifActionUrl("");
        setNotifActionLabel("");
        setTimeout(() => setNotifSuccessNotice(null), 4500);
      } else {
        setNotifSuccessNotice(`Error: ${res.error || "Failed to send notification"}`);
      }
    } catch (err: any) {
      setNotifSuccessNotice(`Error: ${err.message || "Failed to send notification"}`);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await deleteNotification(id);
      setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Delete notif error", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, users, notifs] = await Promise.all([
        fetchAllProjectsForAdmin(),
        fetchAllUsersForAdmin(),
        fetchNotifications(undefined, undefined, true),
      ]);
      setAllProjects(projs);
      setAllUsers(users);
      setAllNotifications(notifs);
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
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[#24374e] bg-[#121c2d] overflow-x-auto">
          <div className="flex gap-3 sm:gap-4 shrink-0">
            <button
              onClick={() => setActiveTab("projects")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
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
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "users"
                  ? "border-[#00c2c7] text-[#00c2c7]"
                  : "border-transparent text-[#8ba3c1] hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Registered Engineers & Subscriptions ({allUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "notifications"
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-[#8ba3c1] hover:text-white"
              }`}
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span>Send Notice & Reminders</span>
            </button>
            <button
              onClick={() => setActiveTab("notices_history")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "notices_history"
                  ? "border-[#00c2c7] text-[#00c2c7]"
                  : "border-transparent text-[#8ba3c1] hover:text-white"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notices History ({allNotifications.length})</span>
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
          ) : activeTab === "users" ? (
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
                      <th className="py-2.5 px-4">Login Method</th>
                      <th className="py-2.5 px-4">Subscription Plan & Status</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Projects</th>
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
                                  <span>Email</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  <Globe className="w-2.5 h-2.5 text-blue-400" />
                                  <span>Google</span>
                                </span>
                              )}
                            </td>
                            {/* Subscription Status Column */}
                            <td className="py-2.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                                      u.subscription?.plan === "enterprise"
                                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                        : u.subscription?.plan === "pro"
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                        : u.subscription?.plan === "trial"
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                        : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                                    }`}
                                  >
                                    <CreditCard className="w-2.5 h-2.5" />
                                    <span>{u.subscription?.plan || "Free"}</span>
                                  </span>

                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold capitalize ${
                                      u.subscription?.status === "active"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : u.subscription?.status === "suspended"
                                        ? "bg-rose-500/20 text-rose-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {u.subscription?.status || "active"}
                                  </span>
                                </div>

                                <div className="text-[10px] font-mono text-[#8ba3c1]">
                                  {u.subscription?.validUntil ? (
                                    <span>
                                      মেয়াদ: {new Date(u.subscription.validUntil).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400/80">লাইফটাইম এক্সেস</span>
                                  )}
                                </div>
                              </div>
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
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Edit Subscription Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSub(u)}
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Manage subscription plan, validity, and limits"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Subscription</span>
                                </button>

                                {/* Send Notification directly to this engineer */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNotifTargetUid(u.uid);
                                    setActiveTab("notifications");
                                  }}
                                  className="px-2 py-1 bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-slate-950 border border-pink-500/40 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={`Send notification to ${u.displayName || u.email}`}
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Notice</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setQuickAssignUser(u);
                                    setQuickAssignProjectId(allProjects[0]?.id || "");
                                  }}
                                  className="px-2 py-1 bg-[#152a3d] hover:bg-[#00c2c7] hover:text-[#0f1c2e] text-[#00c2c7] border border-[#00c2c7]/40 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                  title={`Assign a project to ${u.displayName || u.email} for editing`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Assign</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setUserFilter(u.email || u.uid);
                                    setActiveTab("projects");
                                  }}
                                  className="px-2 py-1 bg-[#1a2b42] hover:bg-[#2d4a6a] text-white rounded text-[11px] font-semibold transition cursor-pointer"
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
          ) : activeTab === "notifications" ? (
            /* Send Notifications & Announcements Tab */
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Preset 1-Click Templates */}
              <div className="bg-[#0e1624] p-4 rounded-xl border border-[#24374e] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>১-ক্লিক দ্রুত নোটিশ টেমপ্লেট (Preset Quick Templates):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTemplate("sub_reminder")}
                    className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>সাবস্ক্রিপশন নবায়ন রিমাইন্ডার</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTemplate("sub_active")}
                    className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>সাবস্ক্রিপশন সক্রিয়করণ অভিনন্দন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTemplate("rates_update")}
                    className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>মেটেরিয়াল রেট আপডেট নোটিশ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTemplate("guide")}
                    className="px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>ব্যবহার নির্দেশিকা ও টিপস</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTemplate("thanks")}
                    className="px-2.5 py-1.5 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>ধন্যবাদ ও শুভেচ্ছা বার্তা</span>
                  </button>
                </div>
              </div>

              {/* Success Notification Alert */}
              {notifSuccessNotice && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between">
                  <span>{notifSuccessNotice}</span>
                  <button
                    type="button"
                    onClick={() => setNotifSuccessNotice(null)}
                    className="p-1 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Notification Creation Form */}
              <form
                onSubmit={handleSendNotificationSubmit}
                className="bg-[#152033] p-5 rounded-xl border border-[#24374e] space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Target Engineer / Broadcast */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      প্রাপক নির্বাচন (Target Recipient):
                    </label>
                    <select
                      value={notifTargetUid}
                      onChange={(e) => setNotifTargetUid(e.target.value)}
                      className="w-full p-2 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none cursor-pointer focus:border-[#00c2c7]"
                    >
                      <option value="all">📢 সকল নিবন্ধিত প্রকৌশলী (Broadcast All)</option>
                      {allUsers.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          👤 {u.displayName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notification Type */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      বার্তার ধরন (Category):
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as NotificationType)}
                      className="w-full p-2 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none cursor-pointer focus:border-[#00c2c7]"
                    >
                      <option value="subscription">💳 সাবস্ক্রিপশন সংক্রান্ত (Subscription)</option>
                      <option value="notice">⚠️ অফিসিয়াল নোটিশ (Official Notice)</option>
                      <option value="guide">📖 ব্যবহার নির্দেশিকা (Engineering Guide)</option>
                      <option value="thanks">💖 ধন্যবাদ ও শুভেচ্ছা (Thanks/Appreciation)</option>
                      <option value="general">ℹ️ সাধারণ বার্তা (General Announcement)</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      জরুরিতা লেভেল (Priority):
                    </label>
                    <select
                      value={notifPriority}
                      onChange={(e) => setNotifPriority(e.target.value as NotificationPriority)}
                      className="w-full p-2 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none cursor-pointer focus:border-[#00c2c7]"
                    >
                      <option value="normal">সাধারণ (Normal)</option>
                      <option value="high">উচ্চ অগ্রাধিকার (High)</option>
                      <option value="urgent">জরুরি (Urgent Alert)</option>
                      <option value="low">কম গুরুত্ব (Low)</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    বার্তার শিরোনাম (Subject / Title):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: সাবস্ক্রিপশন নবায়ন নোটিশ অথবা মেটেরিয়াল রেট আপডেট..."
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] outline-none focus:border-[#00c2c7]"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    বিস্তারিত বার্তা (Notification Body in Bengali/English):
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="নোটিশ বা বার্তার বিস্তারিত বিবরণ লিখুন..."
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] outline-none focus:border-[#00c2c7] resize-y"
                  />
                </div>

                {/* Action Button Link (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      অ্যাকশন বাটন লেবেল (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: বিস্তারিত দেখুন বা রিনিউ করুন"
                      value={notifActionLabel}
                      onChange={(e) => setNotifActionLabel(e.target.value)}
                      className="w-full p-2 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8ba3c1] mb-1">
                      অ্যাকশন লিংক বা URL (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      placeholder="https://... অথবা পেজ লিংক"
                      value={notifActionUrl}
                      onChange={(e) => setNotifActionUrl(e.target.value)}
                      className="w-full p-2 bg-[#0e1624] border border-[#2d4a6a] rounded-lg text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24374e]">
                  <button
                    type="submit"
                    disabled={isSendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-[#00c2c7] hover:from-amber-600 hover:to-[#00a8ad] disabled:opacity-50 text-[#0f1c2e] font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    {isSendingNotif ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {notifTargetUid === "all"
                        ? "সকলকে ব্রডকাস্ট নোটিশ পাঠান"
                        : "নির্দিষ্ট প্রকৌশলীকে নোটিশ পাঠান"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Notices History Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8ba3c1] px-1">
                <span>সর্বমোট প্রেরিত নোটিশ: {allNotifications.length} টি</span>
                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-1 text-[#00c2c7] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>রিফ্রেশ</span>
                </button>
              </div>

              {allNotifications.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#8ba3c1] bg-[#152033] rounded-xl border border-[#24374e]">
                  বর্তমানে কোনো নোটিশ বা নোটিফিকেশন পাঠানো হয়নি।
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="bg-[#152033] border border-[#24374e] p-3.5 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${
                              notif.type === "subscription"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : notif.type === "notice"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : notif.type === "guide"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                : notif.type === "thanks"
                                ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                                : "bg-teal-500/20 text-teal-300 border-teal-500/40"
                            }`}
                          >
                            {notif.type}
                          </span>

                          <span className="text-[10px] text-slate-300 bg-[#0e1624] px-1.5 py-0.2 rounded border border-[#24374e]">
                            প্রাপক: {notif.recipientUid === "all" ? "📢 সকল প্রকৌশলী" : notif.recipientName || notif.recipientUid}
                          </span>

                          <span className="text-[10px] text-[#8ba3c1] font-mono">
                            পড়েছেন: {notif.readBy?.length || 0} জন
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                        <p className="text-slate-300 text-xs whitespace-pre-line leading-relaxed bg-[#0e1624]/60 p-2.5 rounded-lg border border-[#24374e]">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-[#8ba3c1] font-mono pt-1">
                          <span>প্রেরণ সময়: {new Date(notif.createdAt).toLocaleString()}</span>
                          <span>প্রেরক: {notif.createdBy || "Admin"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNotif(notif.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition cursor-pointer shrink-0"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Edit Subscription Modal Dialog */}
        {editingSubUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-[#142337] border-2 border-amber-500 rounded-2xl shadow-2xl p-5 text-white flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-[#24374e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">ইঞ্জিনিয়ার সাবস্ক্রিপশন কন্ট্রোল (Manage Subscription)</h3>
                    <p className="text-xs text-amber-300 font-semibold truncate font-mono">
                      {editingSubUser.displayName || editingSubUser.email} ({editingSubUser.email})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSubUser(null)}
                  className="p-1.5 text-[#8ba3c1] hover:text-white rounded-lg hover:bg-[#1a2b42] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Plan Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      সাবস্ক্রিপশন প্ল্যান (Plan):
                    </label>
                    <select
                      value={subPlan}
                      onChange={(e) => setSubPlan(e.target.value as SubscriptionPlan)}
                      className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white outline-none cursor-pointer focus:border-amber-400"
                    >
                      <option value="free">Free (ফ্রি ট্রায়াল - সীমিত)</option>
                      <option value="trial">Trial (১৪ দিনের ট্রায়াল)</option>
                      <option value="pro">Pro (প্রফেশনাল সিভিল প্যাকেজ)</option>
                      <option value="enterprise">Enterprise (আনলিমিটেড এন্টারপ্রাইজ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      স্ট্যাটাস (Status):
                    </label>
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value as SubscriptionStatus)}
                      className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white outline-none cursor-pointer focus:border-amber-400"
                    >
                      <option value="active">Active (সক্রিয় / বৈধ)</option>
                      <option value="pending">Pending (পেন্ডিং / অনুমোদনাধীন)</option>
                      <option value="expired">Expired (মেয়াদোত্তীর্ণ)</option>
                      <option value="suspended">Suspended (স্থগিত / সাময়িক বন্ধ)</option>
                    </select>
                  </div>
                </div>

                {/* Expiry Date & Quick Extension */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-white">
                      মেয়াদ উত্তীর্ণের তারিখ (Valid Until):
                    </label>
                    <span className="text-[10px] text-[#8ba3c1]">
                      {subValidUntil ? `মেয়াদ: ${subValidUntil}` : "লাইফটাইম এক্সেস (খালি রাখলে)"}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={subValidUntil}
                    onChange={(e) => setSubValidUntil(e.target.value)}
                    className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                  />

                  {/* Quick Extension Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                    <span className="text-[#8ba3c1] text-[10px] mr-1">দ্রুত বাড়ান:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setSubValidUntil(d.toISOString().slice(0, 10));
                        setSubStatus("active");
                      }}
                      className="px-2 py-1 bg-[#1a2b42] hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-lg border border-[#2d4a6a] transition cursor-pointer"
                    >
                      +১ মাস (30d)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 90);
                        setSubValidUntil(d.toISOString().slice(0, 10));
                        setSubStatus("active");
                      }}
                      className="px-2 py-1 bg-[#1a2b42] hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-lg border border-[#2d4a6a] transition cursor-pointer"
                    >
                      +৩ মাস (90d)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        setSubValidUntil(d.toISOString().slice(0, 10));
                        setSubStatus("active");
                      }}
                      className="px-2 py-1 bg-[#1a2b42] hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-lg border border-[#2d4a6a] transition cursor-pointer"
                    >
                      +১ বছর (1 Year)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubValidUntil("");
                        setSubStatus("active");
                      }}
                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 rounded-lg border border-emerald-500/40 transition cursor-pointer"
                    >
                      লাইফটাইম (Lifetime)
                    </button>
                  </div>
                </div>

                {/* Max Projects Limit */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    সর্বোচ্চ প্রজেক্ট লিমিট (Max Projects Limit):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={subMaxProjects}
                    onChange={(e) => setSubMaxProjects(Number(e.target.value) || 50)}
                    className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                  />
                  <p className="text-[10px] text-[#8ba3c1] mt-0.5">
                    ডিফল্ট ৫০ টি প্রজেক্ট। আনলিমিটেডের জন্য ৫০০+ লিখুন।
                  </p>
                </div>

                {/* Admin Billing / Payment Notes */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    পেমেন্ট ও রেফারেন্স নোট (Admin Billing Notes):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="যেমন: bKash TrxID: 9X82BA..., 1 year license paid on 08 Nov..."
                    value={subBillingNotes}
                    onChange={(e) => setSubBillingNotes(e.target.value)}
                    className="w-full p-2.5 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24374e]">
                <button
                  type="button"
                  onClick={() => setEditingSubUser(null)}
                  className="px-4 py-2 bg-[#1a2b42] hover:bg-[#24374e] text-xs font-semibold rounded-xl text-[#8ba3c1] hover:text-white transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSaveSub}
                  disabled={isSavingSub}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isSavingSub && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>সাবস্ক্রিপশন সেভ করুন</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
