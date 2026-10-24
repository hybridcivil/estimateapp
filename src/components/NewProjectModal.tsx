import React, { useState, useEffect } from "react";
import { X, FolderPlus, Edit3, Check } from "lucide-react";
import { Project } from "../types";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject?: (data: {
    name: string;
    client: string;
    location: string;
    engineer: string;
    notes?: string;
    stories?: number;
    includeDefaultList?: boolean;
  }) => Promise<void>;
  initialProject?: Project | null;
  onUpdateProject?: (id: string, data: {
    name: string;
    client: string;
    location: string;
    engineer: string;
    notes?: string;
    stories?: number;
  }) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  initialProject,
  onUpdateProject,
}) => {
  const isEditing = Boolean(initialProject);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [engineer, setEngineer] = useState("Engr. Ashraf");
  const [notes, setNotes] = useState("");
  const [stories, setStories] = useState<number | string>(1);
  const [includeDefaultList, setIncludeDefaultList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || "");
      setClient(initialProject.client || "");
      setLocation(initialProject.location || "");
      setEngineer(initialProject.engineer || "Engr. Ashraf");
      setNotes(initialProject.notes || "");
      setStories(initialProject.stories || 1);
      setIncludeDefaultList(false);
    } else {
      setName("");
      setClient("");
      setLocation("");
      setEngineer("Engr. Ashraf");
      setNotes("");
      setStories(1);
      setIncludeDefaultList(true);
    }
    setError("");
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const parsedStories = Math.max(1, Number(stories) || 1);
      if (isEditing && initialProject && onUpdateProject) {
        await onUpdateProject(initialProject.id, {
          name: name.trim(),
          client: client.trim(),
          location: location.trim(),
          engineer: engineer.trim(),
          notes: notes.trim(),
          stories: parsedStories,
        });
      } else if (onCreateProject) {
        await onCreateProject({
          name: name.trim(),
          client: client.trim(),
          location: location.trim(),
          engineer: engineer.trim(),
          notes: notes.trim(),
          stories: parsedStories,
          includeDefaultList,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (isEditing ? "Failed to update project" : "Failed to create project"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] my-auto overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header (Sticky) */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="w-4 h-4 text-[#00c2c7]" />
            ) : (
              <FolderPlus className="w-4 h-4 text-[#00c2c7]" />
            )}
            <h3 className="text-sm font-bold text-white">
              {isEditing ? "Edit Project Details" : "Create New Civil Project"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8ba3c1] hover:text-white transition p-1 rounded-lg cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-3 custom-scrollbar">
            {error && (
              <div className="p-2.5 bg-[#ff4d6d]/15 border border-[#ff4d6d]/40 text-[#ffb3c1] text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#f1f5f9] block mb-1">
                Project Name <span className="text-[#00c2c7]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ashraf Commercial Tower"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs text-[#8ba3c1] block mb-1">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Properties Ltd."
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs text-[#8ba3c1] block mb-1">Site Location</label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi, Dhaka"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
                />
              </div>
            </div>

            {/* Building Storeys / Number of Floors */}
            <div className="bg-[#0e1624] border border-[#2d4a6a] rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-semibold text-[#f1f5f9] flex items-center gap-1.5">
                  <span>🏢 Building Storeys / Floors</span>
                  <span className="text-[10px] text-[#00c2c7] font-bold">
                    (Multi-Storey Multiplier)
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stories}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setStories("");
                      } else {
                        const cleaned = raw.replace(/[^0-9]/g, "");
                        setStories(cleaned);
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseInt(String(stories), 10);
                      if (isNaN(parsed) || parsed < 1) {
                        setStories(1);
                      } else {
                        setStories(Math.min(100, parsed));
                      }
                    }}
                    className="w-14 h-7 text-center font-bold text-xs bg-[#1a2b42] border border-[#00c2c7] rounded-lg text-[#00c2c7] outline-none"
                    placeholder="1"
                  />
                  <span className="text-[11px] text-[#8ba3c1]">Floors</span>
                </div>
              </div>

              {/* Quick storey presets */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-[#8ba3c1] mr-1">Presets:</span>
                {[
                  { count: 1, label: "1 (Single)" },
                  { count: 2, label: "2 (Duplex)" },
                  { count: 3, label: "3 Storey" },
                  { count: 4, label: "4 (G+3)" },
                  { count: 5, label: "5 (G+4)" },
                  { count: 6, label: "6 (G+5)" },
                  { count: 7, label: "7 (G+6)" },
                  { count: 10, label: "10 Storey" },
                ].map((preset) => (
                  <button
                    key={preset.count}
                    type="button"
                    onClick={() => setStories(preset.count)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                      Number(stories) === preset.count
                        ? "bg-[#00c2c7] text-[#0f1c2e] font-bold"
                        : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border border-[#2d4a6a]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#8ba3c1] mt-1 leading-snug">
                All floor estimates (beams, columns, slabs, stairs, brickwork, tiles) can be multiplied automatically across these storeys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs text-[#8ba3c1] block mb-1">Assigned Civil Engineer</label>
                <input
                  type="text"
                  placeholder="Engr. Ashraf"
                  value={engineer}
                  onChange={(e) => setEngineer(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs text-[#8ba3c1] block mb-1">Notes / Structural Codes</label>
                <input
                  type="text"
                  placeholder="BNBC 2020 / ACI 318, soil data, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
                />
              </div>
            </div>

            {/* Option to choose between Empty Project vs Pre-loaded Building Elements */}
            {!isEditing && (
              <div className="bg-[#0e1624] border border-[#2d4a6a] rounded-xl p-2.5 sm:p-3 space-y-2">
                <label className="text-xs font-semibold text-white block">Project Estimate Files Initial Setup</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeDefaultList(false)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition flex items-start gap-2 cursor-pointer ${
                      !includeDefaultList
                        ? "border-[#00c2c7] bg-[#00c2c7]/10 text-white"
                        : "border-[#2d4a6a] bg-[#152033] text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      !includeDefaultList ? "border-[#00c2c7] bg-[#00c2c7]" : "border-[#8ba3c1]"
                    }`}>
                      {!includeDefaultList && <div className="w-1.5 h-1.5 rounded-full bg-[#0f1c2e]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Clean Empty Project</div>
                      <div className="text-[10px] text-[#8ba3c1] mt-0.5 leading-tight">
                        Start fresh with 0 files. Add your own calculations.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeDefaultList(true)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition flex items-start gap-2 cursor-pointer ${
                      includeDefaultList
                        ? "border-[#00c2c7] bg-[#00c2c7]/10 text-white"
                        : "border-[#2d4a6a] bg-[#152033] text-[#8ba3c1] hover:text-white"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      includeDefaultList ? "border-[#00c2c7] bg-[#00c2c7]" : "border-[#8ba3c1]"
                    }`}>
                      {includeDefaultList && <div className="w-1.5 h-1.5 rounded-full bg-[#0f1c2e]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1 flex-wrap">
                        <span>Pre-load 7 Elements</span>
                        <span className="text-[9px] bg-[#00c2c7]/20 text-[#00c2c7] px-1 rounded font-mono font-bold">
                          ×{Math.max(1, Number(stories) || 1)}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8ba3c1] mt-0.5 leading-tight">
                        Adds Beams, Columns, Footings, Slabs, Stairs, Bricks & Tiles.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons (Sticky Footer) */}
          <div className="px-4 py-3 bg-[#1a2b42]/90 border-t border-[#2d4a6a] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#8ba3c1] hover:text-white hover:bg-[#243b55] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] transition shadow-lg shadow-[#00c2c7]/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {loading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update Project"
                  : "Create Project"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
