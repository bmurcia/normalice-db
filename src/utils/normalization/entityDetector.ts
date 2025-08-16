import type { Table, Entity, Column, EntityType, Relationship, Dependency } from '../types/normalization';

// ===== DETECTOR INTELIGENTE DE ENTIDADES =====

export class EntityDetector {
  private tables: Table[] = [];
  private entities: Map<string, Entity> = new Map();

  constructor(tables: Table[]) {
    this.tables = tables;
  }

  // Detectar y separar entidades automáticamente
  public detectEntities(): Entity[] {
    console.log('🏗️ Iniciando detección inteligente de entidades...');
    
    // PASO 1: Analizar estructura actual
    this.analyzeCurrentStructure();
    
    // PASO 2: Identificar entidades por dominio
    this.identifyEntitiesByDomain();
    
    // PASO 3: Separar entidades por redundancia
    this.separateEntitiesByRedundancy();
    
    // PASO 4: Crear entidades de soporte
    this.createSupportEntities();
    
    // PASO 5: Establecer relaciones entre entidades
    this.establishRelationships();
    
    // PASO 6: Calcular scores de normalización
    this.calculateNormalizationScores();
    
    return Array.from(this.entities.values());
  }

  // Analizar la estructura actual de las tablas
  private analyzeCurrentStructure(): void {
    this.tables.forEach(table => {
      console.log(`📊 Analizando tabla: ${table.name}`);
      console.log(`   - Columnas: ${table.columns.length}`);
      console.log(`   - Clave primaria: ${table.primaryKey?.name || 'No definida'}`);
      console.log(`   - Claves foráneas: ${table.foreignKeys.length}`);
      console.log(`   - Tipo de entidad: ${table.entityType}`);
    });
  }

  // Identificar entidades por dominio semántico
  private identifyEntitiesByDomain(): void {
    this.tables.forEach(table => {
      if (table.columns.length === 0) return;
      
      // Analizar cada columna para identificar dominios
      const domains = this.identifyColumnDomains(table.columns);
      
      // Crear entidades basadas en dominios
      this.createEntitiesFromDomains(table, domains);
    });
  }

  // Identificar dominios de columnas
  private identifyColumnDomains(columns: Column[]): Map<string, Column[]> {
    const domains = new Map<string, Column[]>();
    
    columns.forEach(column => {
      const domain = this.getColumnDomain(column);
      
      if (!domains.has(domain)) {
        domains.set(domain, []);
      }
      domains.get(domain)!.push(column);
    });
    
    return domains;
  }

  // Obtener dominio de una columna
  private getColumnDomain(column: Column): string {
    const name = column.name.toLowerCase();
    
    // Dominio de Órdenes
    if (name.includes('orden') || name.includes('order') || name.includes('pedido')) {
      return 'ORDERS';
    }
    
    // Dominio de Clientes
    if (name.includes('cliente') || name.includes('customer') || name.includes('usuario')) {
      return 'CUSTOMERS';
    }
    
    // Dominio de Productos/Artículos
    if (name.includes('art') || name.includes('producto') || name.includes('product') || name.includes('item')) {
      return 'PRODUCTS';
    }
    
    // Dominio de Categorías
    if (name.includes('categoria') || name.includes('category') || name.includes('tipo')) {
      return 'CATEGORIES';
    }
    
    // Dominio de Proveedores
    if (name.includes('proveedor') || name.includes('supplier') || name.includes('vendor')) {
      return 'SUPPLIERS';
    }
    
    // Dominio de Empleados
    if (name.includes('empleado') || name.includes('employee') || name.includes('staff')) {
      return 'EMPLOYEES';
    }
    
    // Dominio de Ubicaciones
    if (name.includes('ciudad') || name.includes('city') || name.includes('pais') || name.includes('country') || 
        name.includes('direccion') || name.includes('address')) {
      return 'LOCATIONS';
    }
    
    // Dominio de Transacciones
    if (name.includes('cantidad') || name.includes('cant') || name.includes('stock') || name.includes('inventario')) {
      return 'TRANSACTIONS';
    }
    
    // Dominio de Precios/Financiero
    if (name.includes('precio') || name.includes('costo') || name.includes('valor') || name.includes('salario')) {
      return 'FINANCIAL';
    }
    
    // Dominio de Fechas
    if (name.includes('fecha') || name.includes('date') || name.includes('tiempo') || name.includes('time')) {
      return 'TEMPORAL';
    }
    
    // Dominio de Identificadores
    if (name.includes('id') || name.includes('codigo') || name.includes('numero')) {
      return 'IDENTIFIERS';
    }
    
    // Dominio de Texto/Descripción
    if (name.includes('nombre') || name.includes('name') || name.includes('descripcion') || name.includes('description')) {
      return 'TEXT';
    }
    
    // Dominio de Contacto
    if (name.includes('email') || name.includes('correo') || name.includes('telefono') || name.includes('phone')) {
      return 'CONTACT';
    }
    
    return 'GENERAL';
  }

  // Crear entidades basadas en dominios
  private createEntitiesFromDomains(_table: Table, domains: Map<string, Column[]>): void {
    domains.forEach((columns, domain) => {
      if (columns.length === 0) return;
      
      // Crear entidad para este dominio
      const entityName = this.generateEntityName(domain, columns);
      const entity: Entity = {
        name: entityName,
        purpose: this.generateEntityPurpose(domain, columns),
        columns: this.normalizeColumnsForEntity(columns),
        relationships: [],
        dependencies: [],
        primaryKey: this.findPrimaryKeyForEntity(columns),
        normalizationScore: 0
      };
      
      // Agregar entidad al mapa
      this.entities.set(entityName, entity);
      
      console.log(`🏗️ Entidad creada: ${entityName} (${domain})`);
    });
  }

  // Generar nombre de entidad
  private generateEntityName(domain: string, columns: Column[]): string {
    // Buscar columnas que puedan dar nombre a la entidad
    const nameColumns = columns.filter(col => 
      col.name.toLowerCase().includes('nombre') || 
      col.name.toLowerCase().includes('name') ||
      col.name.toLowerCase().includes('descripcion')
    );
    
    if (nameColumns.length > 0) {
      // Usar el nombre de la primera columna de nombre
      const baseName = nameColumns[0].name.toLowerCase();
      if (baseName.includes('cliente')) return 'CLIENTES';
      if (baseName.includes('producto') || baseName.includes('art')) return 'PRODUCTOS';
      if (baseName.includes('categoria')) return 'CATEGORIAS';
      if (baseName.includes('proveedor')) return 'PROVEEDORES';
      if (baseName.includes('empleado')) return 'EMPLEADOS';
      if (baseName.includes('ciudad')) return 'CIUDADES';
    }
    
    // Usar el dominio como nombre
    switch (domain) {
      case 'ORDERS': return 'ORDENES';
      case 'CUSTOMERS': return 'CLIENTES';
      case 'PRODUCTS': return 'PRODUCTOS';
      case 'CATEGORIES': return 'CATEGORIAS';
      case 'SUPPLIERS': return 'PROVEEDORES';
      case 'EMPLOYEES': return 'EMPLEADOS';
      case 'LOCATIONS': return 'UBICACIONES';
      case 'TRANSACTIONS': return 'TRANSACCIONES';
      case 'FINANCIAL': return 'FINANZAS';
      case 'TEMPORAL': return 'TIEMPO';
      case 'IDENTIFIERS': return 'IDENTIFICADORES';
      case 'TEXT': return 'TEXTO';
      case 'CONTACT': return 'CONTACTO';
      default: return domain;
    }
  }

  // Generar propósito de entidad
  private generateEntityPurpose(domain: string, _columns: Column[]): string {
    switch (domain) {
      case 'ORDERS': return 'Almacena información de órdenes y pedidos';
      case 'CUSTOMERS': return 'Almacena información de clientes y usuarios';
      case 'PRODUCTS': return 'Almacena información de productos y artículos';
      case 'CATEGORIES': return 'Almacena categorías de clasificación';
      case 'SUPPLIERS': return 'Almacena información de proveedores';
      case 'EMPLOYEES': return 'Almacena información de empleados';
      case 'LOCATIONS': return 'Almacena información de ubicaciones geográficas';
      case 'TRANSACTIONS': return 'Almacena transacciones y movimientos';
      case 'FINANCIAL': return 'Almacena información financiera y precios';
      case 'TEMPORAL': return 'Almacena información temporal y fechas';
      case 'IDENTIFIERS': return 'Almacena identificadores únicos';
      case 'TEXT': return 'Almacena información textual y descriptiva';
      case 'CONTACT': return 'Almacena información de contacto';
      default: return `Almacena información del dominio ${domain}`;
    }
  }

  // Normalizar columnas para la entidad
  private normalizeColumnsForEntity(columns: Column[]): Column[] {
    return columns.map(column => ({
      ...column,
      isPrimaryKey: this.isPrimaryKeyForEntity(column, columns),
      isForeignKey: this.isForeignKeyForEntity(column, columns),
      isRequired: this.isRequiredForEntity(column, columns)
    }));
  }

  // Verificar si es clave primaria para la entidad
  private isPrimaryKeyForEntity(column: Column, allColumns: Column[]): boolean {
    const name = column.name.toLowerCase();
    
    // Si ya está marcada como clave primaria
    if (column.isPrimaryKey) return true;
    
    // Buscar patrones de clave primaria
    if (name === 'id') return true;
    if (name.includes('id') && name.includes('_')) return true;
    if (name.includes('codigo')) return true;
    if (name.includes('numero')) return true;
    
    // Si es la única columna de identificador en la entidad
    const idColumns = allColumns.filter(col => 
      col.name.toLowerCase().includes('id') || 
      col.name.toLowerCase().includes('codigo') ||
      col.name.toLowerCase().includes('numero')
    );
    
    if (idColumns.length === 1 && idColumns[0] === column) return true;
    
    return false;
  }

  // Verificar si es clave foránea para la entidad
  private isForeignKeyForEntity(column: Column, allColumns: Column[]): boolean {
    const name = column.name.toLowerCase();
    
    // Si ya está marcada como clave foránea
    if (column.isForeignKey) return true;
    
    // Buscar patrones de clave foránea
    if (name.includes('_id') && !this.isPrimaryKeyForEntity(column, allColumns)) return true;
    if (name.includes('id_') && !this.isPrimaryKeyForEntity(column, allColumns)) return true;
    
    // Si es una columna de ID que no es clave primaria
    if (name.includes('id') && !this.isPrimaryKeyForEntity(column, allColumns)) return true;
    
    return false;
  }

  // Verificar si es requerida para la entidad
  private isRequiredForEntity(column: Column, allColumns: Column[]): boolean {
    // Las claves primarias siempre son requeridas
    if (this.isPrimaryKeyForEntity(column, allColumns)) return true;
    
    // Las claves foráneas son requeridas por defecto
    if (this.isForeignKeyForEntity(column, allColumns)) return true;
    
    // Columnas de nombre son requeridas
    if (column.name.toLowerCase().includes('nombre') || column.name.toLowerCase().includes('name')) {
      return true;
    }
    
    return false;
  }

  // Encontrar clave primaria para la entidad
  private findPrimaryKeyForEntity(columns: Column[]): Column | null {
    const primaryKey = columns.find(col => this.isPrimaryKeyForEntity(col, columns));
    return primaryKey || null;
  }

  // Separar entidades por redundancia
  private separateEntitiesByRedundancy(): void {
    const entitiesToSplit: string[] = [];
    
    this.entities.forEach((entity, entityName) => {
      // Calcular redundancia total de la entidad
      let totalRedundancy = 0;
      let columnCount = 0;
      
      entity.columns.forEach(column => {
        if (column.totalValues > 0) {
          totalRedundancy += column.redundancyPercentage;
          columnCount++;
        }
      });
      
      const averageRedundancy = columnCount > 0 ? totalRedundancy / columnCount : 0;
      
      // Si la redundancia es muy alta, considerar separar
      if (averageRedundancy > 80) {
        entitiesToSplit.push(entityName);
        console.log(`⚠️ Entidad ${entityName} tiene alta redundancia: ${averageRedundancy.toFixed(2)}%`);
      }
    });
    
    // Separar entidades con alta redundancia
    entitiesToSplit.forEach(entityName => {
      this.splitEntityByRedundancy(entityName);
    });
  }

  // Separar entidad por redundancia
  private splitEntityByRedundancy(entityName: string): void {
    const entity = this.entities.get(entityName);
    if (!entity) return;
    
    console.log(`🔀 Separando entidad ${entityName} por redundancia...`);
    
    // Identificar columnas con alta redundancia
    const highRedundancyColumns = entity.columns.filter(col => col.redundancyPercentage > 70);
    const lowRedundancyColumns = entity.columns.filter(col => col.redundancyPercentage <= 70);
    
    if (highRedundancyColumns.length > 0 && lowRedundancyColumns.length > 0) {
      // Crear nueva entidad para columnas de alta redundancia
      const newEntityName = `${entityName}_LOOKUP`;
      const newEntity: Entity = {
        name: newEntityName,
        purpose: `Tabla de referencia para ${entityName}`,
        columns: highRedundancyColumns,
        relationships: [],
        dependencies: [],
        primaryKey: this.findPrimaryKeyForEntity(highRedundancyColumns),
        normalizationScore: 0
      };
      
      // Agregar nueva entidad
      this.entities.set(newEntityName, newEntity);
      
      // Actualizar entidad original
      entity.columns = lowRedundancyColumns;
      entity.primaryKey = this.findPrimaryKeyForEntity(lowRedundancyColumns);
      
      console.log(`✅ Entidad ${entityName} separada en ${newEntityName}`);
    }
  }

  // Crear entidades de soporte
  private createSupportEntities(): void {
    const referencedTables = new Set<string>();
    
    // Recolectar todas las tablas referenciadas
    this.entities.forEach(entity => {
      entity.columns.forEach(column => {
        if (column.isForeignKey && column.reference) {
          referencedTables.add(column.reference.table);
        }
      });
    });
    
    // Crear entidades de soporte faltantes
    referencedTables.forEach(tableName => {
      if (!this.entities.has(tableName.toUpperCase())) {
        const supportEntity: Entity = {
          name: tableName.toUpperCase(),
          purpose: `Tabla de soporte para ${tableName}`,
          columns: [
            {
              ...this.createDefaultColumn(),
              name: `id_${tableName}`,
              isPrimaryKey: true,
              type: 'INTEGER'
            },
            {
              ...this.createDefaultColumn(),
              name: 'nombre',
              type: 'VARCHAR(100)',
              isRequired: true
            }
          ],
          relationships: [],
          dependencies: [],
          primaryKey: null,
          normalizationScore: 0
        };
        
        supportEntity.primaryKey = supportEntity.columns[0];
        this.entities.set(tableName.toUpperCase(), supportEntity);
        
        console.log(`🔧 Entidad de soporte creada: ${tableName.toUpperCase()}`);
      }
    });
  }

  // Crear columna por defecto
  private createDefaultColumn(): Column {
    return {
      name: '',
      type: 'VARCHAR(255)',
      isPrimaryKey: false,
      isForeignKey: false,
      isRequired: false,
      data: [],
      redundancyPercentage: 0,
      uniqueValues: 0,
      totalValues: 0
    };
  }

  // Establecer relaciones entre entidades
  private establishRelationships(): void {
    this.entities.forEach(entity => {
      entity.columns.forEach(column => {
        if (column.isForeignKey && column.reference) {
          const relationship: Relationship = {
            column: column.name,
            references: column.reference,
            type: 'FOREIGN_KEY',
            strength: 'STRONG'
          };
          
          entity.relationships.push(relationship);
        }
      });
    });
  }

  // Calcular scores de normalización
  private calculateNormalizationScores(): void {
    this.entities.forEach(entity => {
      let score = 100; // Score base
      
      // Reducir score por redundancia
      entity.columns.forEach(column => {
        if (column.redundancyPercentage > 50) {
          score -= column.redundancyPercentage * 0.5;
        }
      });
      
      // Reducir score por falta de claves primarias
      if (!entity.primaryKey) {
        score -= 20;
      }
      
      // Reducir score por falta de relaciones
      if (entity.relationships.length === 0 && entity.columns.length > 1) {
        score -= 15;
      }
      
      entity.normalizationScore = Math.max(0, Math.min(100, score));
      
      console.log(`📊 Score de normalización para ${entity.name}: ${entity.normalizationScore.toFixed(1)}/100`);
    });
  }

  // Obtener entidades detectadas
  public getDetectedEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  // Obtener resumen de detección
  public getDetectionSummary(): {
    totalEntities: number;
    entitiesByType: Map<string, number>;
    averageNormalizationScore: number;
    recommendations: string[];
  } {
    const totalEntities = this.entities.size;
    const entitiesByType = new Map<string, number>();
    let totalScore = 0;
    const recommendations: string[] = [];
    
    this.entities.forEach(entity => {
      totalScore += entity.normalizationScore;
      
      // Contar por tipo
      const type = this.getEntityType(entity);
      entitiesByType.set(type, (entitiesByType.get(type) || 0) + 1);
      
      // Generar recomendaciones
      if (entity.normalizationScore < 70) {
        recommendations.push(`Mejorar normalización de ${entity.name} (score: ${entity.normalizationScore.toFixed(1)})`);
      }
      
      if (!entity.primaryKey) {
        recommendations.push(`Definir clave primaria para ${entity.name}`);
      }
    });
    
    const averageNormalizationScore = totalEntities > 0 ? totalScore / totalEntities : 0;
    
    return {
      totalEntities,
      entitiesByType,
      averageNormalizationScore,
      recommendations
    };
  }

  // Obtener tipo de entidad
  private getEntityType(entity: Entity): string {
    if (entity.primaryKey && entity.relationships.length === 0) {
      return 'LOOKUP';
    } else if (entity.relationships.length > 0) {
      return 'TRANSACTION';
    } else if (entity.columns.length === 1) {
      return 'SIMPLE';
    } else {
      return 'COMPLEX';
    }
  }
}
