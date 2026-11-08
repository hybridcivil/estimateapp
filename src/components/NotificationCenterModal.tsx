import React, { useState } from "react";
import {
  Bell,
  X,
  CheckCheck,
  CreditCard,
  AlertTriangle,
  HeartHandshake,
  BookOpen,
  Info,
  Calendar,
  ExternalLink,
  Trash2,
  Filter,
} from "lucide-react";
import { AppNotification, NotificationType } from "../types";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId?: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  isAdmin?: boolean;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  isAdmin,
}) => {
  const [filterType, setFilterType] = useState<"all" | NotificationType>("all");

  if (!isOpen) return null;

  const isReadByMe = (notif: AppNotification) => {
    if (!currentUserId) return false;
    return Boolean(notif.readBy && notif.readBy.includes(currentUserId));
  };

  const filtered = notifications.filter((n) => {
    if (filterType === "all") return true;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !isReadByMe(n)).length;

  const getCategoryBadge = (type: NotificationType) => {
    switch (type) {
      case "subscription":
        return {
          icon: <CreditCard className="w-3.5 h-3.5" />,
          label: "সাবস্ক্রিপশন",
          badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          iconBg: "bg-amber-500/20 text-amber-400",
        };
      case "notice":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: "অফিসিয়াল নোটিশ",
          badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          iconBg: "bg-rose-500/20 text-rose-400",
        };
      case "thanks":
        return {
          icon: <HeartHandshake className="w-3.5 h-3.5" />,
          label: "ধন্যবাদ ও শুভেচ্ছা",
          badgeClass: "bg-pink-500/15 text-pink-400 border-pink-500/30",
          iconBg: "bg-pink-500/20 text-pink-400",
        };
      case "guide":
        return {
          icon: <BookOpen className="w-3.5 h-3.5" />,
          label: "ব্যবহার নির্দেশিকা",
          badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          iconBg: "bg-blue-500/20 text-blue-400",
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5" />,
          label: "সাধারণ বার্তা",
          badgeClass: "bg-[#00c2c7]/15 text-[#00c2c7] border-[#00c2c7]/30",
          iconBg: "bg-[#00c2c7]/20 text-[#00c2c7]",
        };
    }
  };

  const formatBengaliTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#121c2d] border border-[#2d4a6a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#24374e] bg-[#152033] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-[#00c2c7] text-[#0f1c2e] font-black flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  নোটিফিকেশন ও নোটিশ সেন্টার
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white animate-pulse">
                    {unreadCount} নতুন
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8ba3c1]">
                সাবস্ক্রিপশন স্ট্যাটাস, অফিশিয়াল নোটিশ, ইঞ্জিনিয়ারিং গাইড ও শুভেচ্ছা বার্তা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a2b42] hover:bg-[#243b55] border border-[#2d4a6a] text-[#00c2c7] hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#00c2c7]" />
                <span>সব পড়া হয়েছে</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#8ba3c1] hover:text-white hover:bg-[#24374e] rounded-lg transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="px-5 py-2.5 bg-[#0e1624] border-b border-[#24374e] flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <span className="text-[#8ba3c1] text-[10px] uppercase font-mono mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> ফিল্টার:
          </span>
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
              filterType === "all"
                ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                : "bg-[#152033] text-[#8ba3c1] hover:text-white border border-[#24374e]"
            }`}
          >
            সব ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("subscription")}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filterType === "subscription"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-[#152033] text-amber-400 hover:text-amber-300 border border-amber-500/30"
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>সাবস্ক্রিপশন</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("notice")}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filterType === "notice"
                ? "bg-rose-500 text-white font-bold"
                : "bg-[#152033] text-rose-400 hover:text-rose-300 border border-rose-500/30"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>নোটিশ</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("guide")}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filterType === "guide"
                ? "bg-blue-500 text-white font-bold"
                : "bg-[#152033] text-blue-400 hover:text-blue-300 border border-blue-500/30"
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>গাইড ও টিপস</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("thanks")}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 flex items-center gap-1 ${
              filterType === "thanks"
                ? "bg-pink-500 text-white font-bold"
                : "bg-[#152033] text-pink-400 hover:text-pink-300 border border-pink-500/30"
            }`}
          >
            <HeartHandshake className="w-3 h-3" />
            <span>ধন্যবাদ</span>
          </button>
        </div>

        {/* Notification List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#8ba3c1] space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#1a2b42] flex items-center justify-center text-[#8ba3c1]">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-white">কোনো বার্তা পাওয়া যায়নি</p>
              <p className="text-xs max-w-sm">
                এই ক্যাটাগরিতে বর্তমানে কোনো নোটিশ বা রিমাইন্ডার নেই। নতুন আপডেট আসলে এখানে প্রদর্শিত হবে।
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const read = isReadByMe(item);
              const badge = getCategoryBadge(item.type);

              return (
                <div
                  key={item.id}
                  className={`relative rounded-xl border p-4 transition duration-150 ${
                    read
                      ? "bg-[#152033]/60 border-[#24374e] text-slate-300"
                      : "bg-[#18283e] border-[#00c2c7]/50 shadow-md text-white ring-1 ring-[#00c2c7]/30"
                  }`}
                >
                  {/* Top Bar: Icon, Title, Category Badge, Timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${badge.iconBg}`}
                      >
                        {badge.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>

                          {item.priority === "urgent" && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white animate-pulse">
                              জরুরি
                            </span>
                          )}

                          {item.recipientUid === "all" ? (
                            <span className="text-[10px] text-[#8ba3c1] font-mono bg-[#0e1624] px-1.5 py-0.2 rounded border border-[#24374e]">
                              📢 সর্বজনীন নোটিশ
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8ba3c1] font-mono bg-[#0e1624] px-1.5 py-0.2 rounded border border-[#24374e]">
                              👤 ব্যক্তিগত বার্তা
                            </span>
                          )}

                          {!read && (
                            <span className="w-2 h-2 rounded-full bg-[#00c2c7] animate-ping" />
                          )}
                        </div>

                        <h3 className="text-sm font-bold leading-snug text-white">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-[#8ba3c1] block">
                        {formatBengaliTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mt-2.5 ml-12 text-xs sm:text-[13px] leading-relaxed text-slate-200 whitespace-pre-line bg-[#0e1624]/60 p-3 rounded-lg border border-[#24374e]">
                    {item.message}
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3 ml-12 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {item.actionUrl && (
                        <a
                          href={item.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <span>{item.actionLabel || "বিস্তারিত দেখুন"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {!read && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a2b42] hover:bg-[#243b55] text-[#00c2c7] hover:text-white rounded-lg text-xs font-semibold border border-[#2d4a6a] transition cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>পড়েছি</span>
                        </button>
                      )}
                    </div>

                    {isAdmin && onDeleteNotification && (
                      <button
                        type="button"
                        onClick={() => onDeleteNotification(item.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition cursor-pointer"
                        title="Delete announcement as admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#24374e] bg-[#0e1624] flex items-center justify-between text-xs text-[#8ba3c1]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00c2c7]" />
            <span>সুপার অ্যাডমিন কর্তৃক ইঞ্জিনিয়ারদের সুবিধার্থে নোটিশ প্রদান করা হয়</span>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-xs text-[#00c2c7] hover:underline font-semibold cursor-pointer sm:hidden"
            >
              সব পড়া চিহ্নিত করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
