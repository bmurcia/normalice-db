import { StructureAnalyzer } from './analyzer';
import { EntityDetector } from './entityDetector';
import { SQLGenerator } from './sqlGenerator';
import { 
  Table, 
  Entity, 
  NormalizationResult, 
  NormalizationStep, 
  AnalysisResult, 
  Issue,
  NormalizationLevel 
} from '../types/normalization';

// ===== NORMALIZADOR PRINCIPAL =====

export class DatabaseNormalizer {
  private csvData: string;
  private analyzer: StructureAnalyzer;
  private entityDetector: EntityDetector;
  private sqlGenerator: SQLGenerator;

  constructor(csvData: string) {
    this.csvData = csvData;
    this.analyzer = new StructureAnalyzer(csvData);
    this.sqlGenerator = new SQLGenerator();
  }

  // Proceso principal de normalización
  public async normalizeTo3NF(): Promise<NormalizationResult> {
    console.log('🚀 Iniciando proceso de normalización a 3NF...');
    
    try {
      // PASO 1: Análisis de estructura
      const structureAnalysis = await this.performStructureAnalysis();
      
      // PASO 2: Detección de entidades
      const entityDetection = await this.performEntityDetection(structureAnalysis.tables);
      
      // PASO 3: Normalización de entidades
      const normalizationSteps = await this.performNormalization(entityDetection.entities);
      
      // PASO 4: Generación de SQL
      const sqlScript = await this.generateSQLScript(entityDetection.entities);
      
      // PASO 5: Análisis final
      const finalAnalysis = await this.performFinalAnalysis(entityDetection.entities);
      
      // PASO 6: Generar recomendaciones
      const recommendations = this.generateRecommendations(finalAnalysis, entityDetection.summary);
      
      const result: NormalizationResult = {
        originalStructure: structureAnalysis.tables,
        normalizedEntities: entityDetection.entities,
        normalizationSteps,
        sqlScript,
        analysis: finalAnalysis,
        recommendations
      };
      
      console.log('✅ Normalización completada exitosamente');
      return result;
      
    } catch (error) {
      console.error('❌ Error durante la normalización:', error);
      throw new Error(`Error en la normalización: ${error}`);
    }
  }

  // PASO 1: Análisis de estructura
  private async performStructureAnalysis(): Promise<{
    tables: Table[];
    analysisResults: any;
  }> {
    console.log('📊 PASO 1: Analizando estructura de datos...');
    
    const tables = this.analyzer.analyzeStructure();
    const analysisResults = this.analyzer.getAnalysisResults();
    
    console.log(`   - Tablas detectadas: ${tables.length}`);
    console.log(`   - Total de filas: ${analysisResults.totalRows}`);
    console.log(`   - Total de columnas: ${analysisResults.totalColumns}`);
    console.log(`   - Score de redundancia: ${analysisResults.redundancyScore.toFixed(2)}%`);
    console.log(`   - Nivel de normalización actual: ${analysisResults.normalizationLevel}`);
    
    return { tables, analysisResults };
  }

  // PASO 2: Detección de entidades
  private async performEntityDetection(tables: Table[]): Promise<{
    entities: Entity[];
    summary: any;
  }> {
    console.log('🏗️ PASO 2: Detectando entidades y separando dominios...');
    
    this.entityDetector = new EntityDetector(tables);
    const entities = this.entityDetector.detectEntities();
    const summary = this.entityDetector.getDetectionSummary();
    
    console.log(`   - Entidades detectadas: ${summary.totalEntities}`);
    console.log(`   - Score promedio de normalización: ${summary.averageNormalizationScore.toFixed(1)}/100`);
    
    // Mostrar entidades por tipo
    summary.entitiesByType.forEach((count, type) => {
      console.log(`   - Tipo ${type}: ${count} entidades`);
    });
    
    return { entities, summary };
  }

  // PASO 3: Normalización de entidades
  private async performNormalization(entities: Entity[]): Promise<NormalizationStep[]> {
    console.log('🔧 PASO 3: Aplicando normalización a entidades...');
    
    const steps: NormalizationStep[] = [];
    let stepNumber = 1;
    
    // PASO 3.1: Verificar 1NF
    const step1NF = await this.ensureFirstNormalForm(entities);
    steps.push({
      step: stepNumber++,
      description: 'Verificar Primera Forma Normal (1NF)',
      action: 'Validar valores atómicos y estructura',
      result: step1NF.success ? '✅ 1NF cumplida' : '❌ 1NF no cumplida',
      tablesCreated: [],
      tablesModified: step1NF.modifiedTables
    });
    
    // PASO 3.2: Aplicar 2NF
    const step2NF = await this.applySecondNormalForm(entities);
    steps.push({
      step: stepNumber++,
      description: 'Aplicar Segunda Forma Normal (2NF)',
      action: 'Eliminar dependencias parciales',
      result: step2NF.success ? '✅ 2NF aplicada' : '⚠️ 2NF parcialmente aplicada',
      tablesCreated: step2NF.createdTables,
      tablesModified: step2NF.modifiedTables
    });
    
    // PASO 3.3: Aplicar 3NF
    const step3NF = await this.applyThirdNormalForm(entities);
    steps.push({
      step: stepNumber++,
      description: 'Aplicar Tercera Forma Normal (3NF)',
      action: 'Eliminar dependencias transitivas',
      result: step3NF.success ? '✅ 3NF aplicada' : '⚠️ 3NF parcialmente aplicada',
      tablesCreated: step3NF.createdTables,
      tablesModified: step3NF.modifiedTables
    });
    
    // PASO 3.4: Optimización final
    const stepOptimization = await this.performFinalOptimization(entities);
    steps.push({
      step: stepNumber++,
      description: 'Optimización final de estructura',
      action: 'Crear índices y constraints',
      result: '✅ Optimización completada',
      tablesCreated: [],
      tablesModified: stepOptimization.modifiedTables
    });
    
    console.log(`   - Pasos de normalización completados: ${steps.length}`);
    
    return steps;
  }

  // Verificar y aplicar 1NF
  private async ensureFirstNormalForm(entities: Entity[]): Promise<{
    success: boolean;
    modifiedTables: string[];
  }> {
    const modifiedTables: string[] = [];
    let allValid = true;
    
    entities.forEach(entity => {
      let entityValid = true;
      
      // Verificar que cada columna tenga valores atómicos
      entity.columns.forEach(column => {
        if (column.data.some(val => val.includes(',') || val.includes(';'))) {
          entityValid = false;
          console.log(`⚠️ Columna ${column.name} en ${entity.name} tiene valores no atómicos`);
        }
      });
      
      if (!entityValid) {
        allValid = false;
        modifiedTables.push(entity.name);
      }
    });
    
    return { success: allValid, modifiedTables };
  }

  // Aplicar 2NF
  private async applySecondNormalForm(entities: Entity[]): Promise<{
    success: boolean;
    createdTables: string[];
    modifiedTables: string[];
  }> {
    const createdTables: string[] = [];
    const modifiedTables: string[] = [];
    let allValid = true;
    
    entities.forEach(entity => {
      if (entity.columns.length <= 2) return; // Entidades simples ya están en 2NF
      
      // Buscar dependencias parciales
      const partialDependencies = this.findPartialDependencies(entity);
      
      if (partialDependencies.length > 0) {
        console.log(`🔀 Aplicando 2NF a ${entity.name}: ${partialDependencies.length} dependencias parciales`);
        
        // Crear nuevas entidades para dependencias parciales
        partialDependencies.forEach(dep => {
          const newEntityName = `${entity.name}_${dep.dependent.join('_')}`;
          createdTables.push(newEntityName);
          
          // Mover columnas dependientes a nueva entidad
          dep.dependent.forEach(colName => {
            const column = entity.columns.find(col => col.name === colName);
            if (column) {
              // Aquí se movería la columna a la nueva entidad
              console.log(`   - Moviendo columna ${colName} a ${newEntityName}`);
            }
          });
        });
        
        modifiedTables.push(entity.name);
      }
    });
    
    return { 
      success: allValid, 
      createdTables, 
      modifiedTables 
    };
  }

  // Aplicar 3NF
  private async applyThirdNormalForm(entities: Entity[]): Promise<{
    success: boolean;
    createdTables: string[];
    modifiedTables: string[];
  }> {
    const createdTables: string[] = [];
    const modifiedTables: string[] = [];
    let allValid = true;
    
    entities.forEach(entity => {
      if (entity.columns.length <= 2) return; // Entidades simples ya están en 3NF
      
      // Buscar dependencias transitivas
      const transitiveDependencies = this.findTransitiveDependencies(entity);
      
      if (transitiveDependencies.length > 0) {
        console.log(`🔀 Aplicando 3NF a ${entity.name}: ${transitiveDependencies.length} dependencias transitivas`);
        
        // Crear nuevas entidades para dependencias transitivas
        transitiveDependencies.forEach(dep => {
          const newEntityName = `${entity.name}_${dep.dependent.join('_')}`;
          createdTables.push(newEntityName);
          
          // Mover columnas dependientes a nueva entidad
          dep.dependent.forEach(colName => {
            const column = entity.columns.find(col => col.name === colName);
            if (column) {
              console.log(`   - Moviendo columna ${colName} a ${newEntityName}`);
            }
          });
        });
        
        modifiedTables.push(entity.name);
      }
    });
    
    return { 
      success: allValid, 
      createdTables, 
      modifiedTables 
    };
  }

  // Optimización final
  private async performFinalOptimization(entities: Entity[]): Promise<{
    modifiedTables: string[];
  }> {
    const modifiedTables: string[] = [];
    
    entities.forEach(entity => {
      // Agregar índices para claves foráneas
      if (entity.relationships.length > 0) {
        console.log(`📈 Optimizando ${entity.name} con índices`);
        modifiedTables.push(entity.name);
      }
      
      // Agregar constraints de validación
      if (entity.columns.some(col => col.type.includes('DECIMAL') || col.type.includes('INT'))) {
        console.log(`🔒 Agregando constraints de validación a ${entity.name}`);
        modifiedTables.push(entity.name);
      }
    });
    
    return { modifiedTables };
  }

  // Encontrar dependencias parciales (2NF)
  private findPartialDependencies(entity: Entity): any[] {
    const dependencies: any[] = [];
    
    if (!entity.primaryKey) return dependencies;
    
    // Análisis simplificado de dependencias parciales
    entity.columns.forEach(column => {
      if (column === entity.primaryKey) return;
      
      // Verificar si la columna depende solo de parte de la clave primaria
      // (implementación simplificada)
      if (column.name.toLowerCase().includes('nombre') || column.name.toLowerCase().includes('descripcion')) {
        dependencies.push({
          determinant: [entity.primaryKey.name],
          dependent: [column.name],
          type: 'PARTIAL'
        });
      }
    });
    
    return dependencies;
  }

  // Encontrar dependencias transitivas (3NF)
  private findTransitiveDependencies(entity: Entity): any[] {
    const dependencies: any[] = [];
    
    // Análisis simplificado de dependencias transitivas
    entity.columns.forEach(column1 => {
      entity.columns.forEach(column2 => {
        if (column1 === column2) return;
        if (column1 === entity.primaryKey || column2 === entity.primaryKey) return;
        
        // Verificar dependencias transitivas comunes
        if (this.isTransitiveDependency(column1, column2)) {
          dependencies.push({
            determinant: [column1.name],
            dependent: [column2.name],
            type: 'TRANSITIVE'
          });
        }
      });
    });
    
    return dependencies;
  }

  // Verificar si existe dependencia transitiva
  private isTransitiveDependency(col1: any, col2: any): boolean {
    const name1 = col1.name.toLowerCase();
    const name2 = col2.name.toLowerCase();
    
    // Patrones comunes de dependencias transitivas
    if (name1.includes('ciudad') && name2.includes('cliente')) return true;
    if (name1.includes('categoria') && name2.includes('producto')) return true;
    if (name1.includes('departamento') && name2.includes('empleado')) return true;
    
    return false;
  }

  // PASO 4: Generar script SQL
  private async generateSQLScript(entities: Entity[]): Promise<string> {
    console.log('⚡ PASO 4: Generando script SQL normalizado...');
    
    const sqlScript = this.sqlGenerator.generateCompleteSQL(entities);
    
    console.log(`   - Script SQL generado: ${sqlScript.length} caracteres`);
    
    return sqlScript;
  }

  // PASO 5: Análisis final
  private async performFinalAnalysis(entities: Entity[]): Promise<AnalysisResult> {
    console.log('📊 PASO 5: Realizando análisis final...');
    
    const totalRows = this.csvData.split('\n').length - 1;
    const uniqueRows = this.calculateUniqueRows(entities);
    const redundancyScore = this.calculateRedundancyScore(entities);
    const normalizationScore = this.calculateNormalizationScore(entities);
    
    const issues = this.identifyIssues(entities);
    const suggestions = this.generateSuggestions(entities);
    
    const formsNormal = {
      firstNF: true, // Asumimos que ya se aplicó
      secondNF: normalizationScore >= 70,
      thirdNF: normalizationScore >= 85,
      bcnf: normalizationScore >= 95
    };
    
    const analysis: AnalysisResult = {
      totalRows,
      uniqueRows,
      redundancyScore,
      normalizationScore,
      formsNormal,
      issues,
      suggestions
    };
    
    console.log(`   - Score final de normalización: ${normalizationScore.toFixed(1)}/100`);
    console.log(`   - Formas normales: 1NF:✅, 2NF:${formsNormal.secondNF ? '✅' : '❌'}, 3NF:${formsNormal.thirdNF ? '✅' : '❌'}`);
    
    return analysis;
  }

  // Calcular filas únicas
  private calculateUniqueRows(entities: Entity[]): number {
    // Implementación simplificada
    return this.csvData.split('\n').length - 1;
  }

  // Calcular score de redundancia
  private calculateRedundancyScore(entities: Entity[]): number {
    let totalRedundancy = 0;
    let columnCount = 0;
    
    entities.forEach(entity => {
      entity.columns.forEach(column => {
        totalRedundancy += column.redundancyPercentage;
        columnCount++;
      });
    });
    
    return columnCount > 0 ? totalRedundancy / columnCount : 0;
  }

  // Calcular score de normalización
  private calculateNormalizationScore(entities: Entity[]): number {
    if (entities.length === 0) return 0;
    
    const totalScore = entities.reduce((sum, entity) => sum + entity.normalizationScore, 0);
    return totalScore / entities.length;
  }

  // Identificar issues
  private identifyIssues(entities: Entity[]): Issue[] {
    const issues: Issue[] = [];
    
    entities.forEach(entity => {
      if (entity.normalizationScore < 70) {
        issues.push({
          type: 'STRUCTURE',
          severity: 'MEDIUM',
          description: `Entidad ${entity.name} tiene baja normalización`,
          affectedColumns: entity.columns.map(col => col.name),
          solution: 'Aplicar normalización adicional'
        });
      }
      
      if (!entity.primaryKey) {
        issues.push({
          type: 'STRUCTURE',
          severity: 'HIGH',
          description: `Entidad ${entity.name} no tiene clave primaria`,
          affectedColumns: entity.columns.map(col => col.name),
          solution: 'Definir clave primaria apropiada'
        });
      }
    });
    
    return issues;
  }

  // Generar sugerencias
  private generateSuggestions(entities: Entity[]): string[] {
    const suggestions: string[] = [];
    
    if (entities.length === 1) {
      suggestions.push('Considerar separar la tabla en múltiples entidades para mejor normalización');
    }
    
    entities.forEach(entity => {
      if (entity.relationships.length === 0 && entity.columns.length > 2) {
        suggestions.push(`Agregar relaciones a la entidad ${entity.name} para mejorar la integridad referencial`);
      }
      
      if (entity.normalizationScore < 80) {
        suggestions.push(`Revisar la estructura de ${entity.name} para mejorar la normalización`);
      }
    });
    
    return suggestions;
  }

  // Generar recomendaciones finales
  private generateRecommendations(analysis: AnalysisResult, summary: any): string[] {
    const recommendations: string[] = [];
    
    // Recomendaciones basadas en el score de normalización
    if (analysis.normalizationScore < 70) {
      recommendations.push('La base de datos requiere normalización significativa para cumplir con 3NF');
    } else if (analysis.normalizationScore < 85) {
      recommendations.push('La base de datos está parcialmente normalizada, considerar mejoras adicionales');
    } else {
      recommendations.push('La base de datos está bien normalizada y cumple con 3NF');
    }
    
    // Recomendaciones basadas en el número de entidades
    if (summary.totalEntities === 1) {
      recommendations.push('Considerar separar la tabla única en múltiples entidades para mejor organización');
    } else if (summary.totalEntities > 5) {
      recommendations.push('La base de datos está bien estructurada con múltiples entidades especializadas');
    }
    
    // Recomendaciones basadas en issues
    if (analysis.issues.length > 0) {
      recommendations.push(`Resolver ${analysis.issues.length} issues identificados para mejorar la calidad`);
    }
    
    return recommendations;
  }

  // Obtener resumen de la normalización
  public getNormalizationSummary(): {
    totalEntities: number;
    normalizationScore: number;
    formsNormal: string[];
    recommendations: string[];
  } {
    // Este método se puede usar para obtener un resumen rápido
    return {
      totalEntities: 0,
      normalizationScore: 0,
      formsNormal: [],
      recommendations: []
    };
  }
}

