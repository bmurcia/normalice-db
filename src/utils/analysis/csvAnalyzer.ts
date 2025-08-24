// import { detectBusinessDomain } from '../domain-detector';

export interface CSVStructure {
  hasTypeRow: boolean;
  typeRowIndex: number;
  headerRowIndex: number;
  dataStartIndex: number;
  originalHeaders: string[];
  detectedTypes: string[];
  cleanHeaders: string[];
}

export interface ParsedCSVData {
  headers: string[];
  types: string[];
  data: any[];
  structure: CSVStructure;
}

export interface ColumnAnalysis {
  columnName: string;
  uniqueValues: number;
  totalRows: number;
  redundancyPercentage: number;
  shouldNormalize: boolean;
  detectedType: string;
}

export interface InitialAnalysis {
  primaryKey: string;
  totalRows: number;
  uniqueRows: number;
  redundancyPercentage: number;
  columnAnalysis: ColumnAnalysis[];
  initialNormalForm: {
    level: number;
    name: string;
    description: string;
    issues: string[];
  };
}

/**
 * Analiza la estructura de un archivo CSV para detectar filas de tipos, headers y datos
 */
export function analyzeCSVStructure(csvText: string): CSVStructure {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return {
      hasTypeRow: false,
      typeRowIndex: -1,
      headerRowIndex: 0,
      dataStartIndex: 1,
      originalHeaders: lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : [],
      detectedTypes: [],
      cleanHeaders: []
    };
  }

  const firstLine = lines[0];
  const secondLine = lines[1];
  
  // Detectar si la primera fila contiene tipos de datos
  const firstLineHasTypes = detectIfFirstLineHasTypes(firstLine);
  const secondLineHasTypes = detectIfFirstLineHasTypes(secondLine);
  
  let structure: CSVStructure = {
    hasTypeRow: false,
    typeRowIndex: -1,
    headerRowIndex: 0,
    dataStartIndex: 1,
    originalHeaders: [],
    detectedTypes: [],
    cleanHeaders: []
  };

  if (firstLineHasTypes) {
    // Primera fila es tipos, segunda es encabezados
    structure.hasTypeRow = true;
    structure.typeRowIndex = 0;
    structure.headerRowIndex = 1;
    structure.dataStartIndex = 2;
    structure.originalHeaders = lines[1].split(',').map(h => h.trim().replace(/"/g, ''));
    structure.detectedTypes = lines[0].split(',').map(t => t.trim().replace(/"/g, ''));
  } else if (secondLineHasTypes) {
    // Primera fila es encabezados, segunda es tipos
    structure.hasTypeRow = true;
    structure.typeRowIndex = 1;
    structure.headerRowIndex = 0;
    structure.dataStartIndex = 2;
    structure.originalHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    structure.detectedTypes = lines[1].split(',').map(t => t.trim().replace(/"/g, ''));
  } else {
    // No hay fila de tipos, primera fila es encabezados
    structure.originalHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    structure.dataStartIndex = 1;
  }

  // Limpiar encabezados (remover caracteres especiales)
  structure.cleanHeaders = structure.originalHeaders.map(header => 
    header.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '')
  );

  return structure;
}

/**
 * Detecta si una línea contiene tipos de datos SQL
 */
function detectIfFirstLineHasTypes(line: string): boolean {
  const types = line.split(',').map(t => t.trim().replace(/"/g, ''));
  
  // Patrones comunes de tipos de datos
  const typePatterns = [
    /^INT$/i, /^INTEGER$/i, /^BIGINT$/i,
    /^VARCHAR\(\d+\)$/i, /^CHAR\(\d+\)$/i,
    /^DECIMAL\(\d+,\d+\)$/i, /^NUMERIC\(\d+,\d+\)$/i,
    /^FLOAT$/i, /^DOUBLE$/i,
    /^DATE$/i, /^DATETIME$/i, /^TIMESTAMP$/i,
    /^BOOLEAN$/i, /^BOOL$/i,
    /^TEXT$/i, /^LONGTEXT$/i
  ];
  
  // Si más del 50% de las columnas coinciden con patrones de tipos, es una fila de tipos
  const typeMatches = types.filter(type => 
    typePatterns.some(pattern => pattern.test(type))
  ).length;
  
  return typeMatches > types.length * 0.5;
}

/**
 * Parsea un CSV con la estructura detectada
 */
export function parseCSVWithStructure(csvText: string, structure: CSVStructure): ParsedCSVData {
  const lines = csvText.trim().split('\n');
  
  // Extraer solo las filas de datos
  const dataLines = lines.slice(structure.dataStartIndex);
  
  // Parsear datos manualmente para mayor control
  const data = dataLines.map((line) => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    structure.cleanHeaders.forEach((header: string, colIndex: number) => {
      if (values[colIndex] !== undefined) {
        row[header] = values[colIndex];
      }
    });
    
    return row;
  }).filter(row => Object.keys(row).length > 0); // Filtrar filas vacías

  // Si hay una fila de tipos, incluirla en los datos para que esté disponible
  let dataWithTypes = data;
  if (structure.hasTypeRow && structure.detectedTypes.length > 0) {
    // Crear una fila especial con los tipos SQL
    const typeRow: any = {};
    structure.cleanHeaders.forEach((header: string, colIndex: number) => {
      if (structure.detectedTypes[colIndex] !== undefined) {
        typeRow[header] = structure.detectedTypes[colIndex];
      }
    });
    
    // Insertar la fila de tipos al principio de los datos
    dataWithTypes = [typeRow, ...data];
  }

  return {
    headers: structure.cleanHeaders,
    types: structure.detectedTypes,
    data: dataWithTypes,
    structure: structure
  };
}

/**
 * Realiza el análisis inicial de los datos CSV
 */
export function performInitialAnalysis(data: any[], headers: string[]): InitialAnalysis {
  const totalRows = data.length;
  const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size;
  const redundancyPercentage = ((totalRows - uniqueRows) / totalRows) * 100;

  // Detectar clave primaria de forma inteligente
  let primaryKey = detectIntelligentPrimaryKey(headers);

  // Analizar cada columna
  const columnAnalysis = headers.map(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(values).size;
    const redundancyPercentage = ((values.length - uniqueValues) / values.length) * 100;
    
    // Detectar tipo de dato basado en el contenido
    const detectedType = detectColumnType(values, header);
    
    return {
      columnName: header,
      uniqueValues,
      totalRows: values.length,
      redundancyPercentage,
      shouldNormalize: redundancyPercentage > 20,
      detectedType: detectedType
    };
  });

  // DETECTAR FORMA NORMAL INICIAL
  const initialNormalForm = detectInitialNormalForm(data, headers, primaryKey);

  return {
    primaryKey,
    totalRows,
    uniqueRows,
    redundancyPercentage,
    columnAnalysis,
    initialNormalForm
  };
}

/**
 * Detecta la clave primaria de forma inteligente basándose en patrones comunes
 */
function detectIntelligentPrimaryKey(headers: string[]): string {
  // PATRÓN 1: Tabla de facturación (num_factura + id_producto)
  if (headers.some(h => h.toLowerCase().includes('num_factura') || h.toLowerCase().includes('factura')) &&
      headers.some(h => h.toLowerCase().includes('id_producto') || h.toLowerCase().includes('producto'))) {
    return 'num_factura,id_producto';
  }
  
  // PATRÓN 2: Tabla de transacciones con múltiples entidades
  if (headers.some(h => h.toLowerCase().includes('id_cliente')) &&
      headers.some(h => h.toLowerCase().includes('id_producto')) &&
      headers.some(h => h.toLowerCase().includes('cantidad') || h.toLowerCase().includes('precio'))) {
    return 'id_cliente,id_producto';
  }
  
  // PATRÓN 3: Tabla de catálogo simple (solo ID)
  if (headers.some(h => h.toLowerCase().includes('id_') && !h.toLowerCase().includes('factura'))) {
    const idColumn = headers.find(h => h.toLowerCase().includes('id_'));
    return idColumn || headers[0];
  }
  
  // PATRÓN 4: Tabla de relación muchos a muchos
  if (headers.filter(h => h.toLowerCase().includes('id_')).length >= 2) {
    const idColumns = headers.filter(h => h.toLowerCase().includes('id_'));
    return idColumns.join(',');
  }
  
  // PATRÓN 5: Tabla con código único (num_factura, codigo, etc.)
  if (headers.some(h => h.toLowerCase().includes('num_') || h.toLowerCase().includes('codigo'))) {
    const codeColumn = headers.find(h => h.toLowerCase().includes('num_') || h.toLowerCase().includes('codigo'));
    return codeColumn || headers[0];
  }
  
  // Fallback: usar la primera columna
  return headers[0];
}

/**
 * Detecta el tipo de dato de una columna basándose en su contenido
 */
export function detectColumnType(values: any[], headerName: string): string {
  // Si la columna parece ser un ID, usar INTEGER
  if (headerName.toLowerCase().includes('id') || headerName.toLowerCase().includes('_id')) {
    return 'INTEGER';
  }
  
  // Si todos los valores son numéricos
  if (values.every(val => !isNaN(Number(val)) && val !== '')) {
    const hasDecimals = values.some(val => val.toString().includes('.'));
    return hasDecimals ? 'DECIMAL(10,2)' : 'INTEGER';
  }
  
  // Si todos los valores son fechas válidas
  if (values.every(val => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  })) {
    return 'DATE';
  }
  
  // Por defecto, usar VARCHAR
  return 'VARCHAR(255)';
}

/**
 * Detecta la forma normal inicial de los datos
 */
function detectInitialNormalForm(data: any[], headers: string[], primaryKey: string) {
  let currentLevel = 1;
  let issues: string[] = [];
  
  // Verificar 1NF - Valores atómicos
  const hasAtomicValues = data.every(row => 
    headers.every(header => {
      const value = row[header];
      return value === null || value === undefined || 
             (typeof value === 'string' && !value.includes(','));
    })
  );
  
  if (!hasAtomicValues) {
    issues.push('Valores no atómicos detectados (múltiples valores en una celda)');
    return {
      level: 0,
      name: 'No Normalizada',
      description: 'Los datos contienen valores no atómicos',
      issues: issues
    };
  }
  
  // Verificar 2NF - Dependencias parciales
  const hasPartialDependencies = checkSecondNormalForm(primaryKey, headers, data);
  if (hasPartialDependencies) {
    issues.push('Dependencias parciales detectadas');
    return {
      level: 1,
      name: '1NF',
      description: 'Valores atómicos, pero con dependencias parciales',
      issues: issues
    };
  }
  
  currentLevel = 2;
  
  // Verificar 3NF - Dependencias transitivas
  const hasTransitiveDependencies = checkThirdNormalForm(primaryKey, headers, data);
  if (hasTransitiveDependencies) {
    issues.push('Dependencias transitivas detectadas');
    return {
      level: 2,
      name: '2NF',
      description: 'Sin dependencias parciales, pero con dependencias transitivas',
      issues: issues
    };
  }
  
  currentLevel = 3;
  
  return {
    level: currentLevel,
    name: '3NF',
    description: 'Datos completamente normalizados',
    issues: issues
  };
}

/**
 * Verifica si los datos cumplen con la segunda forma normal
 */
function checkSecondNormalForm(primaryKey: string, headers: string[], data: any[]): boolean {
  const pkColumns = primaryKey.split(',');
  
  // Si la PK es simple, no hay dependencias parciales
  if (pkColumns.length === 1) {
    return false;
  }
  
  // Verificar dependencias parciales conocidas
  const knownPartialDependencies = [
    { pk: 'num_factura,id_producto', dependent: 'fecha_factura' },
    { pk: 'num_factura,id_producto', dependent: 'id_cliente' },
    { pk: 'id_cliente,id_producto', dependent: 'nombre_cliente' },
    { pk: 'id_cliente,id_producto', dependent: 'email_cliente' }
  ];
  
  for (const dep of knownPartialDependencies) {
    if (dep.pk === primaryKey) {
      const hasDependency = data.every(row => {
        const pkValues = dep.pk.split(',').map(pk => row[pk]).join('|');
        const dependentValue = row[dep.dependent];
        return pkValues && dependentValue;
      });
      
      if (hasDependency) {
        return true;
      }
    }
  }
  
  // Verificar dependencias parciales generales
  for (const header of headers) {
    if (pkColumns.includes(header)) continue;
    
    for (const pkCol of pkColumns) {
      const hasDependency = data.every(row => {
        const pkValue = row[pkCol];
        const headerValue = row[header];
        return pkValue && headerValue;
      });
      
      if (hasDependency) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Verifica si los datos cumplen con la tercera forma normal
 */
function checkThirdNormalForm(primaryKey: string, headers: string[], data: any[]): boolean {
  const pkColumns = primaryKey.split(',');
  
  // Verificar dependencias transitivas conocidas
  const knownTransitiveDependencies = [
    { from: 'id_cliente', to: 'nombre_cliente' },
    { from: 'id_cliente', to: 'email_cliente' },
    { from: 'id_producto', to: 'descripcion_producto' },
    { from: 'id_producto', to: 'precio_unitario' }
  ];
  
  for (const dep of knownTransitiveDependencies) {
    if (pkColumns.includes(dep.from) && headers.includes(dep.to)) {
      const hasDependency = data.every(row => {
        const fromValue = row[dep.from];
        const toValue = row[dep.to];
        return fromValue && toValue;
      });
      
      if (hasDependency) {
        return true;
      }
    }
  }
  
  // Verificar dependencias transitivas generales
  for (const header of headers) {
    if (pkColumns.includes(header)) continue;
    
    for (const otherHeader of headers) {
      if (otherHeader === header || pkColumns.includes(otherHeader)) continue;
      
      const hasDependency = data.every(row => {
        const otherValue = row[otherHeader];
        const headerValue = row[header];
        return otherValue && headerValue;
      });
      
      if (hasDependency) {
        return true;
      }
    }
  }
  
  return false;
}

