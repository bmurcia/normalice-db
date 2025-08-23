// ===== SISTEMA DE NORMALIZACIÓN INTELIGENTE =====
// Archivo principal que exporta todas las funcionalidades

export { StructureAnalyzer } from './analyzer';
export { EntityDetector } from './entityDetector';
export { DatabaseNormalizer } from './normalizer';

// Exportar tipos
export * from '../types/normalization';

// ===== FUNCIÓN PRINCIPAL DE NORMALIZACIÓN =====
// Esta función es la interfaz principal para usar el sistema

import { DatabaseNormalizer } from './normalizer';
import type { NormalizationResult } from '../types/normalization';

/**
 * Función principal para normalizar cualquier CSV a 3NF
 * @param csvData - Datos CSV como string
 * @returns Promise con el resultado completo de la normalización
 */
export async function normalizeCSVTo3NF(csvData: string): Promise<NormalizationResult> {
  
  try {
    const normalizer = new DatabaseNormalizer(csvData);
    const result = await normalizer.normalizeTo3NF();
    
    return result;
    
  } catch (error) {
    console.error('❌ Error en la normalización:', error);
    throw error;
  }
}

/**
 * Función de normalización síncrona (para compatibilidad)
 * @param csvData - Datos CSV como string
 * @returns Resultado de la normalización
 */
export function normalizeCSVTo3NFSync(csvData: string): NormalizationResult {
  
  try {
    // Crear una promesa que se resuelve inmediatamente
    const normalizer = new DatabaseNormalizer(csvData);
    
    // Ejecutar la normalización de manera síncrona
    return normalizer.normalizeTo3NF() as any;
    
  } catch (error) {
    console.error('❌ Error en la normalización síncrona:', error);
    throw error;
  }
}

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Validar si un CSV es válido para normalización
 * @param csvData - Datos CSV como string
 * @returns true si el CSV es válido
 */
export function validateCSV(csvData: string): boolean {
  if (!csvData || typeof csvData !== 'string') {
    return false;
  }
  
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return false; // Necesita al menos headers + 1 fila de datos
  }
  
  const headers = lines[0].split(',');
  if (headers.length < 2) {
    return false; // Necesita al menos 2 columnas
  }
  
  // Verificar que todas las filas tengan el mismo número de columnas
  const expectedColumns = headers.length;
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    if (columns.length !== expectedColumns) {
      return false;
    }
  }
  
  return true;
}

/**
 * Obtener estadísticas básicas del CSV
 * @param csvData - Datos CSV como string
 * @returns Estadísticas del CSV
 */
export function getCSVStats(csvData: string): {
  totalRows: number;
  totalColumns: number;
  isValid: boolean;
  estimatedSize: string;
} {
  const isValid = validateCSV(csvData);
  
  if (!isValid) {
    return {
      totalRows: 0,
      totalColumns: 0,
      isValid: false,
      estimatedSize: '0 KB'
    };
  }
  
  const lines = csvData.trim().split('\n');
  const totalRows = lines.length - 1; // Excluir headers
  const totalColumns = lines[0].split(',').length;
  
  // Calcular tamaño estimado
  const sizeInBytes = new Blob([csvData]).size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  const estimatedSize = `${sizeInKB} KB`;
  
  return {
    totalRows,
    totalColumns,
    isValid,
    estimatedSize
  };
}

/**
 * Previsualizar estructura del CSV
 * @param csvData - Datos CSV como string
 * @returns Estructura previsualizada
 */
export function previewCSVStructure(csvData: string): {
  headers: string[];
  sampleRows: string[][];
  columnTypes: string[];
} {
  if (!validateCSV(csvData)) {
    return {
      headers: [],
      sampleRows: [],
      columnTypes: []
    };
  }
  
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Tomar hasta 5 filas de muestra
  const sampleRows = lines.slice(1, 6).map(line => 
    line.split(',').map(col => col.trim().replace(/"/g, ''))
  );
  
  // Inferir tipos de columnas basándose en los datos de muestra
  const columnTypes = headers.map((_header, index) => {
    const sampleValues = sampleRows.map(row => row[index] || '');
    
    // Análisis básico de tipos
    if (sampleValues.every(val => !isNaN(Number(val)) && val !== '')) {
      const hasDecimals = sampleValues.some(val => val.includes('.'));
      return hasDecimals ? 'DECIMAL' : 'INTEGER';
    }
    
    if (sampleValues.every(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    })) {
      return 'DATE';
    }
    
    // Verificar longitud para VARCHAR
    const maxLength = Math.max(...sampleValues.map(val => val.length));
    if (maxLength <= 50) return 'VARCHAR(50)';
    if (maxLength <= 100) return 'VARCHAR(100)';
    if (maxLength <= 255) return 'VARCHAR(255)';
    return 'TEXT';
  });
  
  return {
    headers,
    sampleRows,
    columnTypes
  };
}

// ===== EXPORTACIÓN POR DEFECTO =====
// Para compatibilidad con importaciones existentes

export default {
  normalizeCSVTo3NF,
  normalizeCSVTo3NFSync,
  validateCSV,
  getCSVStats,
  previewCSVStructure
};

