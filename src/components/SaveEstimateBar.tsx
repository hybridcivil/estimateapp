import React, { useState } from "react";
import { Project, ProjectEstimateItem, EstimateType } from "../types";
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  Copy,
  PlusCircle,
  Edit,
  X,
} from "lucide-react";
import { downloadEstimateJson } from "../services/api";
import { ConfirmModal } from "./common/ConfirmModal";

interface SaveEstimateBarProps {
  type: EstimateType;
  typeLabel: string;
  activeProject: Project | null;
  currentEstimateName: string;
  setCurrentEstimateName: (name: string) => void;
  currentEstimateId?: string | null;
  onSave: () => Promise<void>;
  onSaveAsCopy?: () => Promise<void>;
  onClearEstimate?: () => void;
  onLoadEstimate: (est: ProjectEstimateItem) => void;
  onDeleteEstimate: (estId: string) => Promise<void>;
  getCurrentPayload: () => { summary: Record<string, any>; data: Record<string, any>; totalCost: number };
  onImportPayload: (payload: any) => void;
}

export const SaveEstimateBar: React.FC<SaveEstimateBarProps> = ({
  type,
  typeLabel,
  activeProject,
  currentEstimateName,
  setCurrentEstimateName,
  currentEstimateId,
  onSave,
  onSaveAsCopy,
  onClearEstimate,
  onLoadEstimate,
  onDeleteEstimate,
  getCurrentPayload,
  onImportPayload,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // In-app delete confirmation state
  const [estimateToDelete, setEstimateToDelete] = useState<ProjectEstimateItem | null>(null);

  const relevantEstimates =
    activeProject && Array.isArray(activeProject.estimates)
      ? activeProject.estimates.filter((e) => e.type === type)
      : [];

  const handleSaveClick = async () => {
    if (!activeProject) {
      setErrorNotice("Please select or create a project first!");
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }
    if (!currentEstimateName.trim()) {
      setErrorNotice("Please enter an estimate file name");
      setTimeout(() => setErrorNotice(null), 3000);
      return;
    }

    try {
      setIsSaving(true);
      await onSave();
      setSaveSuccessNotice(
        currentEstimateId
          ? `Updated "${currentEstimateName}" successfully!`
          : `Saved "${currentEstimateName}" to project!`
      );
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to save estimate");
      setTimeout(() => setErrorNotice(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCopyClick = async () => {
    if (!activeProject) return;
    try {
      setIsSaving(true);
      if (onSaveAsCopy) {
        await onSaveAsCopy();
      } else {
        await onSave();
      }
      setSaveSuccessNotice(`Saved new copy of "${currentEstimateName}"!`);
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to save copy");
      setTimeout(() => setErrorNotice(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportClick = () => {
    const payload = getCurrentPayload();
    const mockEstimate: ProjectEstimateItem = {
      id: currentEstimateId || "est_" + Date.now(),
      type,
      name: currentEstimateName || `${typeLabel} Estimate`,
      date: new Date().toISOString(),
      totalCost: payload.totalCost,
      summary: payload.summary,
      data: payload.data,
    };
    downloadEstimateJson(mockEstimate, activeProject ? activeProject.name : "Ashraf_Civil_Studio");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.estimate && json.estimate.data) {
          onImportPayload(json.estimate);
          if (json.estimate.name) setCurrentEstimateName(json.estimate.name);
          setSaveSuccessNotice("Estimate file loaded successfully!");
          setTimeout(() => setSaveSuccessNotice(null), 3000);
        } else if (json.data) {
          onImportPayload(json);
          if (json.name) setCurrentEstimateName(json.name);
          setSaveSuccessNotice("Estimate file loaded successfully!");
          setTimeout(() => setSaveSuccessNotice(null), 3000);
        } else {
          setErrorNotice("Invalid estimate file format");
          setTimeout(() => setErrorNotice(null), 3500);
        }
      } catch (err) {
        setErrorNotice("Failed to parse JSON file");
        setTimeout(() => setErrorNotice(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <div className="bg-[#152033] border-b border-[#2d4a6a] px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
        {/* Left: Project & File Name & Edit Status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#8ba3c1] shrink-0 bg-[#0e1624] px-2 py-1 rounded-lg border border-[#2d4a6a]">
            <span className="text-[#00c2c7] font-bold">Project:</span>
            <span className="text-white font-medium truncate max-w-[130px]">
              {activeProject ? activeProject.name : "None"}
            </span>
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-md">
            <input
              type="text"
              value={currentEstimateName}
              onChange={(e) => setCurrentEstimateName(e.target.value)}
              placeholder={`Name this ${typeLabel} file (e.g. Ground Floor ${typeLabel})`}
              className="w-full bg-[#0e1624] border border-[#2d4a6a] focus:border-[#00c2c7] text-[#f1f5f9] rounded-lg px-2.5 py-1.5 text-xs outline-none transition"
            />
          </div>

          {/* Active File indicator pill */}
          {currentEstimateId && (
            <div className="hidden lg:flex items-center gap-1.5 bg-[#00c2c7]/15 text-[#00c2c7] border border-[#00c2c7]/40 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">
              <Edit className="w-3 h-3" />
              <span>Editing File</span>
              {onClearEstimate && (
                <button
                  type="button"
                  onClick={onClearEstimate}
                  className="hover:text-white ml-1 text-xs"
                  title="Close file & start new estimate"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end overflow-x-auto no-scrollbar">
          {/* Main Save / Update Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 ${
              currentEstimateId
                ? "bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#34d375] hover:to-[#2ecc71] text-[#0f1c2e]"
                : "bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e]"
            }`}
            title={currentEstimateId ? "Update existing estimate file" : "Save as new estimate file"}
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSaving
                ? "Saving..."
                : currentEstimateId
                ? "Update File"
                : "Save File"}
            </span>
          </button>

          {/* Save as New Copy (when editing) */}
          {currentEstimateId && onSaveAsCopy && (
            <button
              type="button"
              onClick={handleSaveCopyClick}
              disabled={isSaving}
              className="flex items-center gap-1 bg-[#1e2d45] hover:bg-[#243b55] text-white border border-[#2d4a6a] px-2.5 py-1.5 rounded-lg font-medium text-xs transition active:scale-95"
              title="Save a new duplicate copy without overwriting"
            >
              <Copy className="w-3 h-3 text-[#f5a623]" />
              <span className="hidden sm:inline">Save Copy</span>
            </button>
          )}

          {/* New / Clear File button */}
          {currentEstimateId && onClearEstimate && (
            <button
              type="button"
              onClick={onClearEstimate}
              className="flex items-center gap-1 bg-[#1e2d45] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border border-[#2d4a6a] px-2.5 py-1.5 rounded-lg font-medium text-xs transition active:scale-95"
              title="Start a fresh calculation"
            >
              <PlusCircle className="w-3 h-3 text-[#00c2c7]" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}

          {/* Open / Load Saved Files */}
          <button
            type="button"
            onClick={() => setShowLoadModal(true)}
            className="flex items-center gap-1.5 bg-[#1e2d45] hover:bg-[#243b55] text-[#f1f5f9] border border-[#2d4a6a] px-2.5 py-1.5 rounded-lg font-medium text-xs transition active:scale-95 relative"
            title="Open saved estimate files"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#f5a623]" />
            <span>Open</span>
            {relevantEstimates.length > 0 && (
              <span className="bg-[#f5a623] text-[#0f1c2e] text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {relevantEstimates.length}
              </span>
            )}
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportClick}
            className="flex items-center gap-1 bg-[#1e2d45] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border border-[#2d4a6a] p-1.5 rounded-lg text-xs transition active:scale-95"
            title="Download Estimate JSON File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Import JSON */}
          <label
            className="flex items-center gap-1 bg-[#1e2d45] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border border-[#2d4a6a] p-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
            title="Upload/Import Estimate JSON File"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Save / Error Toast Banners */}
      {saveSuccessNotice && (
        <div className="bg-[#2ecc71]/20 border-b border-[#2ecc71]/40 text-[#2ecc71] px-3 py-1.5 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saveSuccessNotice}</span>
          </div>
          <span className="text-[10px] text-[#8ba3c1]">{new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {errorNotice && (
        <div className="bg-[#ff4d6d]/20 border-b border-[#ff4d6d]/40 text-[#ffb3c1] px-3 py-1.5 text-xs flex items-center gap-1.5 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Saved Estimates Picker Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d4a6a] mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#00c2c7]" />
                  Saved {typeLabel} Estimate Files
                </h3>
                <p className="text-[11px] text-[#8ba3c1] mt-0.5">
                  Project: <strong className="text-white">{activeProject?.name || "No Project"}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-[#8ba3c1] hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {relevantEstimates.length === 0 ? (
                <div className="text-center py-8 text-[#8ba3c1] text-xs">
                  <FileText className="w-8 h-8 mx-auto text-[#2d4a6a] mb-2" />
                  No saved {typeLabel.toLowerCase()} estimates yet in this project.
                  <p className="text-[10px] text-[#8ba3c1]/70 mt-1">
                    Fill the form and click "Save File" above.
                  </p>
                </div>
              ) : (
                relevantEstimates.map((est) => {
                  const isCurrent = est.id === currentEstimateId;
                  return (
                    <div
                      key={est.id}
                      className={`bg-[#1a2b42] border rounded-xl p-3 flex items-center justify-between gap-3 transition ${
                        isCurrent
                          ? "border-[#00c2c7] bg-[#00c2c7]/5 shadow-sm"
                          : "border-[#2d4a6a] hover:border-[#00c2c7]/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-xs truncate">
                            {est.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-[#00c2c7]/20 text-[#00c2c7] px-1.5 py-0.2 rounded font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#8ba3c1] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#f5a623]" />
                            {new Date(est.date).toLocaleDateString()}
                          </span>
                          <span className="text-[#2ecc71] font-semibold">
                            ৳ {Math.round(est.totalCost).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadEstimate(est);
                            setCurrentEstimateName(est.name);
                            setShowLoadModal(false);
                            setSaveSuccessNotice(`Loaded: "${est.name}"`);
                            setTimeout(() => setSaveSuccessNotice(null), 2500);
                          }}
                          className="bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadEstimateJson(est, activeProject?.name || "Ashraf")}
                          className="bg-[#243b55] hover:bg-[#2d4a6a] text-[#8ba3c1] hover:text-white p-1.5 rounded-lg text-xs transition"
                          title="Download JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstimateToDelete(est)}
                          className="bg-[#ff4d6d]/15 hover:bg-[#ff4d6d]/30 text-[#ff4d6d] p-1.5 rounded-lg text-xs transition"
                          title="Delete estimate file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#2d4a6a] mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLoadModal(false)}
                className="bg-[#243b55] hover:bg-[#2d4a6a] text-white px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirm modal for deleting estimate from modal */}
      <ConfirmModal
        isOpen={Boolean(estimateToDelete)}
        title="Delete Estimate File"
        message={`Are you sure you want to permanently delete "${estimateToDelete?.name}"? This calculation file will be removed from project "${activeProject?.name}".`}
        confirmLabel="Delete File"
        onConfirm={async () => {
          if (estimateToDelete) {
            await onDeleteEstimate(estimateToDelete.id);
            setEstimateToDelete(null);
          }
        }}
        onClose={() => setEstimateToDelete(null)}
      />
    </>
  );
};
