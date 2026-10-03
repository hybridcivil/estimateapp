import React, { useState, useEffect } from "react";
import { ProjectEstimateItem } from "../types";
import { X, Edit3, ExternalLink, Calendar, Receipt, FileText, Check } from "lucide-react";

interface EditEstimateModalProps {
  isOpen: boolean;
  estimate: ProjectEstimateItem | null;
  onClose: () => void;
  onRename: (estimateId: string, newName: string) => Promise<void>;
  onOpenInCalculator: (estimate: ProjectEstimateItem) => void;
}

export const EditEstimateModal: React.FC<EditEstimateModalProps> = ({
  isOpen,
  estimate,
  onClose,
  onRename,
  onOpenInCalculator,
}) => {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (estimate) {
      setName(estimate.name);
      setError("");
    }
  }, [estimate, isOpen]);

  if (!isOpen || !estimate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an estimate name.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      await onRename(estimate.id, name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update estimate name.");
    } finally {
      setIsSaving(false);
    }
  };

  const s = estimate.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#00c2c7]" />
            <h3 className="text-sm font-bold text-white">
              Edit Estimate File Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8ba3c1] hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#ff4d6d]/15 border border-[#ff4d6d]/40 text-[#ffb3c1] text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="text-xs font-semibold text-white block mb-1.5">
              Estimate File Name <span className="text-[#00c2c7]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground Floor Main Beams (GB1-GB12)"
              className="w-full h-10 px-3 bg-[#0e1624] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-xl text-xs text-white placeholder-[#8ba3c1] outline-none transition"
              autoFocus
            />
          </div>

          {/* File Snapshot Metadata */}
          <div className="bg-[#121a2b] border border-[#2d4a6a]/70 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#8ba3c1] pb-2 border-b border-[#2d4a6a]/60">
              <span className="flex items-center gap-1.5 uppercase font-mono text-[10px]">
                <FileText className="w-3.5 h-3.5 text-[#00c2c7]" />
                Module: <strong className="text-white">{estimate.type.toUpperCase()}</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-[#f5a623]" />
                {new Date(estimate.date).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8ba3c1] flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-[#2ecc71]" /> Total Estimated Cost:
              </span>
              <span className="text-sm font-bold text-[#2ecc71]">
                ৳ {Math.round(estimate.totalCost).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Material quantities summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2">
              {(s.cementBags || s.totalCementBags) && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Cement</div>
                  <div className="text-[11px] font-bold text-[#f5a623]">
                    {s.cementBags || s.totalCementBags} bags
                  </div>
                </div>
              )}
              {(s.totalSteel || s.totalSteelKg) && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Rebar Steel</div>
                  <div className="text-[11px] font-bold text-[#00c2c7]">
                    {s.totalSteel || s.totalSteelKg} kg
                  </div>
                </div>
              )}
              {(s.sandCft || s.sandVolume || s.totalSandCft) && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Sand</div>
                  <div className="text-[11px] font-bold text-[#f1f5f9]">
                    {Math.round(s.sandCft || s.sandVolume || s.totalSandCft || 0)} cft
                  </div>
                </div>
              )}
              {(s.aggCft || s.aggregateVolume || s.totalAggCft) && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Aggregates</div>
                  <div className="text-[11px] font-bold text-[#f1f5f9]">
                    {Math.round(s.aggCft || s.aggregateVolume || s.totalAggCft || 0)} cft
                  </div>
                </div>
              )}
              {(s.totalBricks || s.brickQty) && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Bricks</div>
                  <div className="text-[11px] font-bold text-[#e67e22]">
                    {(s.totalBricks || s.brickQty).toLocaleString()} pcs
                  </div>
                </div>
              )}
              {s.tiles && (
                <div className="bg-[#1a2b42] rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-[#8ba3c1]">Tiles</div>
                  <div className="text-[11px] font-bold text-[#1abc9c]">
                    {s.tiles} tiles
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#2d4a6a]">
            <button
              type="button"
              onClick={() => {
                onOpenInCalculator(estimate);
                onClose();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-[#00c2c7] border border-[#00c2c7]/40 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Calculator</span>
            </button>

            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8ba3c1] hover:text-white hover:bg-[#243b55] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-[#00c2c7]/20 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSaving ? "Saving..." : "Save Name"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
