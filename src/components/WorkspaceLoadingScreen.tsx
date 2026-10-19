import React, { useEffect, useState } from "react";
import {
  HardHat,
  Shield,
  Layers,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import { AppUser } from "../types";

interface WorkspaceLoadingScreenProps {
  user: AppUser | null;
  onReady: () => void;
}

export const WorkspaceLoadingScreen: React.FC<WorkspaceLoadingScreenProps> = ({
  user,
  onReady,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("Authenticating civil engineer credentials...");
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setStatusText(
        user?.role === "admin"
          ? "Initializing Administrator Master Control & Global Supervisory Matrix..."
          : `Mounting private Firebase cloud repository for ${user?.displayName || "Engineer"}...`
      );
    }, 350);

    const t2 = setTimeout(() => {
      setProgress(75);
      setStatusText("Verifying project isolation & loading structural BNBC/ACI calculation files...");
    }, 750);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText("Personal Workspace Ready! Opening Ashraf Civil Studio...");
    }, 1150);

    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 1450);

    const t5 = setTimeout(() => {
      onReady();
    }, 1750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [user, onReady]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a121e] text-[#f1f5f9] select-none p-4 transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Blueprint Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00c2c7 1px, transparent 1px), linear-gradient(90deg, #00c2c7 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-3xl bg-[#00c2c7]/20 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-[#172b45] to-[#0f1c2e] border-2 border-[#00c2c7] rounded-3xl shadow-2xl flex items-center justify-center">
            {user?.role === "admin" ? (
              <Shield className="w-12 h-12 text-amber-400 animate-bounce" />
            ) : (
              <HardHat className="w-12 h-12 text-[#00c2c7] animate-bounce" />
            )}
          </div>
        </div>

        {/* Welcome Message */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#00c2c7]/15 border border-[#00c2c7]/40 text-[#00c2c7]">
            <Sparkles className="w-3 h-3" />
            <span>Authenticated Workspace Initialization</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            Welcome, {user?.displayName || "Engineer"}
          </h2>

          <div className="flex items-center justify-center gap-2 text-xs text-[#8ba3c1] font-mono">
            <span>{user?.email}</span>
            <span>·</span>
            {user?.role === "admin" ? (
              <span className="text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                Super Admin
              </span>
            ) : (
              <span className="text-[#00c2c7] font-semibold bg-[#00c2c7]/20 px-2 py-0.5 rounded-full border border-[#00c2c7]/40">
                Isolated Personal Projects
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="bg-[#142337] border border-[#2d4a6a] rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-[#00c2c7] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 animate-spin" />
              <span>Personal Cloud Repository</span>
            </span>
            <span className="font-mono text-white font-bold">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#0a121e] rounded-full overflow-hidden border border-[#2d4a6a]/60 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#00c2c7] via-[#38bdf8] to-[#f5a623] rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-[#8ba3c1] font-mono truncate animate-pulse text-center">
            {statusText}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-[#8ba3c1]">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Strict Project Isolation</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#00c2c7]" />
            <span>Firebase Cloud Firestore</span>
          </div>
        </div>
      </div>
    </div>
  );
};
