import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: {
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
}) => {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [engineer, setEngineer] = useState("Engr. Ashraf");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      await onCreateProject({
        name: name.trim(),
        client: client.trim(),
        location: location.trim(),
        engineer: engineer.trim(),
        notes: notes.trim(),
      });
      setName("");
      setClient("");
      setLocation("");
      setNotes("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#00c2c7]" />
            <h3 className="text-sm font-bold text-white">Create New Civil Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8ba3c1] hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-[#ff4d6d]/15 border border-[#ff4d6d] text-[#ffb3c1] text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#f1f5f9] block mb-1">
              Project Name <span className="text-[#ff4d6d]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5-Storey Ashraf Tower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#8ba3c1] block mb-1">Client Name</label>
              <input
                type="text"
                placeholder="e.g. Modern Builders Ltd."
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full h-9 px-3 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[#8ba3c1] block mb-1">Site Location</label>
              <input
                type="text"
                placeholder="e.g. Uttara, Dhaka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-9 px-3 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8ba3c1] block mb-1">Assigned Engineer</label>
            <input
              type="text"
              placeholder="Engineer in charge"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              className="w-full h-9 px-3 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-[#8ba3c1] block mb-1">Notes / Description</label>
            <textarea
              rows={2}
              placeholder="Structural requirements, design codes (BNBC/ACI), etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#243b55] border border-[#2d4a6a] rounded-lg text-xs text-white placeholder-[#8ba3c1] focus:border-[#00c2c7] focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d4a6a]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8ba3c1] hover:text-white hover:bg-[#243b55] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
