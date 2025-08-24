// Exportar interfaces y tipos
export type {
  CSVStructure,
  ParsedCSVData,
  ColumnAnalysis,
  InitialAnalysis
} from './csvAnalyzer';

export type {
  ColumnTypeInfo,
  AnalysisIssue,
  AnalysisRecommendation
} from './types';

// Exportar funciones principales
export {
  analyzeCSVStructure,
  parseCSVWithStructure,
  performInitialAnalysis,
  detectColumnType
} from './csvAnalyzer';

export {
  detectColumnTypeIntelligently,
  analyzeAllColumns,
  calculateAverageRedundancy,
  findHighRedundancyColumns,
  findColumnsNeedingNormalization
} from './typeDetector';

export {
  analyzeDataIssues,
  generateRecommendations,
  calculateDataQualityMetrics
} from './issueAnalyzer';
