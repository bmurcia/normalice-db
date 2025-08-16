// ===== UTILIDADES PARA DIAGRAMAS Y SQL =====

export interface SQLTable {
  name: string;
  columns: SQLColumn[];
  relationships: SQLRelationship[];
  purpose: string;
}

export interface SQLColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
  reference?: string;
}

export interface SQLRelationship {
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
}

// Clase para generar SQL mejorado y CORREGIDO
export class ImprovedSQLGenerator {
  
  // Generar SQL completo y válido
  public generateSQL(tables: SQLTable[]): string {
    let sql = '';
    
    // 1. Crear tablas
    sql += this.generateTables(tables);
    
    // 2. Agregar claves foráneas
    sql += this.generateForeignKeys(tables);
    
    // 3. Crear índices
    sql += this.generateIndexes(tables);
    
    // 4. Constraints de validación
    sql += this.generateConstraints(tables);
    
    // 5. Datos de ejemplo
    sql += this.generateSampleData(tables);
    
    // 6. Vistas útiles
    sql += this.generateViews(tables);
    
    
    return sql;
  }

  private generateTables(tables: SQLTable[]): string {
    let sql = `-- ===== 1. CREACIÓN DE TABLAS =====\n\n`;
    
    // Ordenar tablas por dependencias
    const orderedTables = this.orderTablesByDependencies(tables);
    
    orderedTables.forEach(table => {
      sql += `-- Crear tabla: ${table.name}\n`;
      sql += `-- Propósito: ${table.purpose}\n`;
      sql += `CREATE TABLE ${table.name} (\n`;
      
      const columns = table.columns.map((col, _index) => {
        let definition = `    ${col.name} ${col.type}`;
        
        if (col.isPrimaryKey) {
          // Solo usar IDENTITY en tipos numéricos
          if (col.type.includes('INT') || col.type.includes('BIGINT')) {
            definition += ' IDENTITY(1,1) PRIMARY KEY';
          } else {
            definition += ' PRIMARY KEY';
          }
        } else if (col.isRequired) {
          definition += ' NOT NULL';
        }
        
        return definition;
      });
      
      sql += columns.join(',\n');
      sql += '\n);\n\n';
    });
    
    return sql;
  }

  private generateForeignKeys(tables: SQLTable[]): string {
    let sql = `-- ===== 2. CLAVES FORÁNEAS =====\n\n`;
    
    let hasForeignKeys = false;
    
    // Primero verificar relaciones explícitas
    tables.forEach(table => {
      if (table.relationships && table.relationships.length > 0) {
        table.relationships.forEach(rel => {
          if (rel.type !== 'MANY_TO_MANY' && rel.to && rel.fromColumn && rel.toColumn) {
            hasForeignKeys = true;
            const constraintName = `FK_${table.name}_${rel.to}`;
            sql += `-- Agregar clave foránea: ${table.name}.${rel.fromColumn} → ${rel.to}.${rel.toColumn}\n`;
            sql += `ALTER TABLE ${table.name} ADD CONSTRAINT ${constraintName}\n`;
            sql += `FOREIGN KEY (${rel.fromColumn}) REFERENCES ${rel.to}(${rel.toColumn});\n\n`;
          }
        });
      }
      
      // También verificar columnas marcadas como FK
      table.columns.forEach(column => {
        if (column.isForeignKey && !column.isPrimaryKey) {
          hasForeignKeys = true;
          
          // Determinar la tabla objetivo basándose en el nombre de la columna
          let targetTableName = column.name.replace(/^id_/, '').replace(/_id$/, '').replace(/^id/, '');
          
          // Mapeos especiales para nombres comunes
          const tableNameMappings: { [key: string]: string } = {
            'cliente': 'CLIENTES',
            'producto': 'PRODUCTOS',
            'factura': 'FACTURAS',
            'empleado': 'EMPLEADOS',
            'departamento': 'DEPARTAMENTOS',
            'cargo': 'CARGOS',
            'categoria': 'CATEGORIAS',
            'proveedor': 'PROVEEDORES'
          };
          
          const targetTable = tableNameMappings[targetTableName.toLowerCase()] || 
                             targetTableName.toUpperCase() + 'S';
          
          const constraintName = `FK_${table.name}_${targetTable}`;
          sql += `-- Agregar clave foránea: ${table.name}.${column.name} → ${targetTable}.id_${targetTableName}\n`;
          sql += `ALTER TABLE ${table.name} ADD CONSTRAINT ${constraintName}\n`;
          sql += `FOREIGN KEY (${column.name}) REFERENCES ${targetTable}(id_${targetTableName});\n\n`;
        }
      });
    });
    
    if (!hasForeignKeys) {
      sql += `-- No se detectaron claves foráneas para agregar\n\n`;
    }
    
    return sql;
  }

  private generateIndexes(tables: SQLTable[]): string {
    let sql = `-- ===== 3. ÍNDICES PARA OPTIMIZAR RENDIMIENTO =====\n\n`;
    
    tables.forEach(table => {
      // Índices en claves foráneas válidas (relaciones explícitas)
      if (table.relationships && table.relationships.length > 0) {
        table.relationships.forEach(rel => {
          if (rel.type !== 'MANY_TO_MANY' && rel.fromColumn && rel.to) {
            const indexName = `idx_${table.name.toLowerCase()}_${rel.fromColumn}`;
            sql += `CREATE INDEX ${indexName} ON ${table.name}(${rel.fromColumn});\n`;
          }
        });
      }
      
      // Índices en columnas marcadas como FK
      table.columns.forEach(col => {
        if (col.isForeignKey && !col.isPrimaryKey) {
          const indexName = `idx_${table.name.toLowerCase()}_${col.name}`;
          sql += `CREATE INDEX ${indexName} ON ${table.name}(${col.name});\n`;
        }
      });
      
      // Índices en columnas de búsqueda frecuente
      table.columns.forEach(col => {
        if (this.shouldIndexColumn(col)) {
          const indexName = `idx_${table.name.toLowerCase()}_${col.name}`;
          sql += `CREATE INDEX ${indexName} ON ${table.name}(${col.name});\n`;
        }
      });
      
      sql += '\n';
    });
    
    return sql;
  }

  private generateConstraints(tables: SQLTable[]): string {
    let sql = `-- ===== 4. CONSTRAINTS DE VALIDACIÓN =====\n\n`;
    
    let hasConstraints = false;
    
    tables.forEach(table => {
      table.columns.forEach(col => {
        const constraint = this.generateColumnConstraint(table.name, col);
        if (constraint) {
          hasConstraints = true;
          sql += constraint;
        }
      });
    });
    
    if (!hasConstraints) {
      sql += `-- No se requieren constraints de validación adicionales\n\n`;
    }
    
    return sql;
  }

  private generateColumnConstraint(tableName: string, column: SQLColumn): string {
    const name = column.name.toLowerCase();
    let constraint = '';
    
    // Constraints para valores numéricos
    if (column.type.includes('DECIMAL') || column.type.includes('INT')) {
      if (name.includes('precio') || name.includes('costo') || name.includes('valor')) {
        const constraintName = `chk_${tableName.toLowerCase()}_${column.name}_positivo`;
        constraint += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName}\n`;
        constraint += `CHECK (${column.name} >= 0);\n\n`;
      }
      
      if (name.includes('cantidad') || name.includes('stock')) {
        const constraintName = `chk_${tableName.toLowerCase()}_${column.name}_no_negativo`;
        constraint += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName}\n`;
        constraint += `CHECK (${column.name} >= 0);\n\n`;
      }
    }
    
    // Constraints para emails
    if (name.includes('email') || name.includes('correo')) {
      const constraintName = `chk_${tableName.toLowerCase()}_${column.name}_formato`;
      constraint += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName}\n`;
      constraint += `CHECK (${column.name} LIKE '%_@__%.__%');\n\n`;
    }
    
    // Constraints para fechas
    if (name.includes('fecha') || name.includes('date')) {
      const constraintName = `chk_${tableName.toLowerCase()}_${column.name}_valida`;
      constraint += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName}\n`;
      constraint += `CHECK (${column.name} IS NOT NULL AND ${column.name} <= CURRENT_TIMESTAMP);\n\n`;
    }
    
    return constraint;
  }

  private generateSampleData(tables: SQLTable[]): string {
    let sql = `-- ===== 5. DATOS DE EJEMPLO =====\n\n`;
    
    tables.forEach(table => {
      sql += `-- Datos de ejemplo para ${table.name}\n`;
      sql += this.generateTableSampleData(table);
      sql += '\n';
    });
    
    return sql;
  }

  private generateTableSampleData(table: SQLTable): string {
    let sql = '';
    
    if (table.columns.length === 0) return sql;
    
    // Generar datos de ejemplo más realistas
    const sampleData = this.getSampleDataForTable(table);
    
    sampleData.forEach((row, _index) => {
      const values = table.columns.map(col => {
        const value = row[col.name];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        } else {
          return value.toString();
        }
      });
      
      sql += `INSERT INTO ${table.name} (${table.columns.map(c => c.name).join(', ')}) VALUES (${values.join(', ')});\n`;
    });
    
    return sql;
  }

  private getSampleDataForTable(table: SQLTable): any[] {
    const tableName = table.name.toLowerCase();
    const sampleData = [];
    
    if (tableName.includes('cliente')) {
      sampleData.push(
        { id_cliente: 1, nombre: 'Juan Pérez', email: 'juan@email.com' },
        { id_cliente: 2, nombre: 'María García', email: 'maria@email.com' },
        { id_cliente: 3, nombre: 'Carlos López', email: 'carlos@email.com' }
      );
    } else if (tableName.includes('producto')) {
      sampleData.push(
        { id_producto: 1, nombre: 'Laptop HP', precio: 1200.00 },
        { id_producto: 2, nombre: 'Mouse Inalámbrico', precio: 25.50 },
        { id_producto: 3, nombre: 'Teclado Mecánico', precio: 89.99 }
      );
    } else if (tableName.includes('categoria')) {
      sampleData.push(
        { id_categoria: 1, nombre: 'Electrónicos' },
        { id_categoria: 2, nombre: 'Accesorios' },
        { id_categoria: 3, nombre: 'Software' }
      );
    } else if (tableName.includes('factura')) {
      sampleData.push(
        { id_factura: 1, fecha: '2024-01-15', id_cliente: 1, subtotal: 1200.00, impuesto: 120.00, total: 1320.00 },
        { id_factura: 2, fecha: '2024-01-16', id_cliente: 2, subtotal: 115.49, impuesto: 11.55, total: 127.04 },
        { id_factura: 3, fecha: '2024-01-17', id_cliente: 3, subtotal: 89.99, impuesto: 9.00, total: 98.99 }
      );
    } else if (tableName.includes('detalle')) {
      sampleData.push(
        { id_detalle: 1, id_factura: 1, id_producto: 1, cantidad: 1, precio_unitario: 1200.00, subtotal: 1200.00 },
        { id_detalle: 2, id_factura: 2, id_producto: 2, cantidad: 1, precio_unitario: 25.50, subtotal: 25.50 },
        { id_detalle: 3, id_factura: 3, id_producto: 3, cantidad: 1, precio_unitario: 89.99, subtotal: 89.99 }
      );
    } else {
      // Datos genéricos para otras tablas
      for (let i = 1; i <= 3; i++) {
        const row: any = {};
        table.columns.forEach(col => {
          if (col.isPrimaryKey) {
            row[col.name] = i;
          } else if (col.type.includes('VARCHAR')) {
            row[col.name] = `Ejemplo ${i}`;
          } else if (col.type.includes('INT')) {
            row[col.name] = Math.floor(Math.random() * 100) + 1;
          } else if (col.type.includes('DECIMAL')) {
            row[col.name] = (Math.random() * 1000).toFixed(2);
          } else if (col.type.includes('DATE')) {
            row[col.name] = `2024-01-${String(i).padStart(2, '0')}`;
          } else {
            row[col.name] = `Valor ${i}`;
          }
        });
        sampleData.push(row);
      }
    }
    
    return sampleData;
  }

  private generateViews(tables: SQLTable[]): string {
    let sql = `-- ===== 6. VISTAS ÚTILES =====\n\n`;
    
    // Vista principal si hay múltiples entidades
    if (tables.length > 1) {
      sql += this.generateMainView(tables);
    }
    
    return sql;
  }

  private generateMainView(tables: SQLTable[]): string {
    let sql = `-- Vista principal con información completa\n`;
    sql += `-- Ajusta según la estructura de tus tablas\n`;
    sql += `CREATE VIEW v_informacion_completa AS\n`;
    sql += `SELECT \n`;
    
    // Agregar columnas de todas las tablas
    tables.forEach((table, tableIndex) => {
      table.columns.forEach((col, colIndex) => {
        if (tableIndex > 0 || colIndex > 0) sql += `,\n`;
        sql += `    ${table.name}.${col.name} AS ${table.name}_${col.name}`;
      });
    });
    
    sql += `\nFROM ${tables[0].name}`;
    
    // Agregar JOINs apropiados basándose en las relaciones
    for (let i = 1; i < tables.length; i++) {
      const table = tables[i];
      const prevTable = tables[i - 1];
      
      // Buscar relación entre tablas
      const relationship = table.relationships.find(rel => rel.to === prevTable.name);
      
      if (relationship && relationship.fromColumn && relationship.toColumn) {
        sql += `\nLEFT JOIN ${table.name} ON ${prevTable.name}.${relationship.toColumn} = ${table.name}.${relationship.fromColumn}`;
      } else {
        // Si no hay relación clara, usar LEFT JOIN con la primera columna de ID
        const prevTablePK = prevTable.columns.find(col => col.isPrimaryKey);
        const currentTableFK = table.columns.find(col => col.name.toLowerCase().includes(prevTable.name.toLowerCase().slice(0, -1)));
        
        if (prevTablePK && currentTableFK) {
          sql += `\nLEFT JOIN ${table.name} ON ${prevTable.name}.${prevTablePK.name} = ${table.name}.${currentTableFK.name}`;
        } else {
          sql += `\nLEFT JOIN ${table.name} ON 1=1`; // JOIN simple si no hay relación clara
        }
      }
    }
    
    sql += `;\n\n`;
    
    return sql;
  }
  
  private orderTablesByDependencies(tables: SQLTable[]): SQLTable[] {
    // Implementación simplificada de ordenamiento topológico
    const result: SQLTable[] = [];
    const visited = new Set<string>();
    
    const visit = (tableName: string) => {
      if (visited.has(tableName)) return;
      
      const table = tables.find(t => t.name === tableName);
      if (!table) return;
      
      // Visitar dependencias primero
      table.relationships.forEach(rel => {
        if (rel.type !== 'MANY_TO_MANY' && rel.to) {
          visit(rel.to);
        }
      });
      
      visited.add(tableName);
      result.push(table);
    };
    
    tables.forEach(table => visit(table.name));
    
    return result;
  }

  private shouldIndexColumn(column: SQLColumn): boolean {
    const name = column.name.toLowerCase();
    
    // Columnas de búsqueda frecuente
    if (name.includes('nombre') || name.includes('name')) return true;
    if (name.includes('email') || name.includes('correo')) return true;
    if (name.includes('codigo') || name.includes('code')) return true;
    if (name.includes('fecha') || name.includes('date')) return true;
    
    return false;
  }
}

// Función de utilidad para convertir entidades a formato SQL CORREGIDO
export function convertEntitiesToSQLTables(entities: any[]): SQLTable[] {
  return entities.map(entity => ({
    name: entity.name,
    purpose: entity.purpose || `Tabla para ${entity.name}`,
    columns: entity.columns.map((col: any) => ({
      name: col.name,
      type: col.type,
      isPrimaryKey: col.isPrimaryKey || false,
      isForeignKey: col.isForeignKey || false,
      isRequired: col.isRequired || false,
      reference: col.reference?.table
    })),
    relationships: entity.relationships.map((rel: any) => ({
      from: entity.name,
      to: rel.references?.table || '',
      fromColumn: rel.column || '',
      toColumn: rel.references?.column || 'id',
      type: 'ONE_TO_MANY' as const
    })).filter((rel: any) => rel.to && rel.fromColumn) // Solo relaciones válidas
  }));
}

// ===== SISTEMA DE GENERACIÓN DE DIAGRAMAS VISUALES =====

export interface TableNode {
  id: string;
  name: string;
  columns: ColumnNode[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColumnNode {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
}

export interface RelationshipEdge {
  id: string;
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  label: string;
}

export interface DiagramData {
  tables: TableNode[];
  relationships: RelationshipEdge[];
  width: number;
  height: number;
}

// Clase para generar diagramas visuales
export class DiagramGenerator {
  
  // Generar diagrama completo
  public generateDiagram(entities: any[]): DiagramData {
    console.log('🎨 Generando diagrama visual de la base de datos...');
    
    // Convertir entidades a nodos de tabla
    const tables = this.createTableNodes(entities);
    
    // Crear relaciones entre tablas
    const relationships = this.createRelationships(entities);
    
    // Calcular posiciones de las tablas
    this.calculateTablePositions(tables, relationships);
    
    // Calcular dimensiones del diagrama
    const { width, height } = this.calculateDiagramDimensions(tables);
    
    return {
      tables,
      relationships,
      width,
      height
    };
  }

  // Crear nodos de tabla
  private createTableNodes(entities: any[]): TableNode[] {
    return entities.map((entity, _index) => {
              const columns = entity.columns.map((col: any, _colIndex: number) => ({
        id: `${entity.name}_${col.name}`,
        name: col.name,
        type: col.type,
        isPrimaryKey: col.isPrimaryKey || false,
        isForeignKey: col.isForeignKey || false,
        isRequired: col.isRequired || false
      }));

      return {
        id: entity.name,
        name: entity.name,
        columns,
        x: 0, // Se calculará después
        y: 0, // Se calculará después
        width: this.calculateTableWidth(columns),
        height: this.calculateTableHeight(columns)
      };
    });
  }

  // Crear relaciones entre tablas
  private createRelationships(entities: any[]): RelationshipEdge[] {
    const relationships: RelationshipEdge[] = [];
    
    entities.forEach(entity => {
      entity.relationships.forEach((rel: any) => {
        if (rel.references && rel.references.table) {
          const relationship: RelationshipEdge = {
            id: `${entity.name}_${rel.column}_${rel.references.table}`,
            from: entity.name,
            to: rel.references.table,
            fromColumn: rel.column,
            toColumn: rel.references.column || 'id',
            type: 'ONE_TO_MANY',
            label: `${rel.column} → ${rel.references.table}.${rel.references.column || 'id'}`
          };
          relationships.push(relationship);
        }
      });
    });
    
    return relationships;
  }

  // Calcular ancho de tabla basado en columnas
  private calculateTableWidth(columns: ColumnNode[]): number {
    const maxColumnNameLength = Math.max(...columns.map(col => col.name.length));
    const maxTypeLength = Math.max(...columns.map(col => col.type.length));
    const totalLength = Math.max(maxColumnNameLength, maxTypeLength);
    
    // Ancho mínimo de 200px, más 10px por cada 10 caracteres
    return Math.max(200, 200 + Math.ceil(totalLength / 10) * 10);
  }

  // Calcular alto de tabla basado en número de columnas
  private calculateTableHeight(columns: ColumnNode[]): number {
    const headerHeight = 40; // Alto del título de la tabla
    const columnHeight = 30; // Alto por columna
    const padding = 20; // Padding interno
    
    return headerHeight + (columns.length * columnHeight) + padding;
  }

  // Calcular posiciones de las tablas
  private calculateTablePositions(tables: TableNode[], _relationships: RelationshipEdge[]): void {
    const spacing = 300; // Espacio entre tablas
    const startX = 50;
    const startY = 50;
    
    // Organizar tablas en una cuadrícula
    const columnsPerRow = Math.ceil(Math.sqrt(tables.length));
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / columnsPerRow);
      const col = index % columnsPerRow;
      
      table.x = startX + (col * spacing);
      table.y = startY + (row * spacing);
    });
  }

  // Calcular dimensiones del diagrama
  private calculateDiagramDimensions(tables: TableNode[]): { width: number; height: number } {
    if (tables.length === 0) {
      return { width: 800, height: 600 };
    }
    
    const maxX = Math.max(...tables.map(t => t.x + t.width));
    const maxY = Math.max(...tables.map(t => t.y + t.height));
    
    return {
      width: maxX + 100, // 100px de margen
      height: maxY + 100
    };
  }

  // Generar SVG del diagrama
  public generateSVG(diagram: DiagramData): string {
    let svg = `<svg width="${diagram.width}" height="${diagram.height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Estilos CSS
    svg += `<defs>\n`;
    svg += `<style>\n`;
    svg += `.table-header { fill: #3b82f6; stroke: #1e40af; stroke-width: 2; }\n`;
    svg += `.table-header-text { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }\n`;
    svg += `.table-body { fill: white; stroke: #6b7280; stroke-width: 1; }\n`;
    svg += `.column-text { fill: #374151; font-family: Arial, sans-serif; font-size: 12px; }\n`;
    svg += `.pk-badge { fill: #10b981; stroke: #059669; stroke-width: 1; }\n`;
    svg += `.fk-badge { fill: #f59e0b; stroke: #d97706; stroke-width: 1; }\n`;
    svg += `.badge-text { fill: white; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; }\n`;
    svg += `.relationship-line { stroke: #6b7280; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }\n`;
    svg += `.relationship-label { fill: #6b7280; font-family: Arial, sans-serif; font-size: 10px; }\n`;
    svg += `</style>\n`;
    
    // Definir marcador de flecha
    svg += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">\n`;
    svg += `<polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />\n`;
    svg += `</marker>\n`;
    svg += `</defs>\n`;
    
    // Dibujar relaciones primero (para que estén detrás de las tablas)
    svg += this.drawRelationships(diagram.relationships, diagram.tables);
    
    // Dibujar tablas
    svg += this.drawTables(diagram.tables);
    
    svg += `</svg>`;
    
    return svg;
  }

  // Dibujar tablas
  private drawTables(tables: TableNode[]): string {
    let svg = '';
    
    tables.forEach(table => {
      // Cuerpo de la tabla
      svg += `<rect x="${table.x}" y="${table.y}" width="${table.width}" height="${table.height}" class="table-body" />\n`;
      
      // Encabezado de la tabla
      svg += `<rect x="${table.x}" y="${table.y}" width="${table.width}" height="40" class="table-header" />\n`;
      svg += `<text x="${table.x + table.width/2}" y="${table.y + 25}" text-anchor="middle" class="table-header-text">${table.name}</text>\n`;
      
      // Columnas
      table.columns.forEach((column, index) => {
        const y = table.y + 60 + (index * 30);
        
        // Texto de la columna
        svg += `<text x="${table.x + 10}" y="${y}" class="column-text">${column.name}</text>\n`;
        svg += `<text x="${table.x + table.width - 10}" y="${y}" text-anchor="end" class="column-text">${column.type}</text>\n`;
        
        // Badges para PK y FK
        if (column.isPrimaryKey) {
          svg += `<rect x="${table.x + 5}" y="${y - 15}" width="20" height="15" rx="3" class="pk-badge" />\n`;
          svg += `<text x="${table.x + 15}" y="${y - 5}" text-anchor="middle" class="badge-text">PK</text>\n`;
        }
        
        if (column.isForeignKey) {
          svg += `<rect x="${table.x + 30}" y="${y - 15}" width="20" height="15" rx="3" class="fk-badge" />\n`;
          svg += `<text x="${table.x + 40}" y="${y - 5}" text-anchor="middle" class="badge-text">FK</text>\n`;
        }
      });
    });
    
    return svg;
  }

  // Dibujar relaciones
  private drawRelationships(relationships: RelationshipEdge[], tables: TableNode[]): string {
    let svg = '';
    
    relationships.forEach(rel => {
      const fromTable = tables.find(t => t.id === rel.from);
      const toTable = tables.find(t => t.id === rel.to);
      
      if (fromTable && toTable) {
        // Calcular puntos de conexión
        const fromPoint = this.getConnectionPoint(fromTable, rel.fromColumn, 'right');
        const toPoint = this.getConnectionPoint(toTable, rel.toColumn, 'left');
        
        // Dibujar línea
        svg += `<line x1="${fromPoint.x}" y1="${fromPoint.y}" x2="${toPoint.x}" y2="${toPoint.y}" class="relationship-line" />\n`;
        
        // Etiqueta de la relación
        const midX = (fromPoint.x + toPoint.x) / 2;
        const midY = (fromPoint.y + toPoint.y) / 2;
        svg += `<text x="${midX}" y="${midY - 5}" text-anchor="middle" class="relationship-label">${rel.label}</text>\n`;
      }
    });
    
    return svg;
  }

  // Obtener punto de conexión en una tabla
  private getConnectionPoint(table: TableNode, columnName: string, side: 'left' | 'right'): { x: number; y: number } {
    const columnIndex = table.columns.findIndex(col => col.name === columnName);
    if (columnIndex === -1) {
      // Si no se encuentra la columna, usar el centro de la tabla
      return {
        x: side === 'left' ? table.x : table.x + table.width,
        y: table.y + table.height / 2
      };
    }
    
    const y = table.y + 60 + (columnIndex * 30) + 15; // Centro de la columna
    const x = side === 'left' ? table.x : table.x + table.width;
    
    return { x, y };
  }

  // Generar HTML del diagrama
  public generateHTML(diagram: DiagramData): string {
    const svg = this.generateSVG(diagram);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Diagrama de Base de Datos</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f8fafc;
        }
        .diagram-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin: 20px 0;
        }
        .diagram-title {
            text-align: center;
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        .diagram-svg {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: white;
        }
        .legend {
            margin-top: 20px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .legend h3 {
            margin-top: 0;
            color: #374151;
        }
        .legend-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        .legend-color {
            width: 20px;
            height: 15px;
            margin-right: 10px;
            border-radius: 3px;
        }
        .legend-text {
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="diagram-container">
        <div class="diagram-title">Diagrama de Base de Datos Normalizada</div>
        <div class="diagram-svg">
            ${svg}
        </div>
        <div class="legend">
            <h3>Leyenda</h3>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #3b82f6;"></div>
                <div class="legend-text">Encabezado de tabla</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #10b981;"></div>
                <div class="legend-text">Clave Primaria (PK)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #f59e0b;"></div>
                <div class="legend-text">Clave Foránea (FK)</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #6b7280;"></div>
                <div class="legend-text">Relación entre tablas</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

// Función de utilidad para convertir entidades a formato de diagrama
export function convertEntitiesToDiagramData(entities: any[]): DiagramData {
  const generator = new DiagramGenerator();
  return generator.generateDiagram(entities);
}

// Función para generar SVG del diagrama
export function generateDiagramSVG(entities: any[]): string {
  const generator = new DiagramGenerator();
  const diagram = generator.generateDiagram(entities);
  return generator.generateSVG(diagram);
}

// Función para generar HTML del diagrama
export function generateDiagramHTML(entities: any[]): string {
  const generator = new DiagramGenerator();
  const diagram = generator.generateDiagram(entities);
  return generator.generateHTML(diagram);
}
