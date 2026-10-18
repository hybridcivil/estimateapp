export type EstimateType =
  | "dashboard"
  | "beam"
  | "column"
  | "footing"
  | "situ_pile"
  | "sand_pile"
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

export interface GlobalMaterialRates {
  cementRate: number;
  sandRate: number;
  aggRate: number;
  steelRate: number;
  brickRate: number;
  tileRate: number;
  boringRatePerFt: number;
  sandPileCostPerFt: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "admin" | "engineer";
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  engineer: string;
  ownerId?: string; // Firebase Auth UID
  ownerEmail?: string;
  ownerName?: string;
  notes?: string;
  stories?: number; // Number of storeys/floors (e.g. 1, 3, 5, 10)
  rates?: GlobalMaterialRates; // Unified project-wide material rates
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

export type BeamSubtype = "grade_beam" | "floor_beam";

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
  subtype?: BeamSubtype;
}

export interface ColumnItem {
  nos: number;
  name: string;
  type: "rectangular" | "circular";
  category: "long" | "short" | "combined";
  size: string;
  height: number;
  shortHeight?: number; // Height from footing to grade beam (e.g. 4 ft)
  longHeight?: number; // Floor-to-floor height (e.g. 10 ft)
  shortOffset?: number; // Automatic dimension increase for short column (default 3 in: 12x15 -> 15x18)
  clearCover?: number; // Clear cover for floor column (default 1.5 in)
  shortClearCover?: number; // Clear cover for short column in ground (default 2.0 in)
  footingBend?: number; // Embedment / L-bend into footing (e.g. 1.5 ft)
  lapLength?: number; // Lap splice extension (e.g. 2.5 ft)
  shortStirrupSpacing?: number;
  longStirrupSpacing?: number;
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

export interface SlabItem {
  id?: string;
  nos: number;
  name: string;
  length: number;
  width: number;
  thicknessIn: number;
  mixRatio: string;
  mainBar: number;
  spacingIn: number;
  distBar: number;
  distSpacingIn: number;
  extraBar: number;
  extraBarsNum: number;
}

export interface StairItem {
  id?: string;
  nos: number;
  name: string;
  lengthFeet: number;
  lengthInches: number;
  widthFeet: number;
  widthInches: number;
  thicknessIn: number;
  mixRatio: string;
  risers: number;
  treads: number;
  riserHeightIn: number;
  treadWidthIn: number;
  mainBar: number;
  mainSpacingIn: number;
  distBar: number;
  distSpacingIn: number;
}

export interface BrickWallItem {
  id?: string;
  nos: number;
  name: string;
  length: number;
  width: number;
  lengthSpans: number;
  widthSpans: number;
  height: number;
  wallThickness: number; // 10 or 5 inches
  windowCount: number;
  windowWidth: number;
  windowHeight: number;
  doorCount: number;
  doorWidth: number;
  doorHeight: number;
  brickLengthIn: number;
  brickWidthIn: number;
  brickHeightIn: number;
  brickMix: string;
  plasterMix: string;
  plasterThicknessMm: number;
}

export interface TileRoomItem {
  id?: string;
  nos: number;
  name: string;
  length: number;
  width: number;
  tileType: string;
  tilePrice: number;
  tileSize: number;
  includeSkirting: boolean;
  skirtingHeight: number;
  skirtingPrice: number;
  mortarTh: number;
  wastage: number;
  labour: number;
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

export interface SandPileInputs {
  landArea: number; // sq ft
  pileDiameter: number; // inches
  pileSpacing: number; // inches c/c
  pileLength: number; // feet
  costPerFoot: number; // TK/ft
  costPerCft: number; // TK/cft
  compactionFactor?: number; // e.g. 1.15
  sandType?: string;
  notes?: string;
}

export interface SandPileResults {
  spacingFeet: number;
  areaPerPile: number;
  numPiles: number;
  volumePerPile: number;
  totalVolume: number;
  totalSandCost: number;
  totalPileCost: number;
  totalCost: number;
  multiplier?: number;
  isMultiplying?: boolean;
}

export interface SituPileInputs {
  pileNos: number;
  pileLength: number; // feet
  pileDiameter: number; // inches
  barSize: number; // mm
  barNos: number;
  spiralSpacing: number; // inches
  spiralDia?: number; // mm (default 8)
  mixRatio: string; // "1:1.5:3" | "1:2:4"
  constructionCostPerFoot: number; // TK/ft
  cementCost: number; // TK/bag
  sandCost: number; // TK/cft
  aggregateCost: number; // TK/cft
  steelCost: number; // TK/kg
  clearCoverIn?: number;
  notes?: string;
}

export interface SituPileResults {
  wetVolumePerPile: number;
  dryVolumePerPile: number;
  totalWetVolume: number;
  totalDryVolume: number;
  cementBagsPerPile: number;
  totalCementBags: number;
  sandVolumePerPile: number;
  totalSandVolume: number;
  aggregateVolumePerPile: number;
  totalAggregateVolume: number;
  mainBarWeightPerPile: number;
  totalMainBarWeight: number;
  spiralWeightPerPile: number;
  totalSpiralWeight: number;
  totalSteelWeight: number;
  constructionCost: number;
  cementCostTotal: number;
  sandCostTotal: number;
  aggregateCostTotal: number;
  steelCostTotal: number;
  totalCost: number;
  multiplier?: number;
  isMultiplying?: boolean;
}
