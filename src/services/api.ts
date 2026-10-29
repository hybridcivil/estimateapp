import { Project, ProjectEstimateItem, AppUser, UserRole } from "../types";
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
  if (!activeUid) {
    return [];
  }
  try {
    const userKey = `ashraf_projects_${activeUid}`;
    const userRaw = localStorage.getItem(userKey);
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (Array.isArray(parsed)) {
        // Strictly verify projects belong ONLY to this active user
        return parsed.filter((p: Project) => p.ownerId === activeUid);
      }
    }
  } catch (e) {
    console.error("Local storage read error", e);
  }
  return [];
}

export function saveLocalProjects(projects: Project[], userId?: string) {
  const activeUid = userId || getCurrentActiveUserId();
  if (!activeUid) return;
  try {
    const userProjects = projects.filter((p) => p.ownerId === activeUid);
    localStorage.setItem(`ashraf_projects_${activeUid}`, JSON.stringify(userProjects));
  } catch (e) {
    console.error("Local storage write error", e);
  }
}

/**
 * Persist an updated project strictly to the owning user's isolated storage
 */
export function persistProjectToAllUserStores(updatedProj: Project, targetUserId?: string) {
  const effectiveUid = targetUserId || updatedProj.ownerId || getCurrentActiveUserId();

  try {
    if (effectiveUid) {
      const userKey = `ashraf_projects_${effectiveUid}`;
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
    } else {
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
  const activeUid = userId || getCurrentActiveUserId();
  if (activeUid) {
    const localList = getLocalProjects(activeUid);
    const directMatch = localList.find((p) => p.id === projectId && p.ownerId === activeUid);
    if (directMatch) return directMatch;
  }
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

  // 1. Try reading directly from Firestore
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
      // User signed in but has no projects in Firestore yet -> check local user store
      const userLocal = getLocalProjects(user.uid);
      return userLocal;
    }
  } catch (err) {
    console.warn("Firestore fetch error, falling back to backend/local:", err);
  }

  // 2. Fallback to Express backend (strictly filter by user.uid)
  try {
    const backendUrl = (user && !isAdminView) ? `/api/projects?ownerId=${encodeURIComponent(user.uid)}` : "/api/projects";
    const res = await fetch(backendUrl);
    if (res.ok) {
      const data = await res.json();
      const normalized: Project[] = (Array.isArray(data) ? data : []).map((p: any) => ({
        ...p,
        estimates: Array.isArray(p.estimates) ? p.estimates : [],
      }));

      if (user && !isAdminView) {
        const userOwned = normalized.filter((p) => p.ownerId === user.uid);
        saveLocalProjects(userOwned, user.uid);
        return userOwned;
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
    return userLocal;
  }

  return [];
}

/**
 * Calculate the comprehensive total valuation of a project from its estimates or stored totalCost
 */
export function calculateProjectTotalCost(p: Partial<Project> | null | undefined): number {
  if (!p) return 0;
  if (Array.isArray(p.estimates) && p.estimates.length > 0) {
    const sum = p.estimates.reduce((acc, est) => {
      const c =
        Number(est.totalCost) ||
        Number(est.summary?.totalCost) ||
        Number(est.summary?.grandTotal) ||
        Number(est.summary?.multipliedCost) ||
        0;
      return acc + c;
    }, 0);
    if (sum > 0) return Math.round(sum);
  }
  return Number(p.totalCost) || 0;
}

/**
 * Fetch all projects across all users specifically for Admin Control Center
 * Merges Firestore projects, all local engineer workspaces, and backend projects
 * guaranteeing accurate estimates and non-zero project valuation.
 */
export async function fetchAllProjectsForAdmin(): Promise<Project[]> {
  const allProjectsMap = new Map<string, Project>();

  // 1. Gather all projects across all user-isolated localStorage slots & fallback key
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("ashraf_projects") || k === LOCAL_STORAGE_KEY)) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const list = JSON.parse(val);
            if (Array.isArray(list)) {
              for (const p of list) {
                if (p && p.id) {
                  const ests = Array.isArray(p.estimates) ? p.estimates : [];
                  const cost = calculateProjectTotalCost({ ...p, estimates: ests });
                  allProjectsMap.set(p.id, {
                    ...p,
                    estimates: ests,
                    totalCost: cost,
                  });
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Local storage scan for admin notice:", e);
  }

  // 2. Query Firestore projects collection
  try {
    const colRef = collection(db, "projects");
    const snapshot = await getDocs(colRef);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const remoteEsts = Array.isArray(data.estimates) ? data.estimates : [];
      const existing = allProjectsMap.get(docSnap.id);

      // Preserve existing local estimates if local has more or remote is empty
      let finalEsts = remoteEsts;
      if (existing && Array.isArray(existing.estimates) && existing.estimates.length > remoteEsts.length) {
        finalEsts = existing.estimates;
      }

      const mergedProj: Project = {
        ...existing,
        ...data,
        id: docSnap.id,
        estimates: finalEsts,
      };

      mergedProj.totalCost = calculateProjectTotalCost(mergedProj);
      allProjectsMap.set(docSnap.id, mergedProj);
    });
  } catch (err) {
    console.warn("fetchAllProjectsForAdmin Firestore notice:", err);
  }

  // 3. Fallback to /api/projects backend if available
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const backendProjects = await res.json();
      if (Array.isArray(backendProjects)) {
        for (const bp of backendProjects) {
          if (bp && bp.id) {
            const existing = allProjectsMap.get(bp.id);
            const ests = (existing && Array.isArray(existing.estimates) && existing.estimates.length > (bp.estimates?.length || 0))
              ? existing.estimates
              : (Array.isArray(bp.estimates) ? bp.estimates : []);
            const proj: Project = {
              ...existing,
              ...bp,
              estimates: ests,
            };
            proj.totalCost = calculateProjectTotalCost(proj);
            allProjectsMap.set(bp.id, proj);
          }
        }
      }
    }
  } catch {}

  const result = Array.from(allProjectsMap.values());
  result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return result;
}

const USERS_REGISTRY_KEY = "ashraf_registered_users_registry";

export function getLocalRegisteredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalRegisteredUser(user: AppUser) {
  try {
    const list = getLocalRegisteredUsers();
    const key = (user.email || user.uid).toLowerCase();
    const idx = list.findIndex((u) => (u.email && u.email.toLowerCase() === key) || u.uid === user.uid);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.unshift(user);
    }
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(list));
  } catch {}
}

export async function syncUserToAllStores(user: AppUser) {
  saveLocalRegisteredUser(user);

  // 1. Sync to backend
  try {
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }).catch(() => {});
  } catch {}

  // 2. Sync to Firestore (always saves user profile for both Google & registered workspace accounts)
  try {
    const docRef = doc(db, "users", user.uid);
    const cleanUser: any = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "Civil Engineer",
      role: user.role || "engineer",
      authProvider: user.authProvider || (user.photoURL ? "google" : "email_password"),
      lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    };
    if (user.photoURL) cleanUser.photoURL = user.photoURL;
    if (user.createdAt) cleanUser.createdAt = user.createdAt;
    if (user.password) cleanUser.password = user.password;
    setDoc(docRef, cleanUser, { merge: true }).catch((e) => {
      console.warn("Firestore user sync notice:", e);
    });
  } catch {}
}

/**
 * Fetch all registered users for Admin Control Center
 * Gathers from Firestore, Express backend /api/users, local registry,
 * and synthesizes owners from all existing projects so every registered engineer is visible.
 */
export async function fetchAllUsersForAdmin(): Promise<AppUser[]> {
  const userMap = new Map<string, AppUser>();

  const addOrMergeUser = (u: Partial<AppUser>) => {
    if (!u) return;
    const email = u.email ? u.email.trim().toLowerCase() : null;
    const uid = u.uid || (email ? "usr_" + email.replace(/[^a-z0-9]/g, "_") : undefined);
    if (!email && !uid) return;

    const key = (email || uid)!.toLowerCase();
    const existing = userMap.get(key);

    const isBootstrapAdmin = email === "engrkalilinux@gmail.com";
    const role: UserRole = isBootstrapAdmin
      ? "admin"
      : (u.role === "admin" || existing?.role === "admin"
          ? "admin"
          : u.role === "viewer" || existing?.role === "viewer"
          ? "viewer"
          : "editor");
    const displayName =
      u.displayName ||
      existing?.displayName ||
      (email
        ? email.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Civil Engineer");

    const authProvider: "google" | "email_password" =
      u.authProvider ||
      existing?.authProvider ||
      (u.photoURL ? "google" : "email_password");

    userMap.set(key, {
      uid: existing?.uid || uid || key,
      email: existing?.email || email || null,
      displayName,
      photoURL: u.photoURL || existing?.photoURL || null,
      role,
      authProvider,
      password: u.password || existing?.password,
      createdAt: existing?.createdAt || u.createdAt || new Date().toISOString(),
      lastLoginAt: u.lastLoginAt || existing?.lastLoginAt || new Date().toISOString(),
    });
  };

  // 1. From local registry & current session
  try {
    const localUsers = getLocalRegisteredUsers();
    localUsers.forEach(addOrMergeUser);

    const currentSessionRaw = localStorage.getItem("ashraf_auth_session");
    if (currentSessionRaw) {
      addOrMergeUser(JSON.parse(currentSessionRaw));
    }
  } catch {}

  // 2. From Firestore users collection
  try {
    const colRef = collection(db, "users");
    const snapshot = await getDocs(colRef);
    snapshot.forEach((docSnap) => {
      addOrMergeUser(docSnap.data() as AppUser);
    });
  } catch (err) {
    console.warn("Firestore fetchAllUsers notice:", err);
  }

  // 3. From Express backend /api/users
  try {
    const res = await fetch("/api/users");
    if (res.ok) {
      const backendUsers = await res.json();
      if (Array.isArray(backendUsers)) {
        backendUsers.forEach(addOrMergeUser);
      }
    }
  } catch {}

  // 4. Discover any user accounts from all existing projects
  try {
    const allProjs = await fetchAllProjectsForAdmin();
    for (const p of allProjs) {
      const pEmail = p.ownerEmail?.trim().toLowerCase();
      const pUid = p.ownerId;
      if (pEmail || pUid) {
        addOrMergeUser({
          uid: pUid || (pEmail ? "usr_" + pEmail.replace(/[^a-z0-9]/g, "_") : undefined),
          email: pEmail || null,
          displayName: p.ownerName || p.engineer || (pEmail ? pEmail.split("@")[0] : "Civil Engineer"),
          role: pEmail === "engrkalilinux@gmail.com" ? "admin" : (pEmail && userMap.get(pEmail)?.role) || "editor",
          createdAt: p.createdAt,
          lastLoginAt: p.updatedAt,
        });
      }
    }
  } catch {}

  const result = Array.from(userMap.values());
  result.sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
  return result;
}

/**
 * Assign / update user role (admin, editor, viewer) across all data stores.
 * - Updates Express backend /api/users/:uid/role
 * - Updates Firestore users collection
 * - Updates local registered users cache & current session if matching
 */
export async function updateUserRoleInAllStores(
  userKeyOrUid: string,
  newRole: UserRole,
  userEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const isBootstrap = userEmail?.toLowerCase() === "engrkalilinux@gmail.com";
    const finalRole: UserRole = isBootstrap ? "admin" : (newRole === "engineer" ? "editor" : newRole);

    // 1. Update Express backend
    try {
      await fetch(`/api/users/${encodeURIComponent(userKeyOrUid)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: finalRole }),
      });
    } catch (err) {
      console.warn("Backend user role update notice:", err);
    }

    // 2. Update Firestore users collection
    try {
      if (userKeyOrUid) {
        const userDocRef = doc(db, "users", userKeyOrUid);
        await setDoc(userDocRef, { role: finalRole, updatedAt: new Date().toISOString() }, { merge: true });
      }
      if (userEmail) {
        const cleanEmail = userEmail.trim().toLowerCase();
        const emailDocRef = doc(db, "users", "usr_" + cleanEmail.replace(/[^a-z0-9]/g, "_"));
        await setDoc(emailDocRef, { role: finalRole, updatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (err) {
      console.warn("Firestore user role update notice:", err);
    }

    // 3. Update local storage registry
    try {
      const localUsers = getLocalRegisteredUsers();
      let updated = false;
      const updatedList = localUsers.map((u) => {
        const matches =
          (userKeyOrUid && u.uid === userKeyOrUid) ||
          (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === userKeyOrUid.toLowerCase());
        if (matches) {
          updated = true;
          return { ...u, role: finalRole };
        }
        return u;
      });
      if (updated) {
        localStorage.setItem("ashraf_registered_users", JSON.stringify(updatedList));
      }

      // Check current active session
      const currentSessionRaw = localStorage.getItem("ashraf_auth_session");
      if (currentSessionRaw) {
        const sessionUser = JSON.parse(currentSessionRaw);
        const matchesSession =
          (userKeyOrUid && sessionUser.uid === userKeyOrUid) ||
          (userEmail && sessionUser.email && sessionUser.email.toLowerCase() === userEmail.toLowerCase()) ||
          (sessionUser.email && sessionUser.email.toLowerCase() === userKeyOrUid.toLowerCase());
        if (matchesSession) {
          sessionUser.role = finalRole;
          localStorage.setItem("ashraf_auth_session", JSON.stringify(sessionUser));
        }
      }
    } catch (err) {
      console.warn("Local storage role update notice:", err);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update user role:", err);
    return { success: false, error: err.message || "Failed to update role" };
  }
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
    engineer: data.engineer?.trim() || user?.displayName || "Anonymous",
    ownerId: effectiveOwnerId || "usr_offline",
    ownerEmail: data.ownerEmail || user?.email || undefined,
    ownerName: data.ownerName || user?.displayName || undefined,
    notes: data.notes || "",
    stories: parsedStories,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimates: initialEstimates as any,
    totalCost: 0,
  };
  newProj.totalCost = calculateProjectTotalCost(newProj);

  // 1. Save to Firestore for all users
  if (effectiveOwnerId) {
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
export async function updateProject(
  id: string,
  data: Partial<Project>,
  user?: AppUser | null,
  projectContext?: Project | null
): Promise<Project | null> {
  const activeUid = user?.uid || getCurrentActiveUserId();
  const local = getLocalProjects(activeUid);
  const existingProj =
    (projectContext && projectContext.id === id)
      ? projectContext
      : (local.find((p) => p.id === id) || findProjectInAnyStorage(id, activeUid));

  const oldStories = existingProj?.stories || 1;
  const newStories = data.stories !== undefined ? Math.max(1, data.stories) : oldStories;
  let rescaledEstimates = data.estimates || existingProj?.estimates || [];

  if (newStories !== oldStories && Array.isArray(rescaledEstimates) && rescaledEstimates.length > 0) {
    rescaledEstimates = rescaleEstimatesForStories(rescaledEstimates, newStories, oldStories);
  }

  const mergedProj: Project = {
    ...(existingProj || {
      id,
      name: "Project",
      client: "Client",
      location: "Site",
      engineer: "Anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: [],
    }),
    ...data,
    stories: newStories,
    estimates: rescaledEstimates,
    updatedAt: new Date().toISOString(),
  };
  mergedProj.totalCost = calculateProjectTotalCost(mergedProj);

  // 1. Update in Firestore
  try {
    const cleanData = sanitizeForFirestore(mergedProj);
    await setDoc(doc(db, "projects", id), cleanData, { merge: true });
  } catch (err) {
    console.warn("Firestore updateProject notice:", err);
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
  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, "projects", id));
  } catch (err) {
    console.warn("Firestore deleteProject notice:", err);
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
      engineer: projectContext?.engineer || user?.displayName || "Anonymous",
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
  proj.totalCost = calculateProjectTotalCost(proj);

  // 3. Persist across all user-isolated and shared local storage keys
  persistProjectToAllUserStores(proj, user?.uid || proj.ownerId);

  // 4. Update in Firestore
  try {
    const cleanData = sanitizeForFirestore(proj);
    await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
  } catch (err) {
    console.warn("Firestore saveEstimate notice:", err);
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
    proj.totalCost = calculateProjectTotalCost(proj);
    persistProjectToAllUserStores(proj, userId || proj.ownerId);

    // Update in Firestore
    try {
      const cleanData = sanitizeForFirestore(proj);
      await setDoc(doc(db, "projects", projectId), cleanData, { merge: true });
    } catch (err) {
      console.warn("Firestore deleteEstimate notice:", err);
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
  const clientPrefix = (project.client || "client").trim().replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const safeProject = project.name.trim().replace(/[^a-z0-9]/gi, "_").toLowerCase();
  a.setAttribute("download", `${clientPrefix}_estimate_${safeProject}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadEstimateJson(estimate: ProjectEstimateItem, projectName: string, clientName?: string) {
  const exportPayload = {
    project: projectName,
    client: clientName || "Client",
    estimate,
    exportedAt: new Date().toISOString(),
    source: "dolphinbox.ai.studio",
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  const clientPrefix = clientName && clientName.trim()
    ? clientName.trim().replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_estimate_"
    : "";
  const safeName = (estimate.name || "estimate").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  a.setAttribute("download", `${clientPrefix}${safeName}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
