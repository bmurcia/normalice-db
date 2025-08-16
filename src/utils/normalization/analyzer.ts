import { Column, Table, EntityType, NormalizationLevel, FunctionalDependency, RedundancyPattern } from '../types/normalization';

// ===== ANALIZADOR INTELIGENTE DE ESTRUCTURA =====

export class StructureAnalyzer {
  private headers: string[] = [];
  private dataRows: string[][] = [];
  private tables: Map<string, Table> = new Map();

  constructor(csvData: string) {
    this.parseCSV(csvData);
  }

  // Parsear CSV y extraer estructura básica
  private parseCSV(csvData: string): void {
    const lines = csvData.trim().split('\n');
    this.headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    this.dataRows = lines.slice(1)
      .filter(row => row.trim().length > 0)
      .map(row => row.split(',').map(col => col.trim().replace(/"/g, '')));
  }

  // Análisis completo de la estructura
  public analyzeStructure(): Table[] {
    console.log('🔍 Iniciando análisis inteligente de estructura...');
    
    // PASO 1: Análisis inicial de columnas
    this.analyzeColumns();
    
    // PASO 2: Detectar patrones de entidades
    this.detectEntityPatterns();
    
    // PASO 3: Identificar dependencias funcionales
    this.analyzeFunctionalDependencies();
    
    // PASO 4: Calcular métricas de redundancia
    this.calculateRedundancyMetrics();
    
    // PASO 5: Determinar tipos de entidades
    this.determineEntityTypes();
    
    return Array.from(this.tables.values());
  }

  // Analizar cada columna individualmente
  private analyzeColumns(): void {
    this.headers.forEach((header, index) => {
      const columnName = this.extractColumnName(header);
      const tableName = this.extractTableName(header);
      
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, {
          name: tableName,
          purpose: '',
          columns: [],
          primaryKey: null,
          foreignKeys: [],
          data: [],
          entityType: EntityType.MAIN,
          normalizationLevel: NormalizationLevel.NONE
        });
      }

      const table = this.tables.get(tableName)!;
      const column: Column = {
        name: columnName,
        type: this.determineColumnType(columnName, index),
        isPrimaryKey: this.isPrimaryKey(columnName),
        isForeignKey: this.isForeignKey(columnName),
        isRequired: this.isRequired(columnName),
        reference: this.extractReference(columnName),
        data: this.extractColumnData(index),
        redundancyPercentage: 0,
        uniqueValues: 0,
        totalValues: 0
      };

      table.columns.push(column);
      
      // Extraer datos de la columna
      table.data = this.dataRows.map(row => [row[index] || '']);
    });
  }

  // Extraer nombre de tabla del header
  private extractTableName(header: string): string {
    if (header.includes('.')) {
      return header.split('.')[0].trim();
    }
    return 'MAIN_TABLE';
  }

  // Extraer nombre de columna del header
  private extractColumnName(header: string): string {
    if (header.includes('.')) {
      return header.split('.')[1] || header;
    }
    return header;
  }

  // Determinar tipo de columna de manera inteligente
  private determineColumnType(columnName: string, index: number): string {
    const name = columnName.toLowerCase();
    const sampleValues = this.getSampleValues(index, 20);
    
    // Tipos basados en nombres de columnas
    if (name.includes('id') && name !== 'id') return 'INTEGER';
    if (name.includes('precio') || name.includes('costo') || name.includes('salario') || name.includes('valor')) return 'DECIMAL(10,2)';
    if (name.includes('cantidad') || name.includes('stock') || name.includes('edad') || name.includes('cant')) return 'INTEGER';
    if (name.includes('fecha') || name.includes('date')) return 'DATE';
    if (name.includes('email') || name.includes('correo')) return 'VARCHAR(255)';
    if (name.includes('telefono') || name.includes('phone')) return 'VARCHAR(20)';
    if (name.includes('nombre') || name.includes('name') || name.includes('nom')) return 'VARCHAR(100)';
    if (name.includes('descripcion') || name.includes('description') || name.includes('desc')) return 'TEXT';
    if (name.includes('ciudad') || name.includes('city') || name.includes('pais') || name.includes('country')) return 'VARCHAR(100)';
    
    // Análisis de datos para determinar tipo
    if (sampleValues.length === 0) return 'VARCHAR(255)';
    
    // Verificar si son números
    const allNumbers = sampleValues.every(val => !isNaN(Number(val)) && val !== '');
    if (allNumbers) {
      const hasDecimals = sampleValues.some(val => val.includes('.'));
      return hasDecimals ? 'DECIMAL(10,2)' : 'INTEGER';
    }
    
    // Verificar si son fechas
    const allDates = sampleValues.every(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    });
    if (allDates) return 'DATE';
    
    // Verificar longitud para VARCHAR
    const maxLength = Math.max(...sampleValues.map(val => val.length));
    if (maxLength <= 50) return 'VARCHAR(50)';
    if (maxLength <= 100) return 'VARCHAR(100)';
    if (maxLength <= 255) return 'VARCHAR(255)';
    return 'TEXT';
  }

  // Obtener valores de muestra para análisis
  private getSampleValues(columnIndex: number, maxSamples: number): string[] {
    return this.dataRows
      .slice(0, maxSamples)
      .map(row => row[columnIndex] || '')
      .filter(val => val.length > 0);
  }

  // Verificar si es clave primaria
  private isPrimaryKey(columnName: string): boolean {
    const name = columnName.toLowerCase();
    return name === 'id' || 
           name.includes('id') && (name.includes('primary') || name.includes('_id')) ||
           name.includes('codigo') || 
           name.includes('numero') ||
           name.includes('orden');
  }

  // Verificar si es clave foránea
  private isForeignKey(columnName: string): boolean {
    const name = columnName.toLowerCase();
    return (name.includes('id') && !this.isPrimaryKey(columnName)) || 
           name.includes('_id') || 
           name.includes('id_') ||
           (name.includes('ref') && name.includes('_'));
  }

  // Verificar si es requerido
  private isRequired(columnName: string): boolean {
    if (this.isPrimaryKey(columnName)) return true;
    
    // Otras columnas pueden ser opcionales por defecto
    return false;
  }

  // Extraer referencia de clave foránea
  private extractReference(columnName: string): any {
    if (!this.isForeignKey(columnName)) return null;
    
    const name = columnName.toLowerCase();
    
    // Inferir tabla referenciada basándose en el nombre
    if (name.includes('_id')) {
      const referencedTable = name.replace('_id', '').replace('id_', '');
      return {
        table: referencedTable,
        column: 'id'
      };
    }
    
    if (name.includes('ref_')) {
      const referencedTable = name.replace('ref_', '');
      return {
        table: referencedTable,
        column: 'id'
      };
    }
    
    return null;
  }

  // Extraer datos de una columna específica
  private extractColumnData(columnIndex: number): string[] {
    return this.dataRows.map(row => row[columnIndex] || '');
  }

  // Detectar patrones de entidades en los datos
  private detectEntityPatterns(): void {
    this.tables.forEach((table, tableName) => {
      // Analizar patrones en los datos
      const patterns = this.analyzeDataPatterns(table);
      
      // Determinar el propósito de la tabla basándose en patrones
      table.purpose = this.determineTablePurpose(tableName, table.columns, patterns);
      
      // Identificar claves primarias y foráneas
      this.identifyKeys(table);
    });
  }

  // Analizar patrones en los datos
  private analyzeDataPatterns(table: Table): any {
    const patterns: any = {};
    
    table.columns.forEach(column => {
      const uniqueValues = new Set(column.data.filter(val => val.length > 0));
      const totalValues = column.data.filter(val => val.length > 0).length;
      
      column.uniqueValues = uniqueValues.size;
      column.totalValues = totalValues;
      column.redundancyPercentage = totalValues > 0 ? ((totalValues - uniqueValues.size) / totalValues) * 100 : 0;
      
      // Detectar patrones de repetición
      if (column.redundancyPercentage > 70) {
        patterns[column.name] = {
          type: 'HIGH_REDUNDANCY',
          percentage: column.redundancyPercentage,
          suggestedAction: 'NORMALIZE'
        };
      }
    });
    
    return patterns;
  }

  // Determinar propósito de la tabla
  private determineTablePurpose(tableName: string, columns: Column[], patterns: any): string {
    const name = tableName.toLowerCase();
    const columnNames = columns.map(col => col.name.toLowerCase());
    
    // Análisis basado en nombres de columnas
    if (name.includes('producto') || name.includes('product') || columnNames.some(n => n.includes('art'))) {
      return 'Almacena información de productos/artículos';
    }
    
    if (name.includes('cliente') || name.includes('customer') || columnNames.some(n => n.includes('cliente'))) {
      return 'Almacena información de clientes';
    }
    
    if (name.includes('empleado') || name.includes('employee')) {
      return 'Almacena información de empleados';
    }
    
    if (name.includes('categoria') || name.includes('category')) {
      return 'Almacena categorías de clasificación';
    }
    
    if (name.includes('proveedor') || name.includes('supplier')) {
      return 'Almacena información de proveedores';
    }
    
    if (name.includes('venta') || name.includes('sale') || columnNames.some(n => n.includes('orden'))) {
      return 'Almacena información de ventas/órdenes';
    }
    
    if (name.includes('factura') || name.includes('invoice')) {
      return 'Almacena información de facturas';
    }
    
    // Análisis basado en patrones de datos
    const highRedundancyColumns = Object.keys(patterns).filter(key => 
      patterns[key].type === 'HIGH_REDUNDANCY'
    );
    
    if (highRedundancyColumns.length > 0) {
      return `Tabla principal con datos que requieren normalización (${highRedundancyColumns.join(', ')})`;
    }
    
    return `Almacena información de ${tableName}`;
  }

  // Identificar claves primarias y foráneas
  private identifyKeys(table: Table): void {
    // Buscar clave primaria
    const primaryKey = table.columns.find(col => col.isPrimaryKey);
    if (primaryKey) {
      table.primaryKey = primaryKey;
    }
    
    // Buscar claves foráneas
    table.foreignKeys = table.columns.filter(col => col.isForeignKey);
  }

  // Analizar dependencias funcionales
  private analyzeFunctionalDependencies(): void {
    this.tables.forEach((table) => {
      const dependencies = this.findFunctionalDependencies(table);
      console.log(`Dependencias funcionales en ${table.name}:`, dependencies);
    });
  }

  // Encontrar dependencias funcionales
  private findFunctionalDependencies(table: Table): FunctionalDependency[] {
    const dependencies: FunctionalDependency[] = [];
    const columns = table.columns;
    
    // Análisis básico de dependencias basado en patrones
    columns.forEach(col1 => {
      columns.forEach(col2 => {
        if (col1 !== col2 && this.isFunctionalDependency(table, col1, col2)) {
          dependencies.push({
            determinant: [col1.name],
            dependent: [col2.name],
            confidence: 0.8,
            support: 0.7
          });
        }
      });
    });
    
    return dependencies;
  }

  // Verificar si existe dependencia funcional
  private isFunctionalDependency(table: Table, col1: Column, col2: Column): boolean {
    const col1Index = table.columns.findIndex(col => col === col1);
    const col2Index = table.columns.findIndex(col => col === col2);
    
    if (col1Index === -1 || col2Index === -1) return false;
    
    const valueMap = new Map<string, string>();
    
    for (const row of table.data) {
      const val1 = row[col1Index] || '';
      const val2 = row[col2Index] || '';
      
      if (valueMap.has(val1) && valueMap.get(val1) !== val2) {
        return false;
      }
      valueMap.set(val1, val2);
    }
    
    return true;
  }

  // Calcular métricas de redundancia
  private calculateRedundancyMetrics(): void {
    this.tables.forEach(table => {
      let totalRedundancy = 0;
      let columnCount = 0;
      
      table.columns.forEach(column => {
        if (column.totalValues > 0) {
          totalRedundancy += column.redundancyPercentage;
          columnCount++;
        }
      });
      
      if (columnCount > 0) {
        const averageRedundancy = totalRedundancy / columnCount;
        console.log(`Redundancia promedio en ${table.name}: ${averageRedundancy.toFixed(2)}%`);
      }
    });
  }

  // Determinar tipos de entidades
  private determineEntityTypes(): void {
    this.tables.forEach(table => {
      if (table.primaryKey && table.foreignKeys.length === 0) {
        table.entityType = EntityType.LOOKUP;
      } else if (table.foreignKeys.length > 0) {
        table.entityType = EntityType.TRANSACTION;
      } else {
        table.entityType = EntityType.MAIN;
      }
    });
  }

  // Obtener resultados del análisis
  public getAnalysisResults(): {
    tables: Table[];
    totalRows: number;
    totalColumns: number;
    redundancyScore: number;
    normalizationLevel: NormalizationLevel;
  } {
    const totalRows = this.dataRows.length;
    const totalColumns = this.headers.length;
    
    let totalRedundancy = 0;
    let columnCount = 0;
    
    this.tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.totalValues > 0) {
          totalRedundancy += column.redundancyPercentage;
          columnCount++;
        }
      });
    });
    
    const redundancyScore = columnCount > 0 ? totalRedundancy / columnCount : 0;
    
    // Determinar nivel de normalización
    let normalizationLevel = NormalizationLevel.NONE;
    if (redundancyScore < 30) {
      normalizationLevel = NormalizationLevel.THIRD_NF;
    } else if (redundancyScore < 60) {
      normalizationLevel = NormalizationLevel.SECOND_NF;
    } else if (redundancyScore < 80) {
      normalizationLevel = NormalizationLevel.FIRST_NF;
    }
    
    return {
      tables: Array.from(this.tables.values()),
      totalRows,
      totalColumns,
      redundancyScore,
      normalizationLevel
    };
  }
}

