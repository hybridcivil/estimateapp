export type EstimateType =
  | "dashboard"
  | "beam"
  | "column"
  | "footing"
  | "slab"
  | "stair"
  | "brick"
  | "tiles"
  | "structural";

export interface ProjectEstimateItem {
  id: string;
  type: EstimateType;
  name: string;
  date: string;
  totalCost: number;
  summary: Record<string, any>;
  data: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  engineer: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimates: ProjectEstimateItem[];
  estimatesCount?: number;
  totalCost?: number;
}

export interface MaterialRates {
  cementRate: number;
  sandRate: number;
  aggRate: number;
  steelRate: number;
  brickRate: number;
  bricksPerCft: number;
  baseType: "none" | "picket";
}

export interface BeamItem {
  nos: number;
  name: string;
  width: number;
  depth: number;
  length: number;
  stirrupSpacing: number;
  mix: string;
  mainBars: { dia: number; qty: number }[];
  extraTopBars: { nos: number; dia: number; length: number };
  extraBottomBars: { nos: number; dia: number; length: number };
}

export interface ColumnItem {
  nos: number;
  name: string;
  type: "rectangular" | "circular";
  category: "long" | "short";
  size: string;
  height: number;
  rebars: { dia: number; nos: number }[];
  mix: string;
  stirrupDia: number;
  stirrupSpacing: number;
}

export interface FootingItem {
  nos: number;
  name: string;
  length: number;
  breadth: number;
  thickness: number;
  cover: number;
  hook: number;
  rebars: { role: string; dia: number; spacing: number }[];
  mix: string;
}

export interface SlabConfig {
  length: number;
  width: number;
  thickness: number;
  mixRatio: string;
  mainBar: number;
  spacing: number;
  distBar: number;
  distSpacing: number;
  extraBar: number;
  extraBarsNum: number;
}

export interface StairConfig {
  lengthFeet: number;
  lengthInches: number;
  widthFeet: number;
  widthInches: number;
  thickness: number;
  mixRatio: string;
  risers: number;
  treads: number;
  riserHeight: number;
  treadWidth: number;
  mainBar: number;
  mainSpacing: number;
  distBar: number;
  distSpacing: number;
}

export interface BrickworkConfig {
  length: number;
  width: number;
  lengthSpans: number;
  widthSpans: number;
  height: number;
  windowCount: number;
  windowWidth: number;
  windowHeight: number;
  doorCount: number;
  doorWidth: number;
  doorHeight: number;
  wallThickness: number;
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  brickMix: string;
  plasterMix: string;
  plasterThickness: number;
}

export interface TileConfig {
  tileType: string;
  tilePrice: number;
  tileSize: number;
  length: number;
  width: number;
  perimeter: number;
  includeSkirting: boolean;
  skirtingHeight: number;
  skirtingPrice: number;
  mortarTh: number;
  wastage: number;
  labour: number;
  coatingCost: number;
  cementCost: number;
  sandCost: number;
}

export interface StructuralConfig {
  numStories: number;
  colHeight: number;
  columnShape: "rectangular" | "circular";
  colWidth: number;
  colDepth: number;
  colDiameter: number;
  slabArea: number;
  slabThickness: number;
  beamWidth: number;
  beamDepth: number;
  floorFinish: number;
  liveLoad: number;
  deadFactor: number;
  liveFactor: number;
  brickWeight: number;
  numBricks: number;
  district: string;
  seismicZoneFactor: number;
  windSpeed: number;
  soilType: string;
  importanceFactor: number;
  exposureCategory: string;
  seismicFactor: number;
  windFactor: number;
  loadingType: "pure" | "uniaxial" | "biaxial";
  fc: number;
  fy: number;
  rebarSets: { barSize: number; barNos: number }[];
}
