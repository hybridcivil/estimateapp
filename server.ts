import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");

interface ProjectEstimateItem {
  id: string;
  type: "beam" | "column" | "footing" | "slab" | "stair" | "brick" | "tiles" | "structural";
  name: string;
  date: string;
  totalCost: number;
  summary: Record<string, any>;
  data: Record<string, any>;
}

interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  engineer: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimates: ProjectEstimateItem[];
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const defaultProjects: Project[] = [
      {
        id: "proj_default_1",
        name: "Ashraf Tower (G+6 Story Residential)",
        client: "Engr. Ashraf & Associates",
        location: "Dhanmondi, Dhaka",
        engineer: "Engr. Ashraf",
        notes: "Complete structural & civil estimation with 1:1.5:3 concrete mix and 500W rebar.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimates: [
          {
            id: "est_beam_01",
            type: "beam",
            name: "Ground Floor Grade Beams (GB1-GB8)",
            date: new Date().toISOString(),
            totalCost: 184500,
            summary: {
              cementBags: 68,
              sandCft: 128,
              aggCft: 255,
              totalSteelKg: 1140,
              wetVolCft: 165.5,
              dryVolCft: 267.4,
              totalCost: 184500,
              currency: "৳",
            },
            data: {
              beams: [
                {
                  nos: 8,
                  name: "GB1",
                  width: 12,
                  depth: 18,
                  length: 22,
                  stirrupSpacing: 6,
                  mix: "1:1.5:3",
                  mainBars: [
                    { dia: 16, qty: 3 },
                    { dia: 20, qty: 2 },
                  ],
                  extraTopBars: { nos: 2, dia: 16, length: 7.33 },
                  extraBottomBars: { nos: 2, dia: 16, length: 11 },
                },
              ],
              rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
              baseType: "none",
            },
          },
          {
            id: "est_col_01",
            type: "column",
            name: "Main Columns C1-C12 (12x15)",
            date: new Date().toISOString(),
            totalCost: 215400,
            summary: {
              cementBags: 74,
              sandCft: 139,
              aggCft: 278,
              totalSteelKg: 1380,
              wetVolCft: 180,
              dryVolCft: 291,
              totalCost: 215400,
              currency: "৳",
            },
            data: {
              columns: [
                {
                  nos: 12,
                  name: "C1",
                  type: "rectangular",
                  category: "long",
                  size: "12x15",
                  height: 10,
                  rebars: [
                    { dia: 16, nos: 4 },
                    { dia: 20, nos: 4 },
                  ],
                  mix: "1:1.5:3",
                  stirrupDia: 10,
                  stirrupSpacing: 6,
                },
              ],
              rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
              baseType: "none",
            },
          },
          {
            id: "est_footing_01",
            type: "footing",
            name: "Isolated Footings F1-F8",
            date: new Date().toISOString(),
            totalCost: 268900,
            summary: {
              cementBags: 112,
              sandCft: 210,
              aggCft: 420,
              totalSteelKg: 1420,
              wetVolCft: 272,
              dryVolCft: 440,
              totalCost: 268900,
              currency: "৳",
            },
            data: {
              footings: [
                {
                  nos: 8,
                  name: "F1",
                  length: 7.5,
                  breadth: 7.5,
                  thickness: 1.5,
                  cover: 0.25,
                  hook: 0.5,
                  mix: "1:1.5:3",
                  rebars: [
                    { role: "bottom", dia: 16, spacing: 5 },
                    { role: "top", dia: 12, spacing: 6 },
                  ],
                },
              ],
              rates: { cementRate: 550, sandRate: 45, aggRate: 120, steelRate: 95 },
              baseType: "none",
            },
          },
        ],
      },
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultProjects, null, 2), "utf-8");
  }
}

function readProjects(): Project[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
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
    app: "Ashraf Civil Studio",
    platform: "ashraf.ai.studio",
    timestamp: new Date().toISOString(),
  });
});

// List all projects
app.get("/api/projects", (_req, res) => {
  try {
    const projects = readProjects();
    const summaries = projects.map((p) => {
      const totalCost = p.estimates.reduce((sum, est) => sum + (Number(est.totalCost) || 0), 0);
      return {
        id: p.id,
        name: p.name,
        client: p.client,
        location: p.location,
        engineer: p.engineer,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        estimatesCount: p.estimates.length,
        totalCost,
        estimateTypes: Array.from(new Set(p.estimates.map((e) => e.type))),
      };
    });
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new project
app.post("/api/projects", (req, res) => {
  try {
    const { name, client, location, engineer, notes } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }
    const projects = readProjects();
    const newProject: Project = {
      id: "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      client: (client || "Ashraf AI Studio Client").trim(),
      location: (location || "Bangladesh").trim(),
      engineer: (engineer || "Engr. Ashraf").trim(),
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimates: [],
    };
    projects.unshift(newProject);
    writeProjects(projects);
    res.status(201).json(newProject);
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
    const { name, client, location, engineer, notes } = req.body;
    if (name) projects[idx].name = name.trim();
    if (client !== undefined) projects[idx].client = client.trim();
    if (location !== undefined) projects[idx].location = location.trim();
    if (engineer !== undefined) projects[idx].engineer = engineer.trim();
    if (notes !== undefined) projects[idx].notes = notes;
    projects[idx].updatedAt = new Date().toISOString();
    writeProjects(projects);
    res.json(projects[idx]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project
app.delete("/api/projects/:id", (req, res) => {
  try {
    let projects = readProjects();
    const initialLen = projects.length;
    projects = projects.filter((p) => p.id !== req.params.id);
    if (projects.length === initialLen) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
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
    const projIdx = projects.findIndex((p) => p.id === req.params.id);
    if (projIdx === -1) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { id, type, name, totalCost, summary, data } = req.body;
    if (!type) {
      res.status(400).json({ error: "Estimate type is required" });
      return;
    }

    const project = projects[projIdx];
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
      engineer: importedProject.engineer || "Engr. Ashraf",
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
    console.log(`Ashraf Civil Studio running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
