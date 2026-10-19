import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, HardHat, Compass } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface WorkspaceLoadingScreenProps {
  onFinish: () => void;
  isReady: boolean;
}

export const WorkspaceLoadingScreen: React.FC<WorkspaceLoadingScreenProps> = ({
  onFinish,
  isReady,
}) => {
  const { appUser, currentUser } = useAuth();
  const [progress, setProgress] = useState(20);
  const [stageText, setStageText] = useState("Authenticating civil workspace credentials...");

  const engineerName =
    appUser?.displayName || currentUser?.displayName || appUser?.email?.split("@")[0] || "Engineer";

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(50);
      setStageText("Fetching your private structural projects & BOQ schedules...");
    }, 350);

    const t2 = setTimeout(() => {
      setProgress(80);
      setStageText("Configuring Bangladesh BNBC & ACI 318 design matrices...");
    }, 750);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStageText("Workspace ready! Opening studio...");
    }, 1100);

    const t4 = setTimeout(() => {
      onFinish();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a121e] text-[#f1f5f9] select-none p-4 animate-in fade-in duration-200">
      {/* Blueprint Grid Lines */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#00c2c7 1px, transparent 1px), linear-gradient(90deg, #00c2c7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute w-[500px] h-[500px] bg-[#00c2c7]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#121c2d] border border-[#2d4a6a] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Animated Icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a2d47] to-[#0f1c2e] border-2 border-[#00c2c7] shadow-xl flex items-center justify-center text-[#00c2c7]">
            <HardHat className="w-8 h-8 animate-bounce" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#f5a623] text-[#0f1c2e] p-1 rounded-lg">
            <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "6s" }} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00c2c7]/15 border border-[#00c2c7]/30 text-xs font-bold text-[#00c2c7] uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Private Workspace Loaded</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          Welcome, {engineerName}
        </h2>
        <p className="text-xs text-[#8ba3c1] mt-1 max-w-xs">
          Opening your private structural projects and engineering calculation tools.
        </p>

        {/* Loading Progress */}
        <div className="w-full space-y-2.5 mt-6">
          <div className="flex items-center justify-between text-xs text-[#8ba3c1]">
            <span className="flex items-center gap-2 truncate">
              {progress === 100 ? (
                <CheckCircle2 className="w-4 h-4 text-[#2ecc71] shrink-0" />
              ) : (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00c2c7] animate-pulse shrink-0" />
              )}
              <span className="truncate text-[11px] font-medium">{stageText}</span>
            </span>
            <span className="font-mono font-bold text-[#00c2c7] text-xs">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#1a2b42] rounded-full overflow-hidden p-0.5 border border-[#2d4a6a]">
            <div
              className="h-full bg-gradient-to-r from-[#00c2c7] via-[#38bdf8] to-[#2ecc71] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6 text-[10px] text-[#8ba3c1]">
          Ashraf Civil Studio • Isolated Cloud Workspace
        </div>
      </div>
    </div>
  );
};
