import React, { useEffect, useState } from "react";
import {
  Building2,
  Columns,
  SquareDashedBottom,
  Grid3X3,
  Layers,
  Footprints,
  BrickWall,
  Calculator,
  Compass,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

interface SplashScreenProps {
  onFinish?: () => void;
  isManualOpen?: boolean;
  onClose?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  isManualOpen = false,
  onClose,
}) => {
  const [progress, setProgress] = useState(isManualOpen ? 100 : 15);
  const [stageText, setStageText] = useState("Initializing Civil Studio Workspace...");
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isManualOpen) {
      setProgress(100);
      setStageText("Workspace Ready");
      return;
    }

    const t1 = setTimeout(() => {
      setProgress(45);
      setStageText("Loading Structural Estimators & Bangladesh BNBC/ACI Material Standards...");
    }, 300);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStageText("Synchronizing Project Files & Material Rate Matrices...");
    }, 700);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStageText("Workspace Initialized & Ready!");
    }, 1100);

    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 1400);

    const t5 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isManualOpen, onFinish]);

  const handleDismiss = () => {
    if (isManualOpen && onClose) {
      onClose();
    } else if (onFinish) {
      setIsFadingOut(true);
      setTimeout(onFinish, 200);
    }
  };

  const modules = [
    { name: "Grade Beams", icon: SquareDashedBottom, color: "#00c2c7" },
    { name: "Columns", icon: Columns, color: "#38bdf8" },
    { name: "Footings", icon: Footprints, color: "#f5a623" },
    { name: "RCC Slabs", icon: Layers, color: "#a855f7" },
    { name: "Staircases", icon: Building2, color: "#2ecc71" },
    { name: "Brick Masonry", icon: BrickWall, color: "#f97316" },
    { name: "Tiles & Finish", icon: Grid3X3, color: "#14b8a6" },
    { name: "Whole Building", icon: Calculator, color: "#ec4899" },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a121e] text-[#f1f5f9] select-none p-4 transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Architectural Blueprint Grid Lines */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#00c2c7 1px, transparent 1px), linear-gradient(90deg, #00c2c7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial Center Glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#00c2c7]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 max-w-lg w-full bg-[#121c2d]/90 border border-[#2d4a6a] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
        {/* Animated Studio Logo Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1a2d47] to-[#0f1c2e] border-2 border-[#00c2c7] shadow-xl flex items-center justify-center p-3 relative group">
            {/* SVG Logo Graphic */}
            <svg
              className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,194,199,0.5)]"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Columns */}
              <rect x="16" y="22" width="5" height="28" rx="1.5" fill="#00c2c7" />
              <rect x="29.5" y="16" width="5" height="34" rx="1.5" fill="#00c2c7" />
              <rect x="43" y="22" width="5" height="28" rx="1.5" fill="#00c2c7" />
              {/* Beams */}
              <rect x="14" y="24" width="36" height="3.5" rx="1" fill="#38bdf8" />
              <rect x="14" y="36" width="36" height="3.5" rx="1" fill="#38bdf8" />
              <rect x="12" y="48" width="40" height="4.5" rx="1.5" fill="#00c2c7" />
              {/* Gold Compass */}
              <path
                d="M 32 10 L 20 46 M 32 10 L 44 46"
                stroke="#f5a623"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="32" cy="10" r="3.5" fill="#f5a623" stroke="#fff" strokeWidth="1" />
              <path
                d="M 24 35 Q 32 30 40 35"
                stroke="#f5a623"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="absolute -bottom-2 -right-2 bg-[#f5a623] text-[#0f1c2e] p-1.5 rounded-xl shadow-md border border-[#0f1c2e]">
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: "10s" }} />
          </div>
        </div>

        {/* Studio Title & Subtitle */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00c2c7]/15 border border-[#00c2c7]/30 text-[11px] font-bold text-[#00c2c7] tracking-wider uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Civil & Structural Suite
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            ASHRAF CIVIL STUDIO
          </h1>
          <p className="text-xs sm:text-sm text-[#8ba3c1] max-w-sm mx-auto">
            Professional Engineering Estimation, BOQ & Project Cost Management Platform
          </p>
        </div>

        {/* 8 Engineering Modules Grid */}
        <div className="grid grid-cols-4 gap-2 w-full my-3 p-3 bg-[#0a121e]/70 border border-[#2d4a6a]/60 rounded-2xl">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.name}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#152033]/60 border border-[#2d4a6a]/40"
              >
                <Icon className="w-4 h-4 mb-1" style={{ color: m.color }} />
                <span className="text-[10px] font-semibold text-[#c8d6e5] text-center leading-tight truncate w-full">
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-full space-y-2 mt-2">
          <div className="flex items-center justify-between text-[11px] text-[#8ba3c1]">
            <span className="flex items-center gap-1.5 truncate">
              {progress === 100 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2ecc71] shrink-0" />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-[#00c2c7] animate-pulse shrink-0" />
              )}
              <span className="truncate">{stageText}</span>
            </span>
            <span className="font-mono font-bold text-[#00c2c7]">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-[#1a2b42] rounded-full overflow-hidden p-0.5 border border-[#2d4a6a]">
            <div
              className="h-full bg-gradient-to-r from-[#00c2c7] via-[#38bdf8] to-[#2ecc71] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Button & Footer Info */}
        <div className="mt-5 pt-4 border-t border-[#2d4a6a]/60 w-full flex items-center justify-between text-xs text-[#8ba3c1]">
          <span className="text-[11px] text-[#8ba3c1]/80 text-left">
            Standard: <strong className="text-white">BNBC / ACI 318</strong>
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex items-center gap-1.5 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-4 py-2 rounded-xl font-bold transition active:scale-95 shadow-md shadow-[#00c2c7]/20"
          >
            <span>{isManualOpen ? "Close" : "Enter Studio"}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Copyright notice required by user */}
        <div className="mt-3 text-[10px] text-[#8ba3c1]/70">
          Ashraf Civil Studio • Designed by{" "}
          <span className="text-[#00c2c7] font-semibold">MD. ASHRAFUL ISLAM</span>
        </div>
      </div>
    </div>
  );
};
