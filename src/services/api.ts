import { Project, ProjectEstimateItem } from "../types";

const LOCAL_STORAGE_KEY = "ashraf_civil_studio_projects_v1";

function getLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Local storage read error", e);
  }
  return [];
}

function saveLocalProjects(projects: Project[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Local storage write error", e);
  }
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      saveLocalProjects(data);
      return data;
    }
  } catch (err) {
    console.warn("Backend fetch failed, using local cache", err);
  }
  return getLocalProjects();
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend fetch failed, searching local cache", err);
  }
  const local = getLocalProjects();
  return local.find((p) => p.id === id) || null;
}

export async function createProject(data: {
  name: string;
  client?: string;
  location?: string;
  engineer?: string;
  notes?: string;
}): Promise<Project> {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      const local = getLocalProjects();
      saveLocalProjects([created, ...local]);
      return created;
    }
  } catch (err) {
    console.warn("Backend create failed, creating locally", err);
  }

  // Local fallback
  const newProj: Project = {
    id: "proj_local_" + Date.now(),
    name: data.name,
    client: data.client || "Client",
    location: data.location || "Bangladesh",
    engineer: data.engineer || "Engr. Ashraf",
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimates: [],
  };
  const local = getLocalProjects();
  saveLocalProjects([newProj, ...local]);
  return newProj;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      return updated;
    }
  } catch (err) {
    console.warn("Backend update failed", err);
  }
  return null;
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      const local = getLocalProjects().filter((p) => p.id !== id);
      saveLocalProjects(local);
      return true;
    }
  } catch (err) {
    console.warn("Backend delete failed, removing locally", err);
  }
  const local = getLocalProjects().filter((p) => p.id !== id);
  saveLocalProjects(local);
  return true;
}

export async function saveEstimateToProject(
  projectId: string,
  estimateData: {
    id?: string;
    type: string;
    name: string;
    totalCost: number;
    summary: Record<string, any>;
    data: Record<string, any>;
  }
): Promise<{ success: boolean; estimate: ProjectEstimateItem; message?: string }> {
  try {
    const res = await fetch(`/api/projects/${projectId}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateData),
    });
    if (res.ok) {
      const result = await res.json();
      return result;
    }
  } catch (err) {
    console.warn("Backend save estimate failed, saving locally", err);
  }

  // Local fallback
  const local = getLocalProjects();
  const proj = local.find((p) => p.id === projectId);
  if (proj) {
    const estId = estimateData.id || "est_" + Date.now();
    const item: ProjectEstimateItem = {
      id: estId,
      type: estimateData.type as any,
      name: estimateData.name,
      date: new Date().toISOString(),
      totalCost: estimateData.totalCost,
      summary: estimateData.summary,
      data: estimateData.data,
    };
    const existing = proj.estimates.findIndex((e) => e.id === estId);
    if (existing !== -1) proj.estimates[existing] = item;
    else proj.estimates.unshift(item);
    proj.updatedAt = new Date().toISOString();
    saveLocalProjects(local);
    return { success: true, estimate: item, message: "Saved locally" };
  }

  throw new Error("Project not found");
}

export async function deleteEstimateFromProject(projectId: string, estimateId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
      method: "DELETE",
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn("Backend delete estimate failed", err);
  }
  return true;
}

export async function fetchProjectReport(projectId: string) {
  try {
    const res = await fetch(`/api/projects/${projectId}/report`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend report fetch failed", err);
  }
  return null;
}

export function downloadProjectJson(project: Project) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  const safeName = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  a.setAttribute("download", `${safeName}_estimate.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadEstimateJson(estimate: ProjectEstimateItem, projectName: string) {
  const exportPayload = {
    project: projectName,
    estimate,
    exportedAt: new Date().toISOString(),
    source: "ashraf.ai.studio",
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  const safeName = (estimate.name || "estimate").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  a.setAttribute("download", `${safeName}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
