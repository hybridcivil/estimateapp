import { Project, ProjectEstimateItem } from "../types";
import { createDefaultBuildingEstimates, rescaleEstimatesForStories } from "../utils/buildingSchedule";
import {
  db,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

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

/**
 * Remove undefined values to prevent Firestore serialization errors.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const res: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

/**
 * Fetch all projects from Firestore, with backend and localStorage fallback & sync
 */
export async function fetchProjects(): Promise<Project[]> {
  // 1. Try reading directly from Firestore
  try {
    const colRef = collection(db, "projects");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const firestoreProjects: Project[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        firestoreProjects.push({
          ...data,
          id: docSnap.id,
          estimates: Array.isArray(data.estimates) ? data.estimates : [],
        });
      });

      // Sort by updatedAt descending
      firestoreProjects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      saveLocalProjects(firestoreProjects);
      return firestoreProjects;
    }
  } catch (err) {
    console.warn("Firestore fetch error, falling back to backend/local:", err);
  }

  // 2. Fallback to Express backend
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      const normalized: Project[] = (Array.isArray(data) ? data : []).map((p: any) => ({
        ...p,
        estimates: Array.isArray(p.estimates) ? p.estimates : [],
      }));

      // Seed to Firestore in background if Firestore was empty
      if (normalized.length > 0) {
        syncAllToFirestore(normalized).catch(() => {});
      }

      saveLocalProjects(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Backend fetch failed, using local cache", err);
  }

  // 3. Fallback to localStorage
  const local = getLocalProjects();
  const normalized = (Array.isArray(local) ? local : []).map((p: any) => ({
    ...p,
    estimates: Array.isArray(p.estimates) ? p.estimates : [],
  }));

  if (normalized.length > 0) {
    syncAllToFirestore(normalized).catch(() => {});
  }
  return normalized;
}

/**
 * Helper to sync a batch of projects into Firestore
 */
async function syncAllToFirestore(projects: Project[]) {
  for (const p of projects) {
    try {
      const cleanData = sanitizeForFirestore(p);
      await setDoc(doc(db, "projects", p.id), cleanData, { merge: true });
    } catch {
      // ignore background sync error
    }
  }
}

/**
 * Fetch a single project by ID from Firestore or local cache
 */
export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const docRef = doc(db, "projects", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        ...data,
        id: snap.id,
        estimates: Array.isArray(data.estimates) ? data.estimates : [],
      };
    }
  } catch (err) {
    console.warn("Firestore fetch single project error, trying backend:", err);
  }

  try {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const p = await res.json();
      return {
        ...p,
        estimates: Array.isArray(p.estimates) ? p.estimates : [],
      };
    }
  } catch (err) {
    console.warn("Backend fetch failed, searching local cache", err);
  }

  const local = getLocalProjects();
  const found = local.find((p) => p.id === id);
  if (!found) return null;
  return {
    ...found,
    estimates: Array.isArray(found.estimates) ? found.estimates : [],
  };
}

/**
 * Create a new project, saving to Firestore, backend, and localStorage
 */
export async function createProject(data: {
  name: string;
  client?: string;
  location?: string;
  engineer?: string;
  notes?: string;
  stories?: number;
  includeDefaultList?: boolean;
}): Promise<Project> {
  const parsedStories = data.stories ? Math.max(1, data.stories) : 1;
  const initialEstimates = data.includeDefaultList ? createDefaultBuildingEstimates(parsedStories) : [];

  const projectId = "proj_" + Date.now();
  const newProj: Project = {
    id: projectId,
    name: data.name.trim(),
    client: data.client?.trim() || "Client",
    location: data.location?.trim() || "Bangladesh",
    engineer: data.engineer?.trim() || "Engr. Ashraf",
    notes: data.notes || "",
    stories: parsedStories,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimates: initialEstimates as any,
  };

  // 1. Save to Firestore
  try {
    const cleanData = sanitizeForFirestore(newProj);
    await setDoc(doc(db, "projects", newProj.id), cleanData);
  } catch (err) {
    console.error("Firestore createProject error:", err);
    try {
      handleFirestoreError(err, OperationType.CREATE, `projects/${newProj.id}`);
    } catch {
      // Continue to local/backend fallback
    }
  }

  // 2. Also inform backend if available
  try {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProj),
    });
  } catch (err) {
    console.warn("Backend project sync failed", err);
  }

  // 3. Update localStorage
  const local = getLocalProjects();
  saveLocalProjects([newProj, ...local]);

  return newProj;
}

/**
 * Update project in Firestore, backend, and localStorage
 */
export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const local = getLocalProjects();
  const existingProj = local.find((p) => p.id === id);

  const oldStories = existingProj?.stories || 1;
  const newStories = data.stories !== undefined ? Math.max(1, data.stories) : oldStories;
  let rescaledEstimates = data.estimates || existingProj?.estimates || [];

  if (!data.estimates && newStories !== oldStories && Array.isArray(rescaledEstimates) && rescaledEstimates.length > 0) {
    rescaledEstimates = rescaleEstimatesForStories(rescaledEstimates, newStories, oldStories);
  }

  const mergedProj: Project = {
    ...(existingProj || {
      id,
      name: "Project",
      client: "Client",
      location: "Site",
      engineer: "Engr. Ashraf",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: [],
    }),
    ...data,
    stories: newStories,
    estimates: rescaledEstimates,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update in Firestore
  try {
    const cleanData = sanitizeForFirestore(mergedProj);
    await setDoc(doc(db, "projects", id), cleanData, { merge: true });
  } catch (err) {
    console.error("Firestore updateProject error:", err);
    try {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
    } catch {
      // Continue to local/backend fallback
    }
  }

  // 2. Sync with Express backend
  try {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mergedProj),
    });
  } catch (err) {
    console.warn("Backend update failed", err);
  }

  // 3. Update local cache
  const idx = local.findIndex((p) => p.id === id);
  if (idx !== -1) {
    local[idx] = mergedProj;
  } else {
    local.push(mergedProj);
  }
  saveLocalProjects(local);

  return mergedProj;
}

/**
 * Delete project from Firestore, backend, and localStorage
 */
export async function deleteProject(id: string): Promise<boolean> {
  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, "projects", id));
  } catch (err) {
    console.error("Firestore deleteProject error:", err);
    try {
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
    } catch {
      // Continue
    }
  }

  // 2. Delete from backend
  try {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("Backend delete failed", err);
  }

  // 3. Delete from localStorage
  const local = getLocalProjects().filter((p) => p.id !== id);
  saveLocalProjects(local);

  return true;
}

/**
 * Rename an estimate file inside a project and persist to Firestore
 */
export async function renameEstimate(
  projectId: string,
  estimateId: string,
  newName: string
): Promise<boolean> {
  const local = getLocalProjects();
  const proj = local.find((p) => p.id === projectId);
  if (proj) {
    const est = proj.estimates.find((e) => e.id === estimateId);
    if (est) {
      est.name = newName.trim();
      proj.updatedAt = new Date().toISOString();
      saveLocalProjects(local);

      // Update in Firestore
      try {
        const cleanData = sanitizeForFirestore(proj);
        await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
      } catch (err) {
        console.warn("Firestore renameEstimate error:", err);
      }

      // Backend sync
      try {
        await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
      } catch (err) {
        console.warn("Backend rename sync failed", err);
      }

      return true;
    }
  }
  return false;
}

/**
 * Save an estimate file to the active project and persist to Firestore
 */
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

  const local = getLocalProjects();
  let proj = local.find((p) => p.id === projectId);

  // If not found in local, try fetching
  if (!proj) {
    proj = await fetchProject(projectId) || undefined;
  }

  if (proj) {
    const existingIdx = proj.estimates.findIndex((e) => e.id === estId);
    if (existingIdx !== -1) {
      proj.estimates[existingIdx] = item;
    } else {
      proj.estimates.unshift(item);
    }
    proj.updatedAt = new Date().toISOString();

    // 1. Update in Firestore
    try {
      const cleanData = sanitizeForFirestore(proj);
      await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
    } catch (err) {
      console.error("Firestore saveEstimate error:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `projects/${projectId}`);
      } catch {
        // Fallback
      }
    }

    // 2. Update local storage
    const localIdx = local.findIndex((p) => p.id === projectId);
    if (localIdx !== -1) {
      local[localIdx] = proj;
    } else {
      local.push(proj);
    }
    saveLocalProjects(local);

    // 3. Update backend in background
    try {
      await fetch(`/api/projects/${projectId}/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });
    } catch (err) {
      console.warn("Backend estimate sync error", err);
    }

    return { success: true, estimate: item, message: "Saved to Firebase and local storage" };
  }

  throw new Error("Project not found");
}

/**
 * Delete an estimate file from a project and update Firestore
 */
export async function deleteEstimateFromProject(projectId: string, estimateId: string): Promise<boolean> {
  const local = getLocalProjects();
  const proj = local.find((p) => p.id === projectId);
  if (proj) {
    proj.estimates = proj.estimates.filter((e) => e.id !== estimateId);
    proj.updatedAt = new Date().toISOString();
    saveLocalProjects(local);

    // Update in Firestore
    try {
      const cleanData = sanitizeForFirestore(proj);
      await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
    } catch (err) {
      console.warn("Firestore deleteEstimate error:", err);
    }

    // Backend sync
    try {
      await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Backend delete estimate failed", err);
    }

    return true;
  }
  return false;
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
