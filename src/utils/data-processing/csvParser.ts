export interface ParsedCSV {
  headers: string[];
  data: any[];
  totalRows: number;
  totalColumns: number;
}

export interface CSVParseOptions {
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  removeQuotes?: boolean;
  maxRows?: number;
}

/**
 * Parsea un archivo CSV y retorna los datos estructurados
 */
export function parseCSVData(
  csvText: string, 
  options: CSVParseOptions = {}
): ParsedCSV | null {
  if (!csvText || typeof csvText !== 'string') {
    return null;
  }
  
  try {
    const lines = csvText.trim().split('\n');
    
    if (lines.length === 0) {
      return null;
    }
    
    // Parsear encabezados
    const headers = parseCSVLine(lines[0], options);
    
    if (headers.length === 0) {
      return null;
    }
    
    // Parsear filas de datos
    const dataLines = lines.slice(1);
    const maxRows = options.maxRows || dataLines.length;
    const data = dataLines
      .slice(0, maxRows)
      .map(line => parseCSVRow(line, headers, options))
      .filter(row => row !== null);
    
    return {
      headers,
      data,
      totalRows: data.length,
      totalColumns: headers.length
    };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return null;
  }
}

/**
 * Parsea una línea CSV individual
 */
function parseCSVLine(line: string, options: CSVParseOptions): string[] {
  if (!line) return [];
  
  let values = line.split(',');
  
  if (options.trimWhitespace !== false) {
    values = values.map(v => v.trim());
  }
  
  if (options.removeQuotes !== false) {
    values = values.map(v => v.replace(/^["']|["']$/g, ''));
  }
  
  if (options.skipEmptyLines !== false) {
    values = values.filter(v => v !== '');
  }
  
  return values;
}

/**
 * Parsea una fila de datos CSV
 */
function parseCSVRow(line: string, headers: string[], options: CSVParseOptions): any | null {
  if (!line) return null;
  
  const values = parseCSVLine(line, options);
  
  if (values.length === 0) return null;
  
  // Crear objeto con encabezados como claves
  const row: any = {};
  headers.forEach((header, index) => {
    if (values[index] !== undefined) {
      row[header] = values[index];
    } else {
      row[header] = '';
    }
  });
  
  return row;
}

/**
 * Valida que el CSV tenga una estructura válida
 */
export function validateCSVStructure(csvText: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!csvText || typeof csvText !== 'string') {
    errors.push('El archivo CSV está vacío o no es válido');
    return { isValid: false, errors, warnings };
  }
  
  const lines = csvText.trim().split('\n');
  
  if (lines.length === 0) {
    errors.push('El archivo CSV no contiene líneas');
    return { isValid: false, errors, warnings };
  }
  
  if (lines.length === 1) {
    warnings.push('El archivo CSV solo contiene encabezados');
  }
  
  // Verificar que la primera línea tenga contenido
  const firstLine = lines[0];
  if (!firstLine || firstLine.trim() === '') {
    errors.push('La primera línea (encabezados) está vacía');
  }
  
  // Verificar consistencia en el número de columnas
  const headerColumns = firstLine.split(',').length;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim() !== '') {
      const columns = line.split(',').length;
      if (columns !== headerColumns) {
        warnings.push(`Línea ${i + 1}: número de columnas inconsistente (${columns} vs ${headerColumns})`);
      }
    }
  }
  
  // Verificar si hay datos suficientes para análisis
  const dataLines = lines.slice(1).filter(line => line && line.trim() !== '');
  if (dataLines.length === 0) {
    warnings.push('No se encontraron filas de datos para analizar');
  }
  
  const isValid = errors.length === 0;
  
  return { isValid, errors, warnings };
}

/**
 * Limpia y normaliza los datos CSV
 */
export function cleanCSVData(csvText: string): string {
  if (!csvText || typeof csvText !== 'string') {
    return '';
  }
  
  try {
    // Remover caracteres de control
    let cleaned = csvText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Normalizar saltos de línea
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remover líneas vacías al final
    cleaned = cleaned.replace(/\n+$/, '');
    
    // Remover espacios en blanco al inicio y final
    cleaned = cleaned.trim();
    
    return cleaned;
  } catch (error) {
    console.error('Error cleaning CSV data:', error);
    return csvText;
  }
}

/**
 * Convierte los datos CSV a formato JSON
 */
export function csvToJSON(csvText: string): any[] | null {
  const parsed = parseCSVData(csvText);
  if (!parsed) return null;
  
  return parsed.data;
}

/**
 * Convierte los datos CSV a formato de tabla HTML
 */
export function csvToHTMLTable(csvText: string): string | null {
  const parsed = parseCSVData(csvText);
  if (!parsed) return null;
  
  try {
    let html = '<table border="1">';
    
    // Encabezados
    html += '<thead><tr>';
    parsed.headers.forEach(header => {
      html += `<th>${escapeHTML(header)}</th>`;
    });
    html += '</tr></thead>';
    
    // Datos
    html += '<tbody>';
    parsed.data.forEach(row => {
      html += '<tr>';
      parsed.headers.forEach(header => {
        html += `<td>${escapeHTML(row[header] || '')}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    
    html += '</table>';
    return html;
  } catch (error) {
    console.error('Error converting CSV to HTML:', error);
    return null;
  }
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Obtiene estadísticas básicas del CSV
 */
export function getCSVStats(csvText: string): {
  totalLines: number;
  totalColumns: number;
  hasHeaders: boolean;
  estimatedSize: string;
} | null {
  if (!csvText || typeof csvText !== 'string') {
    return null;
  }
  
  try {
    const lines = csvText.trim().split('\n');
    const totalLines = lines.length;
    const hasHeaders = totalLines > 0;
    
    let totalColumns = 0;
    if (hasHeaders) {
      totalColumns = lines[0].split(',').length;
    }
    
    // Calcular tamaño estimado (aproximado)
    const estimatedSize = formatBytes(csvText.length);
    
    return {
      totalLines,
      totalColumns,
      hasHeaders,
      estimatedSize
    };
  } catch (error) {
    console.error('Error getting CSV stats:', error);
    return null;
  }
}

/**
 * Formatea bytes en formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

