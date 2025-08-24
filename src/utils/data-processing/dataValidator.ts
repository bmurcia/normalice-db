export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DataQualityMetrics {
  completeness: number;
  consistency: number;
  uniqueness: number;
  validity: number;
  overallScore: number;
}

/**
 * Valida la estructura y calidad de los datos CSV
 */
export function validateCSVData(csvText: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  if (!csvText || typeof csvText !== 'string') {
    result.isValid = false;
    result.errors.push('El archivo CSV está vacío o no es válido');
    return result;
  }
  
  // Validar estructura básica
  const structureValidation = validateCSVStructure(csvText);
  if (!structureValidation.isValid) {
    result.isValid = false;
    result.errors.push(...structureValidation.errors);
  }
  
  if (structureValidation.warnings.length > 0) {
    result.warnings.push(...structureValidation.warnings);
  }
  
  // Validar contenido de datos
  const contentValidation = validateCSVContent(csvText);
  if (contentValidation.errors.length > 0) {
    result.isValid = false;
    result.errors.push(...contentValidation.errors);
  }
  
  if (contentValidation.warnings.length > 0) {
    result.warnings.push(...contentValidation.warnings);
  }
  
  // Generar sugerencias
  result.suggestions = generateDataSuggestions(csvText, result);
  
  return result;
}

/**
 * Valida la estructura básica del CSV
 */
function validateCSVStructure(csvText: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  const lines = csvText.trim().split('\n');
  
  // Verificar que haya al menos una línea
  if (lines.length === 0) {
    result.isValid = false;
    result.errors.push('El archivo CSV no contiene líneas');
    return result;
  }
  
  // Verificar que la primera línea tenga contenido
  const firstLine = lines[0];
  if (!firstLine || firstLine.trim() === '') {
    result.isValid = false;
    result.errors.push('La primera línea (encabezados) está vacía');
    return result;
  }
  
  // Verificar que haya encabezados válidos
  const headers = firstLine.split(',').map(h => h.trim()).filter(h => h !== '');
  if (headers.length === 0) {
    result.isValid = false;
    result.errors.push('No se encontraron encabezados válidos');
    return result;
  }
  
  // Verificar consistencia en el número de columnas
  const expectedColumns = headers.length;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim() !== '') {
      const columns = line.split(',').length;
      if (columns !== expectedColumns) {
        result.warnings.push(`Línea ${i + 1}: número de columnas inconsistente (${columns} vs ${expectedColumns})`);
      }
    }
  }
  
  // Verificar si hay datos suficientes
  const dataLines = lines.slice(1).filter(line => line && line.trim() !== '');
  if (dataLines.length === 0) {
    result.warnings.push('No se encontraron filas de datos para analizar');
  }
  
  return result;
}

/**
 * Valida el contenido de los datos CSV
 */
function validateCSVContent(csvText: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Verificar cada fila de datos
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim() !== '') {
      const values = line.split(',');
      
      // Verificar que no haya valores extremadamente largos
      values.forEach((value, colIndex) => {
        if (value && value.length > 1000) {
          result.warnings.push(`Línea ${i + 1}, columna ${colIndex + 1}: valor muy largo (${value.length} caracteres)`);
        }
      });
      
      // Verificar caracteres especiales problemáticos
      values.forEach((value, colIndex) => {
        if (value && /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
          result.warnings.push(`Línea ${i + 1}, columna ${colIndex + 1}: contiene caracteres de control`);
        }
      });
    }
  }
  
  return result;
}

/**
 * Genera sugerencias para mejorar la calidad de los datos
 */
function generateDataSuggestions(csvText: string, validationResult: ValidationResult): string[] {
  const suggestions: string[] = [];
  const lines = csvText.trim().split('\n');
  
  if (lines.length === 1) {
    suggestions.push('Agregar datos de ejemplo para poder realizar el análisis');
  }
  
  if (validationResult.warnings.some(w => w.includes('columnas inconsistente'))) {
    suggestions.push('Revisar y corregir la consistencia en el número de columnas');
  }
  
  if (validationResult.warnings.some(w => w.includes('caracteres de control'))) {
    suggestions.push('Limpiar caracteres de control del archivo CSV');
  }
  
  if (validationResult.warnings.some(w => w.includes('valor muy largo'))) {
    suggestions.push('Considerar truncar valores extremadamente largos');
  }
  
  // Sugerencias generales
  suggestions.push('Verificar que los tipos de datos sean consistentes en cada columna');
  suggestions.push('Asegurar que no haya valores duplicados innecesarios');
  suggestions.push('Considerar agregar una columna de ID único si no existe');
  
  return suggestions;
}

/**
 * Calcula métricas de calidad de los datos
 */
export function calculateDataQuality(csvText: string): DataQualityMetrics {
  if (!csvText || typeof csvText !== 'string') {
    return {
      completeness: 0,
      consistency: 0,
      uniqueness: 0,
      validity: 0,
      overallScore: 0
    };
  }
  
  try {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      return {
        completeness: 0,
        consistency: 0,
        uniqueness: 0,
        validity: 0,
        overallScore: 0
      };
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1).filter(line => line && line.trim() !== '');
    
    // Completitud: porcentaje de celdas con datos
    const totalCells = dataLines.length * headers.length;
    let filledCells = 0;
    
    dataLines.forEach(line => {
      const values = line.split(',');
      values.forEach(value => {
        if (value && value.trim() !== '') {
          filledCells++;
        }
      });
    });
    
    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    
    // Consistencia: basada en el número de columnas consistentes
    let consistentRows = 0;
    dataLines.forEach(line => {
      const values = line.split(',');
      if (values.length === headers.length) {
        consistentRows++;
      }
    });
    
    const consistency = dataLines.length > 0 ? (consistentRows / dataLines.length) * 100 : 0;
    
    // Unicidad: basada en filas únicas
    const uniqueRows = new Set(dataLines.map(line => line.trim())).size;
    const uniqueness = dataLines.length > 0 ? (uniqueRows / dataLines.length) * 100 : 0;
    
    // Validez: basada en la ausencia de errores críticos
    const validation = validateCSVData(csvText);
    const validity = validation.errors.length === 0 ? 100 : Math.max(0, 100 - (validation.errors.length * 20));
    
    // Puntuación general
    const overallScore = Math.round((completeness + consistency + uniqueness + validity) / 4);
    
    return {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      uniqueness: Math.round(uniqueness),
      validity: Math.round(validity),
      overallScore
    };
  } catch (error) {
    console.error('Error calculating data quality:', error);
    return {
      completeness: 0,
      consistency: 0,
      uniqueness: 0,
      validity: 0,
      overallScore: 0
    };
  }
}

/**
 * Verifica si los datos son adecuados para normalización
 */
export function isDataSuitableForNormalization(csvText: string): {
  suitable: boolean;
  reasons: string[];
  confidence: number;
} {
  const result = {
    suitable: false,
    reasons: [] as string[],
    confidence: 0
  };
  
  if (!csvText || typeof csvText !== 'string') {
    result.reasons.push('Datos no válidos');
    return result;
  }
  
  try {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 3) {
      result.reasons.push('Insuficientes datos para análisis');
      return result;
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1).filter(line => line && line.trim() !== '');
    
    // Verificar si hay suficientes columnas
    if (headers.length < 3) {
      result.reasons.push('Muy pocas columnas para normalización efectiva');
      result.confidence = 20;
    } else if (headers.length > 20) {
      result.reasons.push('Demasiadas columnas, puede ser complejo de normalizar');
      result.confidence = 60;
    } else {
      result.confidence += 30;
    }
    
    // Verificar si hay suficientes filas
    if (dataLines.length < 5) {
      result.reasons.push('Muy pocas filas para detectar patrones');
      result.confidence += 10;
    } else if (dataLines.length > 1000) {
      result.reasons.push('Muchos datos, normalización puede ser lenta');
      result.confidence += 20;
    } else {
      result.confidence += 30;
    }
    
    // Verificar si hay columnas que parecen IDs
    const hasIdColumns = headers.some(h => h.toLowerCase().includes('id'));
    if (hasIdColumns) {
      result.confidence += 20;
    } else {
      result.reasons.push('No se detectaron columnas de ID claras');
    }
    
    // Verificar si hay columnas con nombres descriptivos
    const hasDescriptiveColumns = headers.some(h => 
      h.toLowerCase().includes('nombre') || 
      h.toLowerCase().includes('descripcion') ||
      h.toLowerCase().includes('fecha')
    );
    if (hasDescriptiveColumns) {
      result.confidence += 20;
    }
    
    result.suitable = result.confidence >= 60;
    
    if (result.suitable) {
      result.reasons.push('Datos adecuados para normalización');
    }
    
    return result;
  } catch (error) {
    console.error('Error checking normalization suitability:', error);
    result.reasons.push('Error al analizar los datos');
    return result;
  }
}

