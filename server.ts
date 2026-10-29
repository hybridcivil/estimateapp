import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createDefaultBuildingEstimates, rescaleEstimatesForStories } from "./src/utils/buildingSchedule";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

import { Project, ProjectEstimateItem, AppUser } from "./src/types";

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readUsers(): AppUser[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const list: AppUser[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeUsers(users: AppUser[]) {
  ensureDataFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function readProjects(): Project[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const list: Project[] = JSON.parse(raw);
    let mutated = false;
    for (const p of list) {
      const stories = p.stories ? Math.max(1, p.stories) : 1;
      // Auto-synchronize estimates if multiplier doesn't match project stories
      if (Array.isArray(p.estimates) && p.estimates.length > 0) {
        const mismatchEst = p.estimates.find((e) => {
          const isFoundation = e.type === "footing" || e.type === "situ_pile" || e.type === "sand_pile";
          const isGradeBeam =
            e.type === "beam" &&
            (e.data?.beamSubtype === "grade_beam" ||
              e.summary?.beamSubtype === "grade_beam" ||
              e.name?.toLowerCase().includes("grade") ||
              e.name?.toLowerCase().includes("gb"));
          const isShortCol =
            e.type === "column" &&
            (e.data?.colMode === "short" ||
              e.summary?.colMode === "short" ||
              e.name?.toLowerCase().includes("short"));
          if (isFoundation || isGradeBeam || isShortCol) return false;
          const m = e.summary?.multiplier || e.data?.multiplier;
          return m !== undefined && m !== stories;
        });
        if (mismatchEst) {
          const currentMult = mismatchEst.summary?.multiplier || mismatchEst.data?.multiplier || 1;
          p.estimates = rescaleEstimatesForStories(p.estimates, stories, currentMult);
          mutated = true;
        }
      }
    }
    if (mutated) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
    }
    return list;
  } catch (err) {
    console.error("Error reading projects:", err);
    return [];
  }
}

function writeProjects(projects: Project[]) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

// ---------------- API ROUTES ----------------

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Dolphin Box",
    platform: "dolphinbox.ai.studio",
    timestamp: new Date().toISOString(),
  });
});

// List all registered users (combining explicit user registrations and project owners)
app.get("/api/users", (_req, res) => {
  try {
    const storedUsers = readUsers();
    const projects = readProjects();
    const userMap = new Map<string, AppUser>();

    // 1. Add stored users
    for (const u of storedUsers) {
      if (u && (u.uid || u.email)) {
        const key = (u.email || u.uid).toLowerCase();
        userMap.set(key, {
          ...u,
          authProvider: u.authProvider || (u.photoURL ? "google" : "email_password"),
        });
      }
    }

    // 2. Discover owners from projects
    for (const p of projects) {
      const email = p.ownerEmail?.trim().toLowerCase();
      const uid = p.ownerId || (email ? "usr_" + email.replace(/[^a-z0-9]/g, "_") : undefined);
      if (email || uid) {
        const key = (email || uid)!.toLowerCase();
        const existing = userMap.get(key);
        const isBootstrapAdmin = email === "engrkalilinux@gmail.com";
        const role = isBootstrapAdmin
          ? "admin"
          : (existing?.role === "viewer" ? "viewer" : existing?.role === "admin" ? "admin" : "editor");
        const displayName =
          p.ownerName ||
          p.engineer ||
          existing?.displayName ||
          (email ? email.split("@")[0] : "Civil Engineer");

        userMap.set(key, {
          uid: existing?.uid || uid || key,
          email: existing?.email || email || null,
          displayName: existing?.displayName || displayName,
          photoURL: existing?.photoURL || null,
          role,
          authProvider: existing?.authProvider || (existing?.photoURL ? "google" : "email_password"),
          createdAt: existing?.createdAt || p.createdAt || new Date().toISOString(),
          lastLoginAt: existing?.lastLoginAt || p.updatedAt || new Date().toISOString(),
        });
      }
    }

    const allUsers = Array.from(userMap.values());
    allUsers.sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register or update user in backend store
app.post("/api/users", (req, res) => {
  try {
    const { uid, email, displayName, photoURL, role, authProvider, password } = req.body;
    if (!uid && !email) {
      res.status(400).json({ error: "uid or email is required" });
      return;
    }
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const isBootstrapAdmin = cleanEmail === "engrkalilinux@gmail.com";
    const assignedRole = isBootstrapAdmin
      ? "admin"
      : role === "admin"
      ? "admin"
      : role === "viewer"
      ? "viewer"
      : "editor";
    const now = new Date().toISOString();

    const storedUsers = readUsers();
    const key = (cleanEmail || uid).toLowerCase();
    const existingIdx = storedUsers.findIndex(
      (u) => (u.email && u.email.toLowerCase() === key) || u.uid === uid
    );

    const effectiveAuthProvider =
      authProvider ||
      (existingIdx !== -1 && storedUsers[existingIdx].authProvider
        ? storedUsers[existingIdx].authProvider
        : photoURL
        ? "google"
        : "email_password");

    const updatedUser: AppUser = {
      uid: uid || (existingIdx !== -1 ? storedUsers[existingIdx].uid : ("usr_" + (cleanEmail ? cleanEmail.replace(/[^a-z0-9]/g, "_") : Date.now()))),
      email: cleanEmail || (existingIdx !== -1 ? storedUsers[existingIdx].email : null),
      displayName: displayName || (existingIdx !== -1 ? storedUsers[existingIdx].displayName : (cleanEmail ? cleanEmail.split("@")[0] : "Civil Engineer")),
      photoURL: photoURL !== undefined ? photoURL : (existingIdx !== -1 ? storedUsers[existingIdx].photoURL : null),
      role: assignedRole,
      authProvider: effectiveAuthProvider,
      password: password || (existingIdx !== -1 ? storedUsers[existingIdx].password : undefined),
      createdAt: existingIdx !== -1 && storedUsers[existingIdx].createdAt ? storedUsers[existingIdx].createdAt : now,
      lastLoginAt: now,
    };

    if (existingIdx !== -1) {
      storedUsers[existingIdx] = updatedUser;
    } else {
      storedUsers.unshift(updatedUser);
    }

    writeUsers(storedUsers);
    res.status(200).json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role (assign editor / viewer / admin)
app.patch("/api/users/:uid/role", (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;
    if (!["admin", "editor", "viewer", "engineer"].includes(role)) {
      res.status(400).json({ error: "Invalid role. Role must be admin, editor, or viewer." });
      return;
    }
    const cleanRole = role === "engineer" ? "editor" : role;
    const storedUsers = readUsers();
    const idx = storedUsers.findIndex(
      (u) => u.uid === uid || (u.email && u.email.toLowerCase() === uid.toLowerCase())
    );
    if (idx !== -1) {
      if (storedUsers[idx].email?.toLowerCase() === "engrkalilinux@gmail.com") {
        storedUsers[idx].role = "admin";
      } else {
        storedUsers[idx].role = cleanRole;
      }
      storedUsers[idx].lastLoginAt = new Date().toISOString();
      writeUsers(storedUsers);
      res.json(storedUsers[idx]);
      return;
    }
    res.status(404).json({ error: "User not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all projects (support filtering by ownerId)
app.get("/api/projects", (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const includeAll = req.query.all === "true";
    let projects = readProjects();
    if (ownerId) {
      projects = projects.filter((p) => p.ownerId === ownerId);
    } else if (!includeAll) {
      projects = [];
    }
    const enriched = projects.map((p) => {
      const estimates = Array.isArray(p.estimates) ? p.estimates : [];
      const totalCost = estimates.reduce((sum, est) => sum + (Number(est.totalCost) || 0), 0);
      return {
        ...p,
        estimates,
        estimatesCount: estimates.length,
        totalCost,
        estimateTypes: Array.from(new Set(estimates.map((e) => e.type))),
      };
    });
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new project
app.post("/api/projects", (req, res) => {
  try {
    const { id, name, client, location, engineer, notes, stories, includeDefaultList, ownerId, ownerEmail, ownerName } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }
    const projects = readProjects();
    const parsedStories = Math.max(1, parseInt(stories, 10) || 1);
    const initialEstimates = includeDefaultList ? createDefaultBuildingEstimates(parsedStories) : [];

    const targetId = id || ("proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
    const existingIdx = projects.findIndex((p) => p.id === targetId);

    const projectData: Project = {
      id: targetId,
      name: name.trim(),
      client: (client || "Client").trim(),
      location: (location || "Bangladesh").trim(),
      engineer: (engineer || "Anonymous").trim(),
      ownerId: ownerId || undefined,
      ownerEmail: ownerEmail || undefined,
      ownerName: ownerName || undefined,
      notes: notes || "",
      stories: parsedStories,
      createdAt: existingIdx !== -1 ? projects[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: (existingIdx !== -1 && projects[existingIdx].estimates?.length > 0)
        ? projects[existingIdx].estimates
        : (initialEstimates as any),
    };

    if (existingIdx !== -1) {
      projects[existingIdx] = projectData;
    } else {
      projects.unshift(projectData);
    }

    writeProjects(projects);
    res.status(201).json(projectData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single project
app.get("/api/projects/:id", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update project metadata
app.put("/api/projects/:id", (req, res) => {
  try {
    const projects = readProjects();
    const idx = projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const { name, client, location, engineer, notes, stories, rates, estimates } = req.body;
    if (rates !== undefined) projects[idx].rates = rates;
    if (Array.isArray(estimates)) projects[idx].estimates = estimates;
    if (name) projects[idx].name = name.trim();
    if (client !== undefined) projects[idx].client = client.trim();
    if (location !== undefined) projects[idx].location = location.trim();
    if (engineer !== undefined) projects[idx].engineer = engineer.trim();
    if (notes !== undefined) projects[idx].notes = notes;
    if (stories !== undefined) {
      const oldStories = projects[idx].stories || 1;
      const newStories = Math.max(1, parseInt(stories, 10) || 1);
      projects[idx].stories = newStories;

      // Rescale and synchronize all estimates to match the new storey count
      if (newStories !== oldStories && Array.isArray(projects[idx].estimates) && projects[idx].estimates.length > 0) {
        projects[idx].estimates = rescaleEstimatesForStories(
          projects[idx].estimates as any,
          newStories,
          oldStories
        ) as any;
      }
    }
    projects[idx].updatedAt = new Date().toISOString();
    writeProjects(projects);
    res.json(projects[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project (idempotent)
app.delete("/api/projects/:id", (req, res) => {
  try {
    let projects = readProjects();
    projects = projects.filter((p) => p.id !== req.params.id);
    writeProjects(projects);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save or update an estimate within a project
app.post("/api/projects/:id/estimates", (req, res) => {
  try {
    const projects = readProjects();
    let projIdx = projects.findIndex((p) => p.id === req.params.id);

    const { id, type, name, totalCost, summary, data, projectName, ownerId } = req.body;
    if (!type) {
      res.status(400).json({ error: "Estimate type is required" });
      return;
    }

    if (projIdx === -1) {
      // Upsert project if not yet present on backend
      const autoProject: Project = {
        id: req.params.id,
        name: projectName || "Civil Engineering Project",
        client: "Client",
        location: "Bangladesh",
        engineer: "Anonymous",
        ownerId: ownerId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimates: [],
      };
      projects.unshift(autoProject);
      projIdx = 0;
    }

    const project = projects[projIdx];
    if (!Array.isArray(project.estimates)) {
      project.estimates = [];
    }

    const estimateId = id || "est_" + type + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const existingIdx = project.estimates.findIndex((e) => e.id === estimateId);

    const newEstimateItem: ProjectEstimateItem = {
      id: estimateId,
      type,
      name: (name || `${type.toUpperCase()} Estimate - ${new Date().toLocaleDateString()}`).trim(),
      date: new Date().toISOString(),
      totalCost: Number(totalCost) || 0,
      summary: summary || {},
      data: data || {},
    };

    if (existingIdx !== -1) {
      project.estimates[existingIdx] = newEstimateItem;
    } else {
      project.estimates.unshift(newEstimateItem);
    }

    project.updatedAt = new Date().toISOString();
    writeProjects(projects);

    res.status(200).json({
      success: true,
      message: existingIdx !== -1 ? "Estimate updated successfully" : "Estimate saved to project",
      estimate: newEstimateItem,
      projectSummary: {
        id: project.id,
        name: project.name,
        totalEstimates: project.estimates.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full update of a specific estimate
app.put("/api/projects/:id/estimates/:estimateId", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!Array.isArray(project.estimates)) {
      project.estimates = [];
    }
    const existingIdx = project.estimates.findIndex((e) => e.id === req.params.estimateId);
    const { type, name, totalCost, summary, data } = req.body;

    const updatedItem: ProjectEstimateItem = {
      id: req.params.estimateId,
      type: type || (existingIdx !== -1 ? project.estimates[existingIdx].type : "beam"),
      name: (name || (existingIdx !== -1 ? project.estimates[existingIdx].name : "Updated Estimate")).trim(),
      date: new Date().toISOString(),
      totalCost: Number(totalCost) !== undefined && !isNaN(Number(totalCost)) ? Number(totalCost) : (existingIdx !== -1 ? project.estimates[existingIdx].totalCost : 0),
      summary: summary || (existingIdx !== -1 ? project.estimates[existingIdx].summary : {}),
      data: data || (existingIdx !== -1 ? project.estimates[existingIdx].data : {}),
    };

    if (existingIdx !== -1) {
      project.estimates[existingIdx] = updatedItem;
    } else {
      project.estimates.unshift(updatedItem);
    }

    project.updatedAt = new Date().toISOString();
    writeProjects(projects);

    res.status(200).json({
      success: true,
      message: "Estimate updated successfully",
      estimate: updatedItem,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rename or update estimate metadata
app.patch("/api/projects/:id/estimates/:estimateId", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const est = project.estimates.find((e) => e.id === req.params.estimateId);
    if (!est) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    if (req.body.name && req.body.name.trim()) {
      est.name = req.body.name.trim();
    }
    if (req.body.notes !== undefined) {
      (est as any).notes = req.body.notes;
    }
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
    res.json({ success: true, message: "Estimate updated", estimate: est });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an estimate from a project
app.delete("/api/projects/:id/estimates/:estimateId", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const initialLen = project.estimates.length;
    project.estimates = project.estimates.filter((e) => e.id !== req.params.estimateId);
    if (project.estimates.length === initialLen) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
    res.json({ success: true, message: "Estimate removed from project" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export full project JSON file
app.get("/api/projects/:id/export", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const safeName = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_estimate.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(project, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import project from JSON
app.post("/api/projects/import", (req, res) => {
  try {
    const importedProject = req.body;
    if (!importedProject || !importedProject.name) {
      res.status(400).json({ error: "Invalid project data. Must include project name." });
      return;
    }
    const projects = readProjects();
    const newProject: Project = {
      id: "proj_imp_" + Date.now(),
      name: (importedProject.name + " (Imported)").trim(),
      client: importedProject.client || "Client",
      location: importedProject.location || "Location",
      engineer: importedProject.engineer || "Anonymous",
      notes: importedProject.notes || "Imported estimate file",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: Array.isArray(importedProject.estimates)
        ? importedProject.estimates.map((e: any) => ({
            ...e,
            id: "est_" + (e.type || "calc") + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
          }))
        : [],
    };
    projects.unshift(newProject);
    writeProjects(projects);
    res.status(201).json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comprehensive Bill of Quantities (BOQ) Rollup Report
app.get("/api/projects/:id/report", (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    let totalCost = 0;
    let totalCementBags = 0;
    let totalSandCft = 0;
    let totalAggCft = 0;
    let totalPicketBricks = 0;
    let totalSteelKg = 0;
    let totalBricks = 0;
    let totalWetVol = 0;
    let totalDryVol = 0;
    let tileCost = 0;

    project.estimates.forEach((est) => {
      totalCost += Number(est.totalCost) || 0;
      const s = est.summary || {};
      if (s.cementBags) totalCementBags += Number(s.cementBags) || 0;
      if (s.sandCft) totalSandCft += Number(s.sandCft) || 0;
      if (s.aggCft) totalAggCft += Number(s.aggCft) || 0;
      if (s.picketBricks || s.brickQty) totalPicketBricks += Number(s.picketBricks || s.brickQty) || 0;
      if (s.totalSteelKg || s.totalSteel) totalSteelKg += Number(s.totalSteelKg || s.totalSteel) || 0;
      if (s.totalBricks) totalBricks += Number(s.totalBricks) || 0;
      if (s.wetVolCft || s.wetVol) totalWetVol += Number(s.wetVolCft || s.wetVol) || 0;
      if (s.dryVolCft || s.dryVol) totalDryVol += Number(s.dryVolCft || s.dryVol) || 0;
      if (est.type === "tiles") tileCost += Number(est.totalCost) || 0;
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        client: project.client,
        location: project.location,
        engineer: project.engineer,
        notes: project.notes,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      estimatesCount: project.estimates.length,
      totals: {
        totalCost,
        totalCementBags: Math.ceil(totalCementBags),
        totalSandCft: Number(totalSandCft.toFixed(1)),
        totalAggCft: Number(totalAggCft.toFixed(1)),
        totalPicketBricks: Math.ceil(totalPicketBricks),
        totalSteelKg: Number(totalSteelKg.toFixed(1)),
        totalBricks: Math.ceil(totalBricks),
        totalWetVolCft: Number(totalWetVol.toFixed(1)),
        totalDryVolCft: Number(totalDryVol.toFixed(1)),
        tileCost,
      },
      estimates: project.estimates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- VITE & STATIC HANDLING ----------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dolphin Box running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
