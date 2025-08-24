import type { ColumnTypeInfo } from './types';

/**
 * Detecta el tipo de dato de una columna de forma inteligente
 * Prioriza tipos SQL de la primera fila si están disponibles
 */
export function detectColumnTypeIntelligently(
  analysisData: any, 
  header: string
): ColumnTypeInfo {
  // Obtener valores de la columna
  let values = analysisData.data.map((row: any) => row[header]).filter((v: any) => v !== null && v !== undefined);
  
  // Verificar si la primera fila contiene tipos SQL y excluirla del análisis
  let dataValues = values;
  if (analysisData.data.length > 0) {
    const firstRow = analysisData.data[0];
    if (firstRow && firstRow[header]) {
      const firstRowValue = firstRow[header];
      if (isValidSQLType(firstRowValue)) {
        // Excluir la primera fila del análisis de datos
        dataValues = values.filter((_: any, index: number) => index !== 0);
      }
    }
  }
  
  const uniqueValues = new Set(dataValues).size;
  const redundancyPercentage = dataValues.length > 0 ? ((dataValues.length - uniqueValues) / dataValues.length) * 100 : 0;
  
  // Detectar tipo de dato basado en el contenido
  let detectedType = 'VARCHAR(255)';
  
  // Verificar si la primera fila contiene tipos SQL (caso especial de template.csv)
  if (analysisData.data.length > 0) {
    const firstRow = analysisData.data[0];
    if (firstRow && firstRow[header]) {
      const firstRowValue = firstRow[header];
      
      // Verificar si es un tipo SQL válido
      if (isValidSQLType(firstRowValue)) {
        detectedType = firstRowValue;
      }
    }
  }
  
  // Si no se detectó un tipo SQL en la primera fila, inferir del contenido
  if (detectedType === 'VARCHAR(255)') {
    // Filtrar solo los valores de datos reales (excluir la primera fila si contiene tipos)
    const filteredDataValues = values.filter((_: any, index: number) => {
      // Si la primera fila contiene tipos SQL, excluirla del análisis
      if (analysisData.data.length > 0) {
        const firstRow = analysisData.data[0];
        if (firstRow && firstRow[header]) {
          const firstRowValue = firstRow[header];
          if (isValidSQLType(firstRowValue)) {
            return index !== 0; // Excluir la primera fila
          }
        }
      }
      return true;
    });
    
    detectedType = inferTypeFromContent(filteredDataValues, header);
  }
  
  return {
    columnName: header,
    uniqueValues,
    totalRows: dataValues.length,
    redundancyPercentage: Math.round(redundancyPercentage * 100) / 100,
    detectedType
  };
}

/**
 * Verifica si un valor es un tipo SQL válido
 */
function isValidSQLType(value: string): boolean {
  return value === 'INT' || 
         value === 'INTEGER' ||
         value.startsWith('VARCHAR') ||
         value.startsWith('DECIMAL') ||
         value === 'DATE';
}

/**
 * Infiere el tipo de dato basándose en el contenido de los valores
 */
function inferTypeFromContent(values: any[], headerName: string): string {
  // Si la columna parece ser un ID, usar INTEGER
  if (headerName.toLowerCase().includes('id') || headerName.toLowerCase().includes('_id')) {
    return 'INTEGER';
  }
  
  // Si todos los valores son numéricos
  if (values.every((val: any) => !isNaN(Number(val)) && val !== '')) {
    const hasDecimals = values.some((val: any) => val.toString().includes('.'));
    return hasDecimals ? 'DECIMAL(10,2)' : 'INTEGER';
  }
  
  // Si todos los valores son fechas válidas
  if (values.every((val: any) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  })) {
    return 'DATE';
  }
  
  // Por defecto, usar VARCHAR
  return 'VARCHAR(255)';
}

/**
 * Analiza todas las columnas de un dataset y retorna información de tipos
 */
export function analyzeAllColumns(analysisData: any): ColumnTypeInfo[] {
  if (!analysisData || !analysisData.headers || !Array.isArray(analysisData.headers)) {
    return [];
  }
  
  try {
    return analysisData.headers.map((header: string) => 
      detectColumnTypeIntelligently(analysisData, header)
    ).filter(Boolean);
  } catch (error) {
    console.error('Error analyzing columns:', error);
    return [];
  }
}

/**
 * Calcula la redundancia promedio de todas las columnas
 */
export function calculateAverageRedundancy(columnAnalysis: ColumnTypeInfo[]): number {
  if (columnAnalysis.length === 0) return 0;
  const totalRedundancy = columnAnalysis.reduce((sum: number, col: ColumnTypeInfo) => sum + col.redundancyPercentage, 0);
  return Math.round(totalRedundancy / columnAnalysis.length);
}

/**
 * Encuentra columnas con alta redundancia
 */
export function findHighRedundancyColumns(columnAnalysis: ColumnTypeInfo[], threshold: number = 50): ColumnTypeInfo[] {
  return columnAnalysis.filter(col => col.redundancyPercentage > threshold);
}

/**
 * Encuentra columnas que necesitan normalización
 */
export function findColumnsNeedingNormalization(columnAnalysis: ColumnTypeInfo[], threshold: number = 20): ColumnTypeInfo[] {
  return columnAnalysis.filter(col => col.redundancyPercentage > threshold);
}
