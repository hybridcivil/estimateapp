import React, { useState, useEffect } from "react";
import { Building2, Layers, Check, RefreshCw, Plus, Minus } from "lucide-react";

interface StoreyMultiplierBarProps {
  projectStories?: number;
  multiplier: number;
  setMultiplier: (val: number) => void;
  isMultiplying: boolean;
  setIsMultiplying: (val: boolean) => void;
  itemTypeLabel?: string; // e.g., "Beams", "Slabs", "Columns", "Stairs", "Walls", "Tiles"
}

export const StoreyMultiplierBar: React.FC<StoreyMultiplierBarProps> = ({
  projectStories = 1,
  multiplier,
  setMultiplier,
  isMultiplying,
  setIsMultiplying,
  itemTypeLabel = "Elements",
}) => {
  const effectiveMultiplier = isMultiplying ? Math.max(1, multiplier) : 1;
  const [localMultiplierStr, setLocalMultiplierStr] = useState<string>(String(multiplier));

  useEffect(() => {
    setLocalMultiplierStr(String(multiplier));
  }, [multiplier]);

  return (
    <div className="bg-[#121c2d] border border-[#2d4a6a] rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#00c2c7]/15 border border-[#00c2c7]/30 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-[#00c2c7]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white tracking-wide">
              Storey Multiplier
            </span>
            {projectStories > 1 && (
              <span className="text-[10px] bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                Project: {projectStories} Storeys
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8ba3c1] truncate">
            {isMultiplying
              ? `Multiplied across ${effectiveMultiplier} storeys (${itemTypeLabel} repeat per floor)`
              : `Single floor calculation (${itemTypeLabel} not multiplied)`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Toggle On/Off Multiplier */}
        <button
          type="button"
          onClick={() => setIsMultiplying(!isMultiplying)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer active:scale-95 ${
            isMultiplying
              ? "bg-[#00c2c7] text-[#0f1c2e] border-[#00c2c7] font-bold shadow-xs"
              : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
          }`}
          title={isMultiplying ? "Disable storey multiplication" : "Enable storey multiplication"}
        >
          <div
            className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
              isMultiplying
                ? "bg-[#0f1c2e] text-[#00c2c7] border-[#0f1c2e]"
                : "border-[#8ba3c1]"
            }`}
          >
            {isMultiplying && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
          <span>
            {isMultiplying
              ? `×${effectiveMultiplier} Storeys Active`
              : "Single Floor (1×)"}
          </span>
        </button>

        {/* Multiplier Stepper & Input */}
        {isMultiplying && (
          <div className="flex items-center bg-[#0e1624] border border-[#2d4a6a] rounded-lg p-1 storey-stepper-container gap-1 shadow-inner">
            <button
              type="button"
              disabled={multiplier <= 1}
              onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold bg-[#1e2f47] text-white border border-[#2d4a6a] hover:bg-[#00c2c7] hover:text-[#0f1c2e] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer storey-stepper-btn active:scale-95 shadow-sm"
              title="Decrease floor count"
              aria-label="Decrease floor count"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={localMultiplierStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setLocalMultiplierStr("");
                  return;
                }
                const cleaned = raw.replace(/[^0-9]/g, "");
                setLocalMultiplierStr(cleaned);
                if (cleaned !== "") {
                  const num = parseInt(cleaned, 10);
                  if (num >= 1) {
                    setMultiplier(Math.min(100, num));
                  }
                }
              }}
              onBlur={() => {
                const num = parseInt(localMultiplierStr, 10);
                if (isNaN(num) || num < 1) {
                  setLocalMultiplierStr("1");
                  setMultiplier(1);
                } else {
                  const clamped = Math.min(100, num);
                  setLocalMultiplierStr(String(clamped));
                  setMultiplier(clamped);
                }
              }}
              className="w-10 text-center bg-transparent font-bold text-xs text-[#f5a623] outline-none font-mono storey-stepper-input px-1"
              title="Enter number of storeys"
              placeholder="1"
            />
            <button
              type="button"
              onClick={() => setMultiplier(multiplier + 1)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold bg-[#1e2f47] text-white border border-[#2d4a6a] hover:bg-[#00c2c7] hover:text-[#0f1c2e] transition cursor-pointer storey-stepper-btn active:scale-95 shadow-sm"
              title="Increase floor count"
              aria-label="Increase floor count"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Sync with Project Button */}
        {projectStories > 1 && (
          <button
            type="button"
            onClick={() => {
              setMultiplier(projectStories);
              setIsMultiplying(true);
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition flex items-center gap-1 ${
              isMultiplying && multiplier === projectStories
                ? "bg-[#2ecc71]/20 text-[#2ecc71] border-[#2ecc71]/40"
                : "bg-[#1a2b42] text-[#8ba3c1] hover:text-[#00c2c7] border-[#2d4a6a]"
            }`}
            title={`Set multiplier to match project's ${projectStories} storeys`}
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Full Building ({projectStories}F)</span>
          </button>
        )}
      </div>
    </div>
  );
};
