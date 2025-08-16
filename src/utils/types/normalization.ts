// ===== TIPOS PARA EL SISTEMA DE NORMALIZACIÓN =====

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
  reference?: ColumnReference;
  data: string[];
  redundancyPercentage: number;
  uniqueValues: number;
  totalValues: number;
}

export interface ColumnReference {
  table: string;
  column: string;
}

export interface Table {
  name: string;
  purpose: string;
  columns: Column[];
  primaryKey: Column | null;
  foreignKeys: Column[];
  data: string[][];
  entityType: EntityType;
  normalizationLevel: NormalizationLevel;
}

export interface Entity {
  name: string;
  purpose: string;
  columns: Column[];
  relationships: Relationship[];
  dependencies: Dependency[];
  primaryKey: Column | null;
  normalizationScore: number;
}

export interface Relationship {
  column: string;
  references: ColumnReference;
  type: 'FOREIGN_KEY' | 'MANY_TO_MANY' | 'ONE_TO_ONE';
  strength: 'STRONG' | 'WEAK';
}

export interface Dependency {
  from: string[];
  to: string[];
  type: 'FUNCTIONAL' | 'PARTIAL' | 'TRANSITIVE';
  strength: number; // 0-1
}

export interface NormalizationResult {
  originalStructure: Table[];
  normalizedEntities: Entity[];
  normalizationSteps: NormalizationStep[];
  sqlScript: string;
  analysis: AnalysisResult;
  recommendations: string[];
}

export interface NormalizationStep {
  step: number;
  description: string;
  action: string;
  result: string;
  tablesCreated: string[];
  tablesModified: string[];
}

export interface AnalysisResult {
  totalRows: number;
  uniqueRows: number;
  redundancyScore: number;
  normalizationScore: number;
  formsNormal: {
    firstNF: boolean;
    secondNF: boolean;
    thirdNF: boolean;
    bcnf: boolean;
  };
  issues: Issue[];
  suggestions: string[];
}

export interface Issue {
  type: 'REDUNDANCY' | 'DEPENDENCY' | 'STRUCTURE' | 'DATA_TYPE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedColumns: string[];
  solution: string;
}

export enum EntityType {
  MAIN = 'MAIN',
  LOOKUP = 'LOOKUP',
  TRANSACTION = 'TRANSACTION',
  AUDIT = 'AUDIT',
  CONFIGURATION = 'CONFIGURATION'
}

export enum NormalizationLevel {
  NONE = 'NONE',
  FIRST_NF = 'FIRST_NF',
  SECOND_NF = 'SECOND_NF',
  THIRD_NF = 'THIRD_NF',
  BCNF = 'BCNF'
}

export interface FunctionalDependency {
  determinant: string[];
  dependent: string[];
  confidence: number;
  support: number;
}

export interface RedundancyPattern {
  column: string;
  pattern: string;
  frequency: number;
  percentage: number;
  suggestedAction: 'KEEP' | 'NORMALIZE' | 'REMOVE';
}

