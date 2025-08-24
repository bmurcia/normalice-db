// Tipos compartidos para el análisis de datos
export interface ColumnTypeInfo {
  columnName: string;
  uniqueValues: number;
  totalRows: number;
  redundancyPercentage: number;
  detectedType: string;
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high';
  column?: string;
}

export interface AnalysisRecommendation {
  type: 'normalization' | 'performance' | 'structure' | 'general';
  message: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
}

