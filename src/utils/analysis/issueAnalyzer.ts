import type { ColumnTypeInfo, AnalysisIssue, AnalysisRecommendation } from './types';

/**
 * Analiza los datos para detectar problemas potenciales
 */
export function analyzeDataIssues(
  analysisData: any, 
  columnAnalysis: ColumnTypeInfo[]
): AnalysisIssue[] {
  if (!analysisData || !analysisData.headers || !Array.isArray(analysisData.headers)) {
    return [];
  }
  
  try {
    const issues: AnalysisIssue[] = [];
    
    // Verificar alta redundancia
    const highRedundancy = columnAnalysis.filter((col: ColumnTypeInfo) => col && col.redundancyPercentage > 30);
    if (highRedundancy.length > 0) {
      issues.push({
        type: 'warning',
        message: `Alta redundancia detectada en ${highRedundancy.length} columnas`,
        severity: 'medium',
        column: highRedundancy.map(col => col.columnName).join(', ')
      });
    }
    
    // Verificar dependencias transitivas potenciales
    if (analysisData.totalColumns > 10) {
      issues.push({
        type: 'warning',
        message: 'Múltiples columnas pueden tener dependencias transitivas',
        severity: 'medium'
      });
    }
    
    // Verificar si hay columnas que parecen IDs
    const idColumns = analysisData.headers.filter((h: string) => h && h.toLowerCase().includes('id'));
    if (idColumns.length === 0) {
      issues.push({
        type: 'warning',
        message: 'No se detectaron columnas de ID claras',
        severity: 'low'
      });
    }
    
    // Verificar columnas con tipos genéricos
    const genericTypeColumns = columnAnalysis.filter(col => col.detectedType === 'VARCHAR(255)');
    if (genericTypeColumns.length > 0) {
      issues.push({
        type: 'info',
        message: `${genericTypeColumns.length} columnas tienen tipos genéricos (VARCHAR(255))`,
        severity: 'low',
        column: genericTypeColumns.map(col => col.columnName).join(', ')
      });
    }
    
    // Verificar columnas con alta redundancia específica
    const criticalRedundancy = columnAnalysis.filter(col => col.redundancyPercentage > 70);
    if (criticalRedundancy.length > 0) {
      issues.push({
        type: 'error',
        message: `Redundancia crítica detectada en ${criticalRedundancy.length} columnas`,
        severity: 'high',
        column: criticalRedundancy.map(col => col.columnName).join(', ')
      });
    }
    
    return issues;
  } catch (error) {
    console.error('Error analyzing data issues:', error);
    return [];
  }
}

/**
 * Genera recomendaciones basadas en el análisis de datos
 */
export function generateRecommendations(
  analysisData: any, 
  detectedDomain: any, 
  columnAnalysis: ColumnTypeInfo[]
): AnalysisRecommendation[] {
  if (!analysisData || !detectedDomain) {
    return [];
  }
  
  try {
    const recommendations: AnalysisRecommendation[] = [];
    
    // Recomendación basada en el dominio
    if (detectedDomain.entities && Array.isArray(detectedDomain.entities) && detectedDomain.entities.length > 0) {
      recommendations.push({
        type: 'structure',
        message: `Separar en ${detectedDomain.entities.length} tablas: ${detectedDomain.entities.join(', ')}`,
        priority: 'high',
        impact: 'Eliminación significativa de redundancia y mejor estructura'
      });
    }
    
    // Recomendación basada en redundancia
    if (columnAnalysis && columnAnalysis.length > 0) {
      const avgRedundancy = columnAnalysis.reduce((sum: number, col: ColumnTypeInfo) => sum + (col?.redundancyPercentage || 0), 0) / columnAnalysis.length;
      if (avgRedundancy > 50) {
        recommendations.push({
          type: 'normalization',
          message: `Eliminar redundancia: ~${Math.round(avgRedundancy)}% de datos duplicados`,
          priority: 'high',
          impact: 'Reducción significativa de almacenamiento y mejora de integridad'
        });
      }
    }
    
    // Recomendación basada en tipos de datos
    const genericTypeColumns = columnAnalysis.filter(col => col.detectedType === 'VARCHAR(255)');
    if (genericTypeColumns.length > 0) {
      recommendations.push({
        type: 'performance',
        message: `Optimizar tipos de datos en ${genericTypeColumns.length} columnas`,
        priority: 'medium',
        impact: 'Mejor rendimiento de consultas y optimización de almacenamiento'
      });
    }
    
    // Recomendación general
    recommendations.push({
      type: 'general',
      message: 'Mejorar integridad referencial con claves foráneas',
      priority: 'medium',
      impact: 'Mayor consistencia de datos y prevención de errores'
    });
    
    recommendations.push({
      type: 'performance',
      message: 'Optimizar estructura para consultas eficientes',
      priority: 'medium',
      impact: 'Mejor rendimiento en operaciones de lectura y escritura'
    });
    
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Calcula métricas de calidad de los datos
 */
export function calculateDataQualityMetrics(
  analysisData: any, 
  columnAnalysis: ColumnTypeInfo[]
): {
  completeness: number;
  consistency: number;
  accuracy: number;
  overallScore: number;
} {
  if (!analysisData || !columnAnalysis || columnAnalysis.length === 0) {
    return {
      completeness: 0,
      consistency: 0,
      accuracy: 0,
      overallScore: 0
    };
  }
  
  try {
    // Completitud: porcentaje de valores no nulos
    const totalCells = analysisData.totalRows * analysisData.totalColumns;
    const nonNullCells = columnAnalysis.reduce((sum, col) => sum + col.totalRows, 0);
    const completeness = (nonNullCells / totalCells) * 100;
    
    // Consistencia: basada en redundancia (menor redundancia = mayor consistencia)
    const avgRedundancy = columnAnalysis.reduce((sum, col) => sum + col.redundancyPercentage, 0) / columnAnalysis.length;
    const consistency = Math.max(0, 100 - avgRedundancy);
    
    // Precisión: basada en tipos de datos apropiados
    const appropriateTypes = columnAnalysis.filter(col => 
      col.detectedType !== 'VARCHAR(255)' || 
      col.columnName.toLowerCase().includes('nombre') || 
      col.columnName.toLowerCase().includes('descripcion')
    ).length;
    const accuracy = (appropriateTypes / columnAnalysis.length) * 100;
    
    // Puntuación general
    const overallScore = Math.round((completeness + consistency + accuracy) / 3);
    
    return {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      accuracy: Math.round(accuracy),
      overallScore
    };
  } catch (error) {
    console.error('Error calculating data quality metrics:', error);
    return {
      completeness: 0,
      consistency: 0,
      accuracy: 0,
      overallScore: 0
    };
  }
}
