import type { Entity, Column, Relationship } from '../types/normalization';

// ===== GENERADOR DE SQL CORREGIDO Y MEJORADO =====

export class SQLGenerator {
  
  // Generar SQL completo y correcto
  public generateCompleteSQL(entities: Entity[]): string {
    
    let sql = this.generateHeader();
    
    // PASO 1: Crear todas las tablas
    sql += this.generateTableCreation(entities);
    
    // PASO 2: Agregar claves foráneas
    sql += this.generateForeignKeys(entities);
    
    // PASO 3: Crear índices
    sql += this.generateIndexes(entities);
    
    // PASO 4: Agregar constraints de validación
    sql += this.generateValidationConstraints(entities);
    
    // PASO 5: Generar datos de ejemplo
    sql += this.generateSampleData(entities);
    
    // PASO 6: Crear vistas útiles
    sql += this.generateViews(entities);
    
    return sql;
  }

  // Generar encabezado del script
  private generateHeader(): string {
    let sql = `-- ===== SCRIPT DE NORMALIZACIÓN AUTOMÁTICA =====\n`;
    
    return sql;
  }

  // Generar creación de tablas
  private generateTableCreation(entities: Entity[]): string {
    let sql = `-- ===== 1. CREACIÓN DE TABLAS =====\n\n`;
    
    // Ordenar entidades: primero las de soporte, luego las principales
    const sortedEntities = this.sortEntitiesForCreation(entities);
    
    sortedEntities.forEach(entity => {
      sql += this.generateTableDefinition(entity);
    });
    
    return sql;
  }

  // Ordenar entidades para creación (evitar problemas de dependencias)
  private sortEntitiesForCreation(entities: Entity[]): Entity[] {
    // Crear un mapa de dependencias
    const dependencyMap = new Map<string, string[]>();
    
    entities.forEach(entity => {
      const dependencies: string[] = [];
      entity.relationships.forEach(rel => {
        if (rel.references) {
          dependencies.push(rel.references.table.toUpperCase());
        }
      });
      dependencyMap.set(entity.name, dependencies);
    });
    
    // Ordenar por dependencias (topological sort simplificado)
    const sorted: Entity[] = [];
    const visited = new Set<string>();
    
    const visit = (entityName: string) => {
      if (visited.has(entityName)) return;
      
      const dependencies = dependencyMap.get(entityName) || [];
      dependencies.forEach(dep => {
        if (!visited.has(dep)) {
          const depEntity = entities.find(e => e.name === dep);
          if (depEntity) visit(depEntity.name);
        }
      });
      
      visited.add(entityName);
      const entity = entities.find(e => e.name === entityName);
      if (entity) sorted.push(entity);
    };
    
    entities.forEach(entity => visit(entity.name));
    
    return sorted;
  }

  // Generar definición de tabla individual
  private generateTableDefinition(entity: Entity): string {
    let sql = `-- Crear tabla: ${entity.name}\n`;
    sql += `-- Propósito: ${entity.purpose}\n`;
    sql += `CREATE TABLE ${entity.name} (\n`;
    
    const columnDefinitions = entity.columns.map(column => {
      let definition = `    ${column.name} ${column.type}`;
      
      if (column.isPrimaryKey) {
        definition += ' IDENTITY(1,1) PRIMARY KEY';
      } else if (column.isRequired) {
        definition += ' NOT NULL';
      }
      
      return definition;
    });
    
    sql += columnDefinitions.join(',\n');
    sql += '\n);\n\n';
    
    return sql;
  }

  // Generar claves foráneas
  private generateForeignKeys(entities: Entity[]): string {
    let sql = `-- ===== 2. CLAVES FORÁNEAS =====\n\n`;
    
    entities.forEach(entity => {
      entity.relationships.forEach(relationship => {
        if (relationship.references) {
          sql += this.generateForeignKeyConstraint(entity, relationship);
        }
      });
    });
    
    if (!sql.includes('ALTER TABLE')) {
      sql += `-- No se detectaron claves foráneas para agregar\n\n`;
    }
    
    return sql;
  }

  // Generar constraint de clave foránea individual
  private generateForeignKeyConstraint(entity: Entity, relationship: Relationship): string {
    const constraintName = `FK_${entity.name}_${relationship.references.table}`;
    
    let sql = `-- Agregar clave foránea: ${entity.name}.${relationship.column} → ${relationship.references.table}.${relationship.references.column}\n`;
    sql += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
    sql += `FOREIGN KEY (${relationship.column}) REFERENCES ${relationship.references.table}(${relationship.references.column});\n\n`;
    
    return sql;
  }

  // Generar índices
  private generateIndexes(entities: Entity[]): string {
    let sql = `-- ===== 3. ÍNDICES PARA OPTIMIZAR RENDIMIENTO =====\n\n`;
    
    entities.forEach(entity => {
      // Índices en claves foráneas
      entity.relationships.forEach(relationship => {
        const indexName = `idx_${entity.name.toLowerCase()}_${relationship.column}`;
        sql += `CREATE INDEX ${indexName} ON ${entity.name}(${relationship.column});\n`;
      });
      
      // Índices en columnas de búsqueda frecuente
      entity.columns.forEach(column => {
        if (this.shouldIndexColumn(column)) {
          const indexName = `idx_${entity.name.toLowerCase()}_${column.name}`;
          sql += `CREATE INDEX ${indexName} ON ${entity.name}(${column.name});\n`;
        }
      });
      
      sql += '\n';
    });
    
    return sql;
  }

  // Determinar si una columna debe ser indexada
  private shouldIndexColumn(column: Column): boolean {
    const name = column.name.toLowerCase();
    
    // Columnas de búsqueda frecuente
    if (name.includes('nombre') || name.includes('name')) return true;
    if (name.includes('email') || name.includes('correo')) return true;
    if (name.includes('codigo') || name.includes('code')) return true;
    if (name.includes('fecha') || name.includes('date')) return true;
    
    // Columnas con baja cardinalidad (muchos valores repetidos)
    if (column.redundancyPercentage > 50) return true;
    
    return false;
  }

  // Generar constraints de validación
  private generateValidationConstraints(entities: Entity[]): string {
    let sql = `-- ===== 4. CONSTRAINTS DE VALIDACIÓN =====\n\n`;
    
    entities.forEach(entity => {
      entity.columns.forEach(column => {
        const constraints = this.generateColumnConstraints(entity, column);
        if (constraints) {
          sql += constraints;
        }
      });
    });
    
    if (!sql.includes('ALTER TABLE')) {
      sql += `-- No se requieren constraints de validación adicionales\n\n`;
    }
    
    return sql;
  }

  // Generar constraints para una columna específica
  private generateColumnConstraints(entity: Entity, column: Column): string {
    let constraints = '';
    const name = column.name.toLowerCase();
    
    // Constraints para valores numéricos
    if (column.type.includes('DECIMAL') || column.type.includes('INT')) {
      if (name.includes('precio') || name.includes('costo') || name.includes('valor') || name.includes('salario')) {
        const constraintName = `chk_${entity.name.toLowerCase()}_${column.name}_positivo`;
        constraints += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
        constraints += `CHECK (${column.name} >= 0);\n\n`;
      }
      
      if (name.includes('cantidad') || name.includes('stock') || name.includes('cant')) {
        const constraintName = `chk_${entity.name.toLowerCase()}_${column.name}_no_negativo`;
        constraints += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
        constraints += `CHECK (${column.name} >= 0);\n\n`;
      }
    }
    
    // Constraints para emails
    if (name.includes('email') || name.includes('correo')) {
      const constraintName = `chk_${entity.name.toLowerCase()}_${column.name}_formato`;
      constraints += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
      constraints += `CHECK (${column.name} LIKE '%_@__%.__%');\n\n`;
    }
    
    // Constraints para fechas
    if (name.includes('fecha') || name.includes('date')) {
      const constraintName = `chk_${entity.name.toLowerCase()}_${column.name}_valida`;
      constraints += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
      constraints += `CHECK (${column.name} IS NOT NULL AND ${column.name} <= CURRENT_TIMESTAMP);\n\n`;
    }
    
    // Constraints para códigos
    if (name.includes('codigo') || name.includes('code')) {
      const constraintName = `chk_${entity.name.toLowerCase()}_${column.name}_formato`;
      constraints += `ALTER TABLE ${entity.name} ADD CONSTRAINT ${constraintName}\n`;
      constraints += `CHECK (LEN(${column.name}) >= 3);\n\n`;
    }
    
    return constraints;
  }

  // Generar datos de ejemplo
  private generateSampleData(entities: Entity[]): string {
    let sql = `-- ===== 5. DATOS DE EJEMPLO =====\n\n`;
    
    entities.forEach(entity => {
      if (entity.columns.length > 1) {
        sql += this.generateSampleDataForEntity(entity);
      }
    });
    
    return sql;
  }

  // Generar datos de ejemplo para una entidad específica
  private generateSampleDataForEntity(entity: Entity): string {
    let sql = `-- Insertar datos de ejemplo en ${entity.name}\n`;
    sql += `-- Ajusta estos valores según tus necesidades\n`;
    
    // Generar INSERT basado en el tipo de entidad
    const entityType = this.getEntityType(entity);
    
    switch (entityType) {
      case 'CLIENTES':
        sql += this.generateCustomerSampleData(entity);
        break;
      case 'PRODUCTOS':
        sql += this.generateProductSampleData(entity);
        break;
      case 'CATEGORIAS':
        sql += this.generateCategorySampleData(entity);
        break;
      case 'PROVEEDORES':
        sql += this.generateSupplierSampleData(entity);
        break;
      case 'EMPLEADOS':
        sql += this.generateEmployeeSampleData(entity);
        break;
      case 'ORDENES':
        sql += this.generateOrderSampleData(entity);
        break;
      default:
        sql += this.generateGenericSampleData(entity);
    }
    
    sql += '\n';
    return sql;
  }

  // Generar datos de ejemplo para clientes
  private generateCustomerSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'Juan Pérez', 'juan@email.com', 'Quito'),\n`;
      sql += `(2, 'María García', 'maria@email.com', 'Guayaquil'),\n`;
      sql += `(3, 'Carlos López', 'carlos@email.com', 'Cuenca');\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo para productos
  private generateProductSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'Laptop HP', 'Electrónicos', 1200.00),\n`;
      sql += `(2, 'Mouse Inalámbrico', 'Accesorios', 25.50),\n`;
      sql += `(3, 'Teclado Mecánico', 'Accesorios', 89.99);\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo para categorías
  private generateCategorySampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'Electrónicos'),\n`;
      sql += `(2, 'Accesorios'),\n`;
      sql += `(3, 'Software');\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo para proveedores
  private generateSupplierSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'TechCorp', 'info@techcorp.com', '+593-2-1234567'),\n`;
      sql += `(2, 'ElectroSupply', 'contact@electrosupply.com', '+593-4-9876543');\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo para empleados
  private generateEmployeeSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'Ana Martínez', 'Ventas', 2500.00),\n`;
      sql += `(2, 'Luis Rodríguez', 'IT', 3000.00),\n`;
      sql += `(3, 'Sofía Torres', 'Marketing', 2800.00);\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo para órdenes
  private generateOrderSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, '2024-01-15', 1, 1, 2, 50.00),\n`;
      sql += `(2, '2024-01-16', 2, 3, 1, 89.99);\n`;
    }
    
    return sql;
  }

  // Generar datos de ejemplo genéricos
  private generateGenericSampleData(entity: Entity): string {
    let sql = '';
    
    if (entity.columns.some(col => col.name.toLowerCase().includes('id'))) {
      sql += `INSERT INTO ${entity.name} (`;
      const columns = entity.columns.map(col => col.name).join(', ');
      sql += `${columns}) VALUES\n`;
      sql += `(1, 'Valor 1'),\n`;
      sql += `(2, 'Valor 2'),\n`;
      sql += `(3, 'Valor 3');\n`;
    }
    
    return sql;
  }

  // Generar vistas útiles
  private generateViews(entities: Entity[]): string {
    let sql = `-- ===== 6. VISTAS ÚTILES =====\n\n`;
    
    // Crear vista principal si hay múltiples entidades relacionadas
    if (entities.length > 1) {
      sql += this.generateMainView(entities);
    }
    
    // Crear vistas específicas por tipo de entidad
    entities.forEach(entity => {
      const entityType = this.getEntityType(entity);
      if (entityType === 'CLIENTES' || entityType === 'PRODUCTOS') {
        sql += this.generateEntitySpecificView(entity);
      }
    });
    
    return sql;
  }

  // Generar vista principal
  private generateMainView(entities: Entity[]): string {
    let sql = `-- Vista principal con información completa\n`;
    sql += `-- Ajusta según la estructura de tus tablas\n`;
    
    // Identificar entidades principales para la vista
    const mainEntities = entities.filter(entity => 
      ['CLIENTES', 'PRODUCTOS', 'ORDENES'].includes(this.getEntityType(entity))
    );
    
    if (mainEntities.length >= 2) {
      sql += `CREATE VIEW v_informacion_completa AS\n`;
      sql += `SELECT \n`;
      
      // Agregar columnas de la vista
      mainEntities.forEach((entity, index) => {
        entity.columns.forEach((column, colIndex) => {
          if (index > 0 || colIndex > 0) sql += `,\n`;
          sql += `    ${entity.name}.${column.name} AS ${entity.name}_${column.name}`;
        });
      });
      
      sql += `\nFROM ${mainEntities[0].name}`;
      
      // Agregar JOINs
      for (let i = 1; i < mainEntities.length; i++) {
        const entity = mainEntities[i];
        const prevEntity = mainEntities[i - 1];
        
        // Buscar relación entre entidades
        const relationship = entity.relationships.find(rel => 
          rel.references && rel.references.table === prevEntity.name
        );
        
        if (relationship) {
          sql += `\nLEFT JOIN ${entity.name} ON ${prevEntity.name}.${relationship.references.column} = ${entity.name}.${relationship.column}`;
        } else {
          sql += `\nCROSS JOIN ${entity.name}`;
        }
      }
      
      sql += `;\n\n`;
    }
    
    return sql;
  }

  // Generar vista específica para una entidad
  private generateEntitySpecificView(entity: Entity): string {
    const entityType = this.getEntityType(entity);
    let sql = '';
    
    if (entityType === 'CLIENTES') {
      sql += `-- Vista de clientes con información resumida\n`;
      sql += `CREATE VIEW v_clientes_resumen AS\n`;
      sql += `SELECT \n`;
      sql += `    ${entity.name}.*,\n`;
      sql += `    COUNT(o.Id_orden) as total_ordenes\n`;
      sql += `FROM ${entity.name}\n`;
      sql += `LEFT JOIN ORDENES o ON ${entity.name}.Id_cliente = o.Id_cliente\n`;
      sql += `GROUP BY ${entity.columns.map(col => `${entity.name}.${col.name}`).join(', ')};\n\n`;
    }
    
    if (entityType === 'PRODUCTOS') {
      sql += `-- Vista de productos con información de categoría\n`;
      sql += `CREATE VIEW v_productos_categoria AS\n`;
      sql += `SELECT \n`;
      sql += `    p.*,\n`;
      sql += `    c.nombre as categoria_nombre\n`;
      sql += `FROM ${entity.name} p\n`;
      sql += `LEFT JOIN CATEGORIAS c ON p.id_categoria = c.id_categoria;\n\n`;
    }
    
    return sql;
  }


  // Obtener tipo de entidad
  private getEntityType(entity: Entity): string {
    const name = entity.name.toLowerCase();
    
    if (name.includes('cliente')) return 'CLIENTES';
    if (name.includes('producto') || name.includes('art')) return 'PRODUCTOS';
    if (name.includes('categoria')) return 'CATEGORIAS';
    if (name.includes('proveedor')) return 'PROVEEDORES';
    if (name.includes('empleado')) return 'EMPLEADOS';
    if (name.includes('orden')) return 'ORDENES';
    if (name.includes('venta')) return 'VENTAS';
    if (name.includes('factura')) return 'FACTURAS';
    
    return 'GENERAL';
  }
}

