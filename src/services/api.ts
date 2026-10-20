import { Project, ProjectEstimateItem, AppUser } from "../types";
import { createDefaultBuildingEstimates, rescaleEstimatesForStories } from "../utils/buildingSchedule";
import {
  db,
  auth,
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
  query,
  where,
} from "firebase/firestore";

const LOCAL_STORAGE_KEY = "ashraf_civil_studio_projects_v1";

export function getCurrentActiveUserId(): string | undefined {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  try {
    const raw = localStorage.getItem("ashraf_auth_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.uid) return parsed.uid;
    }
  } catch {}
  return undefined;
}

export function getLocalProjects(userId?: string): Project[] {
  const activeUid = userId || getCurrentActiveUserId();
  try {
    // 1. If activeUid exists, look in user's isolated store
    if (activeUid) {
      const userKey = `ashraf_projects_${activeUid}`;
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    // 2. Fall back to shared LOCAL_STORAGE_KEY
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // 3. Scan all keys in localStorage for any existing projects
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("ashraf_projects_") || k === LOCAL_STORAGE_KEY)) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const p = JSON.parse(val);
            if (Array.isArray(p) && p.length > 0) return p;
          } catch {}
        }
      }
    }
  } catch (e) {
    console.error("Local storage read error", e);
  }
  return [];
}

export function saveLocalProjects(projects: Project[], userId?: string) {
  const activeUid = userId || getCurrentActiveUserId();
  try {
    const serialized = JSON.stringify(projects);
    if (activeUid) {
      localStorage.setItem(`ashraf_projects_${activeUid}`, serialized);
    }
    // Always mirror to active fallback store so lookups never fail
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Local storage write error", e);
  }
}

/**
 * Persist an updated project across all applicable user and fallback localStorage slots
 * to prevent any out-of-sync or missing project states.
 */
export function persistProjectToAllUserStores(updatedProj: Project, targetUserId?: string) {
  const uidsToUpdate = new Set<string>();
  if (targetUserId) uidsToUpdate.add(targetUserId);
  if (updatedProj.ownerId) uidsToUpdate.add(updatedProj.ownerId);
  const activeUid = getCurrentActiveUserId();
  if (activeUid) uidsToUpdate.add(activeUid);

  try {
    for (const uid of uidsToUpdate) {
      const userKey = `ashraf_projects_${uid}`;
      let list: Project[] = [];
      const raw = localStorage.getItem(userKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      const idx = list.findIndex((p) => p.id === updatedProj.id);
      if (idx !== -1) {
        list[idx] = updatedProj;
      } else {
        list.unshift(updatedProj);
      }
      localStorage.setItem(userKey, JSON.stringify(list));
    }

    // Always update shared key
    let fallbackList: Project[] = [];
    const fallbackRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (fallbackRaw) {
      try {
        const parsed = JSON.parse(fallbackRaw);
        if (Array.isArray(parsed)) fallbackList = parsed;
      } catch {}
    }
    const fIdx = fallbackList.findIndex((p) => p.id === updatedProj.id);
    if (fIdx !== -1) {
      fallbackList[fIdx] = updatedProj;
    } else {
      fallbackList.unshift(updatedProj);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallbackList));

    // Update any other keys where this project might exist
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ashraf_projects_")) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const list = JSON.parse(val);
            if (Array.isArray(list)) {
              const pIdx = list.findIndex((p: any) => p.id === updatedProj.id);
              if (pIdx !== -1) {
                list[pIdx] = updatedProj;
                localStorage.setItem(k, JSON.stringify(list));
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.error("persistProjectToAllUserStores error", e);
  }
}

/**
 * Remove a project completely across all user-isolated and fallback localStorage slots
 */
export function deleteProjectFromAllUserStores(projectId: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("ashraf_projects") || k === LOCAL_STORAGE_KEY)) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const list = JSON.parse(val);
            if (Array.isArray(list)) {
              const filtered = list.filter((p: any) => p.id !== projectId);
              localStorage.setItem(k, JSON.stringify(filtered));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.error("deleteProjectFromAllUserStores error", e);
  }
}

export function findProjectInAnyStorage(projectId: string, userId?: string): Project | null {
  const localList = getLocalProjects(userId);
  const directMatch = localList.find((p) => p.id === projectId);
  if (directMatch) return directMatch;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("ashraf_projects") || k === LOCAL_STORAGE_KEY)) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const list = JSON.parse(val);
            if (Array.isArray(list)) {
              const item = list.find((p: any) => p.id === projectId);
              if (item) return item;
            }
          } catch {}
        }
      }
    }
  } catch {}

  return null;
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
 * Fetch projects from Firestore scoped to user (or all projects if admin in admin view),
 * with backend and localStorage fallback & sync.
 * Strict Isolation: Every user only sees their own projects.
 */
export async function fetchProjects(user?: AppUser | null, isAdminView?: boolean): Promise<Project[]> {
  if (!user && !isAdminView) {
    return [];
  }

  // 1. Try reading directly from Firestore if user is authenticated in Firebase
  if (auth.currentUser) {
    try {
      const colRef = collection(db, "projects");
      let q: any = colRef;

      if (user && !isAdminView) {
        // Regular user: strictly query only projects belonging to this user's UID
        q = query(colRef, where("ownerId", "==", user.uid));
      }

    const snapshot = await getDocs(q);
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

      const userLocal = getLocalProjects(user?.uid);
      const mergedProjects = firestoreProjects.map((fProj) => {
        const localMatch = userLocal.find((l) => l.id === fProj.id);
        if (!localMatch) return fProj;

        const localTime = new Date(localMatch.updatedAt || 0).getTime();
        const remoteTime = new Date(fProj.updatedAt || 0).getTime();
        const localEsts = Array.isArray(localMatch.estimates) ? localMatch.estimates : [];
        const remoteEsts = Array.isArray(fProj.estimates) ? fProj.estimates : [];

        // If local has more estimates or is newer, preserve local estimates
        if (localEsts.length > remoteEsts.length || (localEsts.length > 0 && localTime >= remoteTime)) {
          const merged = {
            ...fProj,
            ...localMatch,
            estimates: localEsts,
            updatedAt: localMatch.updatedAt || fProj.updatedAt,
          };
          // Sync merged back to Firestore in background
          try {
            const cleanData = sanitizeForFirestore(merged);
            setDoc(doc(db, "projects", merged.id), cleanData, { merge: true }).catch(() => {});
          } catch {}
          return merged;
        }
        return fProj;
      });

      // Also preserve any local projects not yet present in Firestore
      for (const loc of userLocal) {
        if (!mergedProjects.some((m) => m.id === loc.id)) {
          mergedProjects.push(loc);
          try {
            const cleanData = sanitizeForFirestore(loc);
            setDoc(doc(db, "projects", loc.id), cleanData, { merge: true }).catch(() => {});
          } catch {}
        }
      }

      // Sort by updatedAt descending
      mergedProjects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      saveLocalProjects(mergedProjects, user?.uid);
      return mergedProjects;
    } else if (user && !isAdminView) {
      // User signed in but has no projects in Firestore yet -> check local user store or create their personal starter project
      const userLocal = getLocalProjects(user.uid);
      if (userLocal.length > 0) {
        return userLocal;
      }
      const starter = await createStarterProjectForUser(user);
      return [starter];
    }
  } catch (err) {
    console.warn("Firestore fetch error, falling back to backend/local:", err);
  }
}

  // 2. Fallback to Express backend (strictly filter by user.uid)
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      const normalized: Project[] = (Array.isArray(data) ? data : []).map((p: any) => ({
        ...p,
        estimates: Array.isArray(p.estimates) ? p.estimates : [],
      }));

      if (user && !isAdminView) {
        const userOwned = normalized.filter((p) => p.ownerId === user.uid);
        if (userOwned.length > 0) {
          saveLocalProjects(userOwned, user.uid);
          return userOwned;
        }
      } else if (isAdminView) {
        return normalized;
      }
    }
  } catch (err) {
    console.warn("Backend fetch failed, using local cache", err);
  }

  // 3. Fallback to user-isolated localStorage
  if (user && !isAdminView) {
    const userLocal = getLocalProjects(user.uid);
    if (userLocal.length > 0) {
      return userLocal;
    }
    const starter = await createStarterProjectForUser(user);
    return [starter];
  }

  return [];
}

/**
 * Fetch all projects across all users specifically for Admin Control Center
 */
export async function fetchAllProjectsForAdmin(): Promise<Project[]> {
  try {
    const colRef = collection(db, "projects");
    const snapshot = await getDocs(colRef);
    const list: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      list.push({
        ...data,
        id: docSnap.id,
        estimates: Array.isArray(data.estimates) ? data.estimates : [],
      });
    });
    list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return list;
  } catch (err) {
    console.error("fetchAllProjectsForAdmin error:", err);
    return getLocalProjects();
  }
}

/**
 * Fetch all registered users for Admin Control Center
 */
export async function fetchAllUsersForAdmin(): Promise<AppUser[]> {
  try {
    const colRef = collection(db, "users");
    const snapshot = await getDocs(colRef);
    const list: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AppUser);
    });
    return list;
  } catch (err) {
    console.error("fetchAllUsersForAdmin error:", err);
    return [];
  }
}

/**
 * Helper to auto-create a personalized starter project for a new user
 */
async function createStarterProjectForUser(user: AppUser): Promise<Project> {
  const starterEstimates = createDefaultBuildingEstimates(6);
  const projectId = "proj_" + Date.now();
  const newProj: Project = {
    id: projectId,
    name: `${user.displayName || "Personal"} Tower (G+6 Story)`,
    client: user.displayName || "Client",
    location: "Dhaka, Bangladesh",
    engineer: user.displayName || "Civil Engineer",
    ownerId: user.uid,
    ownerEmail: user.email || undefined,
    ownerName: user.displayName || undefined,
    notes: "Personal multi-storey structural estimation project",
    stories: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimates: starterEstimates as any,
  };

  // 1. Save to Firestore if authenticated in Firebase
  if (auth.currentUser) {
    try {
      const cleanData = sanitizeForFirestore(newProj);
      await setDoc(doc(db, "projects", newProj.id), cleanData);
    } catch (e) {
      console.warn("Could not save starter project to Firestore:", e);
    }
  }

  // 2. Save to user-isolated localStorage
  const userLocal = getLocalProjects(user.uid);
  saveLocalProjects([newProj, ...userLocal], user.uid);

  return newProj;
}

/**
 * Helper to sync a batch of projects into Firestore
 */
async function syncAllToFirestore(projects: Project[]) {
  if (!auth.currentUser) return;
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
  if (auth.currentUser) {
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
export async function createProject(
  data: {
    name: string;
    client?: string;
    location?: string;
    engineer?: string;
    notes?: string;
    stories?: number;
    includeDefaultList?: boolean;
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
  },
  user?: AppUser | null
): Promise<Project> {
  const parsedStories = data.stories ? Math.max(1, data.stories) : 1;
  const initialEstimates = data.includeDefaultList ? createDefaultBuildingEstimates(parsedStories) : [];

  const effectiveOwnerId = data.ownerId || user?.uid || (auth.currentUser ? auth.currentUser.uid : "");
  const projectId = "proj_" + Date.now();
  const newProj: Project = {
    id: projectId,
    name: data.name.trim(),
    client: data.client?.trim() || "Client",
    location: data.location?.trim() || "Bangladesh",
    engineer: data.engineer?.trim() || user?.displayName || "Engr. Ashraf",
    ownerId: effectiveOwnerId || "usr_offline",
    ownerEmail: data.ownerEmail || user?.email || undefined,
    ownerName: data.ownerName || user?.displayName || undefined,
    notes: data.notes || "",
    stories: parsedStories,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimates: initialEstimates as any,
  };

  // 1. Save to Firestore ONLY if an authenticated user exists with matching ownerId
  if (auth.currentUser && effectiveOwnerId && (effectiveOwnerId === auth.currentUser.uid || user?.role === "admin")) {
    try {
      const cleanData = sanitizeForFirestore(newProj);
      await setDoc(doc(db, "projects", newProj.id), cleanData);
    } catch (err) {
      console.warn("Firestore createProject sync notice:", err);
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

  // 3. Update user-isolated localStorage
  if (user?.uid) {
    const userLocal = getLocalProjects(user.uid);
    saveLocalProjects([newProj, ...userLocal], user.uid);
  } else {
    const local = getLocalProjects();
    saveLocalProjects([newProj, ...local]);
  }

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

  // 1. Update in Firestore if authenticated in Firebase
  if (auth.currentUser) {
    try {
      const cleanData = sanitizeForFirestore(mergedProj);
      await setDoc(doc(db, "projects", id), cleanData, { merge: true });
    } catch (err) {
      console.warn("Firestore updateProject notice:", err);
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

  // 3. Update local cache and all user stores
  persistProjectToAllUserStores(mergedProj);

  return mergedProj;
}

/**
 * Delete project from Firestore, backend, and localStorage
 */
export async function deleteProject(id: string): Promise<boolean> {
  // 1. Delete from Firestore only if authenticated in Firebase
  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (err) {
      console.warn("Firestore deleteProject notice:", err);
    }
  }

  // 2. Delete from backend
  try {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("Backend delete failed", err);
  }

  // 3. Delete from localStorage across all user stores and fallback
  deleteProjectFromAllUserStores(id);

  return true;
}

/**
 * Rename an estimate file inside a project and persist to Firestore
 */
export async function renameEstimate(
  projectId: string,
  estimateId: string,
  newName: string,
  projectContext?: Project | null,
  userId?: string
): Promise<boolean> {
  let proj: Project | undefined = (projectContext && projectContext.id === projectId)
    ? { ...projectContext, estimates: Array.isArray(projectContext.estimates) ? [...projectContext.estimates] : [] }
    : (findProjectInAnyStorage(projectId, userId) || undefined);

  if (!proj) {
    proj = (await fetchProject(projectId)) || undefined;
  }

  if (proj) {
    if (!Array.isArray(proj.estimates)) proj.estimates = [];
    const est = proj.estimates.find((e) => e.id === estimateId);
    if (est) {
      est.name = newName.trim();
      proj.updatedAt = new Date().toISOString();
      persistProjectToAllUserStores(proj, userId || proj.ownerId);

      // Update in Firestore if authenticated in Firebase
      if (auth.currentUser) {
        try {
          const cleanData = sanitizeForFirestore(proj);
          await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
        } catch (err) {
          console.warn("Firestore renameEstimate notice:", err);
        }
      }

      // Backend sync
      try {
        await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
      } catch (err) {
        console.warn("Backend rename sync notice:", err);
      }

      return true;
    }
  }
  return false;
}

/**
 * Save an estimate file to the active project and persist to Firestore, backend, and localStorage
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
  },
  projectContext?: Project | null,
  user?: AppUser | null
): Promise<{ success: boolean; estimate: ProjectEstimateItem; project?: Project; message?: string }> {
  const estId = estimateData.id || "est_" + Date.now();
  const item: ProjectEstimateItem = {
    id: estId,
    type: estimateData.type as any,
    name: estimateData.name,
    date: new Date().toISOString(),
    totalCost: Number(estimateData.totalCost) || 0,
    summary: estimateData.summary || {},
    data: estimateData.data || {},
  };

  // 1. Resolve project from context, isolated/shared localStorage, or remote
  let proj: Project | undefined = (projectContext && projectContext.id === projectId)
    ? { ...projectContext, estimates: Array.isArray(projectContext.estimates) ? [...projectContext.estimates] : [] }
    : undefined;

  if (!proj) {
    proj = findProjectInAnyStorage(projectId, user?.uid) || undefined;
  }

  if (!proj) {
    proj = (await fetchProject(projectId)) || undefined;
  }

  // 2. Safe Fallback: if project still not found, never crash with "Project not found"
  if (!proj) {
    const fallbackOwner = user?.uid || getCurrentActiveUserId() || "usr_offline";
    proj = {
      id: projectId,
      name: projectContext?.name || "Civil Engineering Project",
      client: projectContext?.client || "Client",
      location: projectContext?.location || "Bangladesh",
      engineer: projectContext?.engineer || user?.displayName || "Engr. Ashraf",
      ownerId: fallbackOwner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: [],
    };
  }

  if (!Array.isArray(proj.estimates)) {
    proj.estimates = [];
  }

  const existingIdx = proj.estimates.findIndex((e) => e.id === estId);
  if (existingIdx !== -1) {
    proj.estimates[existingIdx] = item;
  } else {
    proj.estimates.unshift(item);
  }
  proj.updatedAt = new Date().toISOString();

  // 3. Persist across all user-isolated and shared local storage keys
  persistProjectToAllUserStores(proj, user?.uid || proj.ownerId);

  // 4. Update in Firestore if user is authenticated in Firebase
  if (auth.currentUser) {
    try {
      const cleanData = sanitizeForFirestore(proj);
      await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
    } catch (err) {
      console.warn("Firestore saveEstimate notice:", err);
    }
  }

  // 5. Update backend in background
  try {
    await fetch(`/api/projects/${projectId}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...estimateData,
        projectName: proj.name,
        ownerId: proj.ownerId,
      }),
    });
  } catch (err) {
    console.warn("Backend estimate sync notice:", err);
  }

  return { success: true, estimate: item, project: proj, message: "Saved successfully!" };
}

/**
 * Delete an estimate file from a project and update Firestore
 */
export async function deleteEstimateFromProject(
  projectId: string,
  estimateId: string,
  projectContext?: Project | null,
  userId?: string
): Promise<boolean> {
  let proj: Project | undefined = (projectContext && projectContext.id === projectId)
    ? { ...projectContext, estimates: Array.isArray(projectContext.estimates) ? [...projectContext.estimates] : [] }
    : (findProjectInAnyStorage(projectId, userId) || undefined);

  if (!proj) {
    proj = (await fetchProject(projectId)) || undefined;
  }

  if (proj) {
    if (!Array.isArray(proj.estimates)) proj.estimates = [];
    proj.estimates = proj.estimates.filter((e) => e.id !== estimateId);
    proj.updatedAt = new Date().toISOString();
    persistProjectToAllUserStores(proj, userId || proj.ownerId);

    // Update in Firestore if authenticated in Firebase
    if (auth.currentUser) {
      try {
        const cleanData = sanitizeForFirestore(proj);
        await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
      } catch (err) {
        console.warn("Firestore deleteEstimate notice:", err);
      }
    }

    // Backend sync
    try {
      await fetch(`/api/projects/${projectId}/estimates/${estimateId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Backend delete estimate notice:", err);
    }

    return true;
  }
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
