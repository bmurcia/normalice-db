// ===== GENERADOR SQL PARA NORMALIZACIÓN =====

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
    
    
    return sql;
  }

  private generateTables(tables: SQLTable[]): string {
    let sql = `-- ===== 1. CREACIÓN DE TABLAS =====\n\n`;
    
    // Ordenar tablas por dependencias
    const orderedTables = this.orderTablesByDependencies(tables);
    
    orderedTables.forEach(table => {
      sql += `-- Crear tabla: ${table.name}\n`;
      sql += `CREATE TABLE ${table.name} (\n`;
      
      const columns = table.columns.map((col, _index) => {
        let definition = `    ${col.name} ${col.type}`;
        
        if (col.isPrimaryKey) {
          // Solo usar IDENTITY en IDs numéricos, no en códigos como num_factura
          if (col.type.includes('INT') && !col.name.toLowerCase().includes('num_')) {
            definition += ' IDENTITY(1,1) PRIMARY KEY';
          } else if (col.type.includes('VARCHAR') && col.name.toLowerCase().includes('id')) {
            // Si es un ID pero VARCHAR, convertirlo a INT
            definition = `    ${col.name} INT IDENTITY(1,1) PRIMARY KEY`;
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
    const generatedConstraints = new Set(); // Para evitar duplicados
    
    // Generar claves foráneas basadas en relaciones explícitas
    tables.forEach(table => {
      if (table.relationships && table.relationships.length > 0) {
        table.relationships.forEach(rel => {
          if (rel.type !== 'MANY_TO_MANY' && rel.to && rel.fromColumn && rel.toColumn) {
            // Verificar que la tabla objetivo existe
            const targetTableExists = tables.some(t => t.name === rel.to);
            if (!targetTableExists) {
              console.warn(`⚠️ Tabla objetivo no encontrada: ${rel.to}`);
              return;
            }
            
            const constraintKey = `${table.name}_${rel.fromColumn}_${rel.to}`;
            if (!generatedConstraints.has(constraintKey)) {
              hasForeignKeys = true;
              generatedConstraints.add(constraintKey);
              
              const constraintName = `FK_${table.name}_${rel.to}`;
              sql += `-- Agregar clave foránea: ${table.name}.${rel.fromColumn} → ${rel.to}.${rel.toColumn}\n`;
              sql += `ALTER TABLE ${table.name} ADD CONSTRAINT ${constraintName}\n`;
              sql += `FOREIGN KEY (${rel.fromColumn}) REFERENCES ${rel.to}(${rel.toColumn});\n\n`;
            }
          }
        });
      }
    });
    
    // Generar claves foráneas basadas en columnas marcadas como FK
    tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.isForeignKey && !column.isPrimaryKey) {
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
          
          // Verificar que la tabla objetivo existe
          const targetTableExists = tables.some(t => t.name === targetTable);
          if (!targetTableExists) {
            console.warn(`⚠️ Tabla objetivo no encontrada: ${targetTable}`);
            return;
          }
          
          const constraintKey = `${table.name}_${column.name}_${targetTable}`;
          if (!generatedConstraints.has(constraintKey)) {
            hasForeignKeys = true;
            generatedConstraints.add(constraintKey);
            
            const constraintName = `FK_${table.name}_${targetTable}`;
            sql += `-- Agregar clave foránea: ${table.name}.${column.name} → ${targetTable}.${column.name}\n`;
            sql += `ALTER TABLE ${table.name} ADD CONSTRAINT ${constraintName}\n`;
            sql += `FOREIGN KEY (${column.name}) REFERENCES ${targetTable}(${column.name});\n\n`;
          }
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
      const generatedIndexes = new Set(); // Para evitar duplicados
      
      // Índices en claves foráneas válidas (relaciones explícitas)
      if (table.relationships && table.relationships.length > 0) {
        table.relationships.forEach(rel => {
          if (rel.type !== 'MANY_TO_MANY' && rel.fromColumn && rel.to) {
            const indexName = `idx_${table.name.toLowerCase()}_${rel.fromColumn}`;
            if (!generatedIndexes.has(indexName)) {
              generatedIndexes.add(indexName);
              sql += `CREATE INDEX ${indexName} ON ${table.name}(${rel.fromColumn});\n`;
            }
          }
        });
      }
      
      // Índices en columnas marcadas como FK
      table.columns.forEach(col => {
        if (col.isForeignKey && !col.isPrimaryKey) {
          const indexName = `idx_${table.name.toLowerCase()}_${col.name}`;
          if (!generatedIndexes.has(indexName)) {
            generatedIndexes.add(indexName);
            sql += `CREATE INDEX ${indexName} ON ${table.name}(${col.name});\n`;
          }
        }
      });
      
      // Índices en columnas de búsqueda frecuente
      table.columns.forEach(col => {
        if (this.shouldIndexColumn(col)) {
          const indexName = `idx_${table.name.toLowerCase()}_${col.name}`;
          if (!generatedIndexes.has(indexName)) {
            generatedIndexes.add(indexName);
            sql += `CREATE INDEX ${indexName} ON ${table.name}(${col.name});\n`;
          }
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

// Función inteligente para detectar tipos de columnas SQL
function detectSQLColumnType(columnName: string, originalType: string, isPrimaryKey: boolean, isForeignKey: boolean): string {
  const name = columnName.toLowerCase();
  
  // IDs siempre deben ser INT
  if (name.includes('id_') || name.includes('_id') || name === 'id') {
    return 'INT'; // Todos los IDs usan INT
  }
  
  // num_factura debe ser INT para números secuenciales
  if (name.includes('num_factura') || name.includes('codigo_factura')) {
    return 'INT';
  }
  
  // Si ya tiene un tipo válido, usarlo
  if (originalType && originalType !== 'unknown' && originalType !== 'string') {
    return originalType;
  }
  
  // Detección inteligente basada en el nombre de la columna
  if (name.includes('fecha') || name.includes('date')) {
    return 'DATE';
  }
  
  if (name.includes('hora') || name.includes('time')) {
    return 'TIME';
  }
  
  if (name.includes('timestamp') || name.includes('creado') || name.includes('modificado')) {
    return 'TIMESTAMP';
  }
  
  if (name.includes('precio') || name.includes('costo') || name.includes('valor') || name.includes('salario') || name.includes('total') || name.includes('subtotal') || name.includes('impuesto')) {
    return 'DECIMAL(10,2)';
  }
  
  if (name.includes('cantidad') || name.includes('stock') || name.includes('cant') || name.includes('numero')) {
    return 'INT';
  }
  
  if (name.includes('email') || name.includes('correo')) {
    return 'VARCHAR(255)';
  }
  
  if (name.includes('telefono') || name.includes('phone')) {
    return 'VARCHAR(20)';
  }
  
  if (name.includes('codigo') || name.includes('code')) {
    return 'VARCHAR(50)';
  }
  
  if (name.includes('nombre') || name.includes('name') || name.includes('descripcion') || name.includes('description')) {
    return 'VARCHAR(255)';
  }
  
  if (name.includes('activo') || name.includes('habilitado') || name.includes('enabled')) {
    return 'BOOLEAN';
  }
  
  // Por defecto, usar VARCHAR para texto
  return 'VARCHAR(255)';
}

// Función de utilidad para convertir entidades a formato SQL CORREGIDO
export function convertEntitiesToSQLTables(entities: any[]): SQLTable[] {
  return entities.map(entity => ({
    name: entity.name,
    purpose: entity.purpose || `Tabla para ${entity.name}`,
    columns: entity.columns.map((col: any) => ({
      name: col.name,
      type: detectSQLColumnType(col.name, col.type, col.isPrimaryKey || false, col.isForeignKey || false),
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

// Función para descargar el script SQL
export function downloadSQLScript(sqlContent: string, filename: string = 'script_normalizacion.sql'): void {
  const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

