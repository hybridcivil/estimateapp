import React, { useState, useEffect } from "react";
import { ProjectEstimateItem } from "../types";
import { X, Edit3, ExternalLink, Calendar, Receipt, FileText, Check } from "lucide-react";
import { extractItemMaterials } from "../utils/reportBreakdown";

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

            {/* All Materials Takeoff & Specification Section */}
            {(() => {
              const mat = extractItemMaterials(estimate);
              const isFoundation = estimate.type === "footing" || estimate.type === "situ_pile" || estimate.type === "sand_pile";
              const hasSteelBreakdown = Object.keys(mat.steelBreakdown).length > 0;
              return (
                <div className="space-y-2 pt-2 border-t border-[#2d4a6a]/60">
                  <div className="text-[11px] font-bold text-[#00c2c7] flex items-center justify-between">
                    <span>All Item Materials Takeoff</span>
                    <span className="text-[10px] text-[#8ba3c1] font-mono">
                      {isFoundation ? "1× Foundation Substructure (Used Once)" : mat.isMultiplying ? `${mat.multiplier} Storeys Multiplier` : "Single Floor Baseline"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {/* Cement */}
                    {mat.cementBags > 0 && (
                      <div className="bg-[#1a2b42] border border-[#f5a623]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Cement</div>
                        <div className="text-xs font-bold text-[#f5a623]">
                          {mat.cementBags} bags
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          ৳ {mat.cementCost.toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {/* Sand */}
                    {mat.sandCft > 0 && (
                      <div className="bg-[#1a2b42] border border-[#f1f5f9]/20 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Sand</div>
                        <div className="text-xs font-bold text-[#f1f5f9]">
                          {mat.sandCft} cft
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          ৳ {mat.sandCost.toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {/* Aggregates (Stone or Khoa) */}
                    {mat.aggCft > 0 && (
                      <div className="bg-[#1a2b42] border border-[#38bdf8]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">
                          {mat.aggType === "brick_khoa" ? "Khoa Agg" : "Stone Agg"}
                        </div>
                        <div className="text-xs font-bold text-[#38bdf8]">
                          {mat.aggCft} cft
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          ৳ {mat.aggCost.toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {/* Rebar Steel */}
                    {mat.steelKg > 0 && (
                      <div className="bg-[#1a2b42] border border-[#00c2c7]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Rebar Steel</div>
                        <div className="text-xs font-bold text-[#00c2c7]">
                          {mat.steelKg.toLocaleString("en-IN")} kg
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          ৳ {mat.steelCost.toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {/* Bricks */}
                    {mat.bricksPcs > 0 && (
                      <div className="bg-[#1a2b42] border border-[#e67e22]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Bricks</div>
                        <div className="text-xs font-bold text-[#e67e22]">
                          {mat.bricksPcs.toLocaleString("en-IN")} pcs
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          ৳ {mat.brickCost.toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {/* Tiles */}
                    {mat.tilesPcs > 0 && (
                      <div className="bg-[#1a2b42] border border-[#1abc9c]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Tiles</div>
                        <div className="text-xs font-bold text-[#1abc9c]">
                          {mat.tilesPcs.toLocaleString("en-IN")} pcs
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          {mat.tilesBoxes} boxes ({mat.tileAreaSqft} sqft)
                        </div>
                      </div>
                    )}

                    {/* Concrete Volume */}
                    {(mat.wetVolCft > 0 || mat.dryVolCft > 0) && (
                      <div className="bg-[#1a2b42] border border-[#c4b5fd]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Concrete Vol</div>
                        <div className="text-xs font-bold text-[#c4b5fd]">
                          {mat.wetVolCft || mat.dryVolCft} cft
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          Dry: {mat.dryVolCft || (mat.wetVolCft * 1.54).toFixed(1)} cft
                        </div>
                      </div>
                    )}

                    {/* Piles / Boring */}
                    {mat.pilesCount > 0 && (
                      <div className="bg-[#1a2b42] border border-[#f43f5e]/30 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-[#8ba3c1] uppercase font-mono">Piles & Depth</div>
                        <div className="text-xs font-bold text-[#f43f5e]">
                          {mat.pilesCount} Piles
                        </div>
                        <div className="text-[9px] text-[#8ba3c1]/80">
                          {mat.boringRft} rft depth ({mat.pileDiameterIn}" dia)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Steel Diameter Schedule if available */}
                  {hasSteelBreakdown && (
                    <div className="bg-[#0e1624] border border-[#2d4a6a]/60 rounded-lg p-2 space-y-1">
                      <div className="text-[10px] font-semibold text-[#8ba3c1] flex items-center justify-between">
                        <span>Steel Rebar Diameter Breakdown:</span>
                        <span className="text-[#00c2c7] font-bold">Total: {mat.steelKg} kg</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(mat.steelBreakdown).map(([dia, w]) => (
                          <span
                            key={dia}
                            className="bg-[#1a2b42] border border-[#00c2c7]/40 text-white px-2 py-0.5 rounded text-[10px] font-mono"
                          >
                            <strong>Ø{dia}mm:</strong> {w} kg
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specifications & Notes */}
                  {mat.specifications.length > 0 && (
                    <div className="bg-[#0e1624] border border-[#2d4a6a]/60 rounded-lg p-2 text-[10px] text-[#8ba3c1] space-y-0.5">
                      <div className="font-semibold text-white/90">Item Specifications:</div>
                      {mat.specifications.map((spec, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#00c2c7]" />
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
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
