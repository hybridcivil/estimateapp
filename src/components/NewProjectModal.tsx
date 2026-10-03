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
  }) => Promise<void>;
  initialProject?: Project | null;
  onUpdateProject?: (id: string, data: {
    name: string;
    client: string;
    location: string;
    engineer: string;
    notes?: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || "");
      setClient(initialProject.client || "");
      setLocation(initialProject.location || "");
      setEngineer(initialProject.engineer || "Engr. Ashraf");
      setNotes(initialProject.notes || "");
    } else {
      setName("");
      setClient("");
      setLocation("");
      setEngineer("Engr. Ashraf");
      setNotes("");
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
      if (isEditing && initialProject && onUpdateProject) {
        await onUpdateProject(initialProject.id, {
          name: name.trim(),
          client: client.trim(),
          location: location.trim(),
          engineer: engineer.trim(),
          notes: notes.trim(),
        });
      } else if (onCreateProject) {
        await onCreateProject({
          name: name.trim(),
          client: client.trim(),
          location: location.trim(),
          engineer: engineer.trim(),
          notes: notes.trim(),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex items-center justify-between">
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
            className="text-[#8ba3c1] hover:text-white transition p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-[#ff4d6d]/15 border border-[#ff4d6d]/40 text-[#ffb3c1] text-xs rounded-xl">
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
              className="w-full h-10 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
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
                className="w-full h-9 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs text-[#8ba3c1] block mb-1">Site Location</label>
              <input
                type="text"
                placeholder="e.g. Dhanmondi, Dhaka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-9 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8ba3c1] block mb-1">Assigned Civil Engineer</label>
            <input
              type="text"
              placeholder="Engr. Ashraf"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              className="w-full h-9 px-3 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs text-[#8ba3c1] block mb-1">Notes / Structural Codes</label>
            <textarea
              rows={2}
              placeholder="Design codes (BNBC 2020 / ACI 318), soil report data, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#0e1624] border border-[#2d4a6a] rounded-xl text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2d4a6a]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8ba3c1] hover:text-white hover:bg-[#243b55] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00c2c7] to-[#00a8ad] hover:from-[#00b2b7] text-[#0f1c2e] transition shadow-lg shadow-[#00c2c7]/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
