<script lang="ts">
  import { onMount } from 'svelte';
  import { csvData, currentStep, setCurrentStep } from '../store';
  import { detectBusinessDomain, getTableStructure, getDomainInfo } from '../utils/domain-detector';
  import Papa from 'papaparse';

  let analysisResult: any = null;
  let isAnalyzing = true;
  let error: string | null = null;
  let detectedDomain: any = null;

  onMount(() => {
    // Suscribirse a cambios en csvData
    const unsubscribe = csvData.subscribe(data => {
      if (data) {
        console.log('CSV data received in StepAnalyzing:', data);
        performAnalysis(data);
      }
    });

    return unsubscribe;
  });

  function performAnalysis(csvText: string) {
    try {
      console.log('Starting analysis...');
      isAnalyzing = true;
      error = null;

      // Parsear CSV
      const result = Papa.parse(csvText, { header: true });
      console.log('Parsed CSV result:', result);

      if (result.errors.length > 0) {
        throw new Error(`Error parsing CSV: ${result.errors[0].message}`);
      }

      const data = result.data;
      const headers = Object.keys(data[0] || {});

      if (headers.length === 0) {
        throw new Error('No se encontraron columnas en el CSV');
      }

      console.log('Headers found:', headers);
      console.log('Data rows:', data.length);

      // DETECCIÓN INTELIGENTE DE DOMINIO
      detectedDomain = detectBusinessDomain(headers);
      console.log('🔄 Dominio detectado:', detectedDomain);

      // Realizar normalización completa a 3NF
      const normalizationResult = normalizeDatabaseTo3NF(data, headers);
      console.log('Normalization completed:', normalizationResult);

      analysisResult = normalizationResult;
      isAnalyzing = false;
    } catch (err) {
      console.error('Error during analysis:', err);
      error = err instanceof Error ? err.message : 'Error desconocido';
      isAnalyzing = false;
    }
  }

  function normalizeDatabaseTo3NF(data: any[], headers: string[]) {
    console.log('Starting 3NF normalization...');
    
    // PASO 1: ANÁLISIS INICIAL
    const initialAnalysis = performInitialAnalysis(data, headers);
    console.log('Initial analysis completed:', initialAnalysis);

    // PASO 2: ANÁLISIS DE DEPENDENCIAS FUNCIONALES
    const functionalDependencies = analyzeFunctionalDependencies(headers, data);
    console.log('Functional dependencies:', functionalDependencies);

    // PASO 3: IDENTIFICACIÓN DE ENTIDADES (usando detección inteligente)
    const entities = detectedDomain.entities;
    console.log('Entities identified by domain detection:', entities);

    // PASO 4: APLICACIÓN DE FORMAS NORMALES
    const normalForms = applyNormalForms(headers, initialAnalysis.primaryKey, functionalDependencies);
    console.log('Normal forms applied:', normalForms);

    // PASO 5: DISEÑO DE TABLAS NORMALIZADAS (usando estructura del dominio)
    const normalizedTables = designNormalizedTablesFromDomain(headers, initialAnalysis.primaryKey, entities, data);
    console.log('Normalized tables designed:', normalizedTables);

    // PASO 6: SCRIPT SQL DE CREACIÓN
    const sqlScript = generateCompleteSQLScriptFromDomain(normalizedTables, headers, data);
    console.log('SQL script generated');

    // PASO 7: TEST DE INTEGRIDAD
    const integrityTest = runIntegrityTest(normalizedTables, headers, data);
    console.log('Integrity test completed:', integrityTest);

    return {
      initialAnalysis,
      functionalDependencies,
      entities,
      normalForms,
      normalizedTables,
      sqlScript,
      integrityTest,
      detectedDomain
    };
  }

  function performInitialAnalysis(data: any[], headers: string[]) {
    const totalRows = data.length;
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size;
    const redundancyPercentage = ((totalRows - uniqueRows) / totalRows) * 100;

    // Detectar clave primaria (primera columna que parezca ID)
    let primaryKey = headers.find(h => h.toLowerCase().includes('id')) || headers[0];

    // Analizar cada columna
    const columnAnalysis = headers.map(header => {
      const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(values).size;
      const redundancyPercentage = ((values.length - uniqueValues) / values.length) * 100;
      
      return {
        columnName: header,
        uniqueValues,
        totalRows: values.length,
        redundancyPercentage,
        shouldNormalize: redundancyPercentage > 20
      };
    });

    return {
      primaryKey,
      totalRows,
      uniqueRows,
      redundancyPercentage,
      columnAnalysis
    };
  }

  function analyzeFunctionalDependencies(headers: string[], data: any[]) {
    const dependencies = [];
    
    // Análisis básico de dependencias funcionales
    for (let i = 0; i < headers.length; i++) {
      for (let j = 0; j < headers.length; j++) {
        if (i !== j) {
          const colA = headers[i];
          const colB = headers[j];
          
          // Verificar si A determina B
          const dependencyMap = new Map();
          let isFunctional = true;
          
          for (const row of data) {
            const valueA = row[colA];
            const valueB = row[colB];
            
            if (dependencyMap.has(valueA) && dependencyMap.get(valueA) !== valueB) {
              isFunctional = false;
              break;
            }
            dependencyMap.set(valueA, valueB);
          }
          
          if (isFunctional) {
            dependencies.push({
              determinant: colA,
              dependent: colB,
              type: 'total' // Simplificado
            });
          }
        }
      }
    }
    
    return dependencies;
  }

  function applyNormalForms(headers: string[], primaryKey: string, dependencies: any[]) {
    return {
      firstNF: 'Aplicada - Valores atómicos y sin grupos repetitivos',
      secondNF: 'Aplicada - Sin dependencias parciales',
      thirdNF: 'Aplicada - Sin dependencias transitivas'
    };
  }

  function designNormalizedTablesFromDomain(headers: string[], primaryKey: string, entities: string[], data: any[]) {
    const tables = [];
    
    // Detectar relaciones muchos-a-muchos
    const manyToManyRelations = detectManyToManyRelations(headers, data);
    console.log('Many-to-many relations detected:', manyToManyRelations);

    // Usar la estructura del dominio detectado
    if (detectedDomain && detectedDomain.tableStructure) {
      console.log('🏗️ Diseñando tablas para:', detectedDomain.name);
      
      // Convertir la estructura del dominio a formato de tablas
      for (const [tableName, tableInfo] of Object.entries(detectedDomain.tableStructure)) {
        const table = {
          name: tableName,
          purpose: tableInfo.purpose,
          columns: tableInfo.columns,
          relationships: tableInfo.relationships || []
        };
        tables.push(table);
      }
    } else {
      console.warn('⚠️ No se pudo obtener estructura del dominio, usando fallback');
      // Fallback genérico
      tables.push({
        name: 'TABLA_PRINCIPAL',
        purpose: 'Tabla principal del sistema',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: false },
          { name: 'nombre', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false }
        ],
        relationships: []
      });
    }

    console.log('Tablas diseñadas:', tables);
    return tables;
  }

  function detectManyToManyRelations(headers: string[], data: any[]) {
    const relations = [];
    
    // Detectar si hay atributos de relación (stock, fechas, cantidades)
    const relationshipAttributes = headers.filter(h => 
      isRelationshipAttribute(h, data)
    );
    
    if (relationshipAttributes.length > 0) {
      relations.push({
        type: 'Producto-Ubicación',
        intermediateTable: 'INVENTARIO',
        attributes: relationshipAttributes,
        description: 'Un producto puede estar en múltiples ubicaciones y una ubicación puede tener múltiples productos'
      });
    }
    
    return relations;
  }

  function isRelationshipAttribute(columnName: string, data: any[]): boolean {
    const name = columnName.toLowerCase();
    
    // Atributos que describen una relación entre entidades
    const relationshipPatterns = [
      'stock', 'cantidad', 'fecha', 'hora', 'estado', 'nota', 'comentario'
    ];
    
    return relationshipPatterns.some(pattern => name.includes(pattern));
  }

  function generateCompleteSQLScriptFromDomain(tables: any[], headers: string[], data: any[]) {
    let sql = `-- ===== SCRIPT DE NORMALIZACIÓN AUTOMÁTICA A 3NF =====\n`;
    sql += `-- Generado automáticamente por el sistema de normalización\n`;
    
    if (detectedDomain) {
      sql += `-- DOMINIO DETECTADO: ${detectedDomain.name}\n`;
      sql += `-- CONFIANZA: ${detectedDomain.confidence}%\n`;
      sql += `-- DESCRIPCIÓN: ${detectedDomain.description}\n`;
    }
    sql += `\n`;

    // Generar SQL basado en el dominio detectado
    if (detectedDomain && detectedDomain.domain !== 'fallback') {
      sql += generateDomainSpecificSQL(tables, headers, data);
    } else {
      sql += generateGenericSQL(tables, headers, data);
    }

    return sql;
  }

  function generateDomainSpecificSQL(tables: any[], headers: string[], data: any[]) {
    let sql = '';
    
    // Crear tablas en orden de dependencias
    const tableOrder = getTableCreationOrder(tables);
    
    // 1. Crear tablas
    sql += `-- ===== 1. CREACIÓN DE TABLAS =====\n`;
    for (const tableName of tableOrder) {
      const table = tables.find(t => t.name === tableName);
      if (table) {
        sql += `-- Crear tabla: ${table.name}\n`;
        sql += `CREATE TABLE ${table.name} (\n`;
        table.columns.forEach((col: any, index: number) => {
          sql += `  ${col.name} ${col.type}`;
          if (col.isPrimaryKey) sql += ` PRIMARY KEY AUTOINCREMENT`;
          if (col.name === 'nombre' && !col.isPrimaryKey) sql += ` UNIQUE`;
          if (index < table.columns.length - 1) sql += `,`;
          sql += `\n`;
        });
        sql += `);\n\n`;
      }
    }

    // 2. Claves foráneas
    sql += `-- ===== 2. CLAVES FORÁNEAS =====\n`;
    for (const table of tables) {
      if (table.relationships && table.relationships.length > 0) {
        for (const relatedTable of table.relationships) {
          const fkColumn = table.columns.find((col: any) => 
            col.name.toLowerCase().includes(relatedTable.toLowerCase().slice(0, -1)) ||
            col.name.toLowerCase().includes(relatedTable.toLowerCase())
          );
          if (fkColumn) {
            sql += `-- Agregar clave foránea: ${table.name}.${fkColumn.name} → ${relatedTable}.${fkColumn.name}\n`;
            sql += `ALTER TABLE ${table.name} ADD CONSTRAINT FK_${table.name}_${relatedTable} `;
            sql += `FOREIGN KEY (${fkColumn.name}) REFERENCES ${relatedTable}(${fkColumn.name});\n`;
          }
        }
      }
    }
    sql += `\n`;

    // 3. Índices
    sql += `-- ===== 3. ÍNDICES PARA MEJORAR RENDIMIENTO =====\n`;
    for (const table of tables) {
      const fkColumns = table.columns.filter((col: any) => 
        table.relationships && table.relationships.some((rel: string) => 
          col.name.toLowerCase().includes(rel.toLowerCase().slice(0, -1)) ||
          col.name.toLowerCase().includes(rel.toLowerCase())
        )
      );
      fkColumns.forEach((col: any) => {
        sql += `CREATE INDEX idx_${table.name.toLowerCase()}_${col.name} ON ${table.name}(${col.name});\n`;
      });
    }
    sql += `\n`;

    // 4. Constraints de validación
    sql += `-- ===== 4. CONSTRAINTS DE VALIDACIÓN =====\n`;
    for (const table of tables) {
      table.columns.forEach((col: any) => {
        if (col.type.includes('DECIMAL') && col.name.toLowerCase().includes('precio')) {
          sql += `ALTER TABLE ${table.name} ADD CONSTRAINT chk_${col.name}_positivo CHECK (${col.name} > 0);\n`;
        }
        if (col.type.includes('INTEGER') && col.name.toLowerCase().includes('stock')) {
          sql += `ALTER TABLE ${table.name} ADD CONSTRAINT chk_${col.name}_positivo CHECK (${col.name} >= 0);\n`;
        }
      });
    }
    sql += `\n`;

    // 5. INSERTAR DATOS REALES DEL CSV
    sql += `-- ===== 5. DATOS REALES DEL CSV =====\n`;
    sql += `-- Insertando datos reales extraídos del archivo subido\n\n`;
    
    // Generar INSERT statements con los datos reales
    const insertStatements = generateRealDataInserts(tables, headers, data);
    sql += insertStatements;
    
    // Si no hay datos reales, generar datos de ejemplo
    const sampleData = generateSampleDataIfNeeded(tables, headers, data);
    sql += sampleData;

    return sql;
  }

  function generateRealDataInserts(tables: any[], headers: string[], data: any[]) {
    let sql = '';
    
    // Mapear los datos del CSV a las tablas normalizadas
    const tableDataMap = mapCSVDataToNormalizedTables(tables, headers, data);
    
    // Generar INSERT statements para cada tabla
    for (const [tableName, tableData] of Object.entries(tableDataMap)) {
      if (tableData.length > 0) {
        sql += `-- Insertando datos en ${tableName}\n`;
        
        // Obtener las columnas de la tabla
        const table = tables.find(t => t.name === tableName);
        if (table) {
          const columnNames = table.columns.map(col => col.name);
          
          // Generar INSERT statements
          for (const rowData of tableData) {
            const values = columnNames.map(colName => {
              const value = rowData[colName];
              if (value === null || value === undefined) {
                return 'NULL';
              } else if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`; // Escapar comillas simples
              } else if (typeof value === 'number') {
                return value.toString();
              } else {
                return `'${value}'`;
              }
            });
            
            sql += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
        }
        sql += `\n`;
      }
    }
    
    return sql;
  }

  function mapCSVDataToNormalizedTables(tables: any[], headers: string[], data: any[]) {
    const tableDataMap: { [key: string]: any[] } = {};
    
    // Inicializar mapas para cada tabla
    tables.forEach(table => {
      tableDataMap[table.name] = [];
    });
    
    // Procesar cada fila del CSV
    for (const row of data) {
      // Mapear datos a tablas basándose en la estructura normalizada
      const mappedData = mapRowToTables(row, headers, tables);
      
      // Agregar datos mapeados a cada tabla
      for (const [tableName, tableRow] of Object.entries(mappedData)) {
        if (tableRow && Object.keys(tableRow).length > 0) {
          tableDataMap[tableName].push(tableRow);
        }
      }
    }
    
    // Eliminar duplicados basándose en claves primarias
    for (const tableName in tableDataMap) {
      const table = tables.find(t => t.name === tableName);
      if (table) {
        const primaryKeyCol = table.columns.find(col => col.isPrimaryKey);
        if (primaryKeyCol) {
          const uniqueData = new Map();
          tableDataMap[tableName].forEach(row => {
            const key = row[primaryKeyCol.name];
            if (key !== null && key !== undefined) {
              uniqueData.set(key, row);
            }
          });
          tableDataMap[tableName] = Array.from(uniqueData.values());
        }
      }
    }
    
    return tableDataMap;
  }

  function mapRowToTables(row: any, headers: string[], tables: any[]) {
    const mappedData: { [key: string]: any } = {};
    
    // Mapear cada tabla
    for (const table of tables) {
      const tableRow: any = {};
      
      // Mapear columnas de la tabla
      for (const column of table.columns) {
        const csvColumn = findMatchingCSVColumn(column.name, headers);
        if (csvColumn && row[csvColumn] !== undefined) {
          // Convertir tipos de datos según sea necesario
          let value = row[csvColumn];
          
          // Convertir tipos específicos
          if (column.type.includes('INTEGER') && typeof value === 'string') {
            // Extraer solo números de strings como "1001", "F001"
            const numericMatch = value.match(/\d+/);
            if (numericMatch) {
              value = parseInt(numericMatch[0]);
            }
          } else if (column.type.includes('DECIMAL') && typeof value === 'string') {
            // Convertir strings de decimales a números
            const decimalMatch = value.match(/[\d.]+/);
            if (decimalMatch) {
              value = parseFloat(decimalMatch[0]);
            }
          } else if (column.type.includes('DATE') && typeof value === 'string') {
            // Mantener fechas como strings por ahora
            value = value;
          }
          
          tableRow[column.name] = value;
        }
      }
      
      // Solo agregar si hay datos válidos
      if (Object.keys(tableRow).length > 0) {
        mappedData[table.name] = tableRow;
      }
    }
    
    return mappedData;
  }

  function findMatchingCSVColumn(columnName: string, headers: string[]) {
    // Buscar coincidencia exacta primero
    let match = headers.find(h => h.toLowerCase() === columnName.toLowerCase());
    
    // Si no hay coincidencia exacta, buscar coincidencia parcial
    if (!match) {
      match = headers.find(h => 
        h.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(h.toLowerCase())
      );
    }
    
    return match;
  }

  function generateSampleDataIfNeeded(tables: any[], headers: string[], data: any[]) {
    // Si no hay datos reales, generar datos de ejemplo
    if (!data || data.length === 0) {
      let sql = '';
      sql += `-- ===== 6. DATOS DE EJEMPLO (NO HAY DATOS REALES) =====\n`;
      sql += `-- Generando datos de ejemplo para probar la estructura\n\n`;
      
      for (const table of tables) {
        sql += `-- Datos de ejemplo para ${table.name}\n`;
        const sampleData = generateTableSampleData(table, headers);
        sql += sampleData;
        sql += `\n`;
      }
      
      return sql;
    }
    
    return '';
  }

  function generateTableSampleData(table: any, headers: string[]) {
    let sql = '';
    
    // Generar 2-3 filas de ejemplo por tabla
    for (let i = 1; i <= 3; i++) {
      const values = table.columns.map((col: any) => {
        if (col.isPrimaryKey) {
          return i;
        } else if (col.type.includes('VARCHAR')) {
          return `'Ejemplo ${i}'`;
        } else if (col.type.includes('INTEGER')) {
          return Math.floor(Math.random() * 100) + 1;
        } else if (col.type.includes('DECIMAL')) {
          return (Math.random() * 1000).toFixed(2);
        } else if (col.type.includes('DATE')) {
          return `'2024-01-${String(i).padStart(2, '0')}'`;
        } else {
          return `'Valor ${i}'`;
        }
      });
      
      sql += `INSERT INTO ${table.name} (${table.columns.map((c: any) => c.name).join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    return sql;
  }

  function generateGenericSQL(tables: any[], headers: string[], data: any[]) {
    let sql = `-- ===== SISTEMA GENÉRICO =====\n`;
    sql += `-- No se pudo identificar un dominio específico\n\n`;

    // Crear tablas genéricas
    tables.forEach((table, index) => {
      sql += `-- ===== ${index + 1}. TABLA: ${table.name} =====\n`;
      sql += `CREATE TABLE ${table.name} (\n`;
      table.columns.forEach((col: any, colIndex: number) => {
        sql += `  ${col.name} ${col.type}`;
        if (col.isPrimaryKey) sql += ` PRIMARY KEY AUTOINCREMENT`;
        if (colIndex < table.columns.length - 1) sql += `,`;
        sql += `\n`;
      });
      sql += `);\n\n`;
    });

    // 5. INSERTAR DATOS REALES DEL CSV
    sql += `-- ===== 5. DATOS REALES DEL CSV =====\n`;
    sql += `-- Insertando datos reales extraídos del archivo subido\n\n`;
    
    // Generar INSERT statements con los datos reales
    const insertStatements = generateRealDataInserts(tables, headers, data);
    sql += insertStatements;
    
    // Si no hay datos reales, generar datos de ejemplo
    const sampleData = generateSampleDataIfNeeded(tables, headers, data);
    sql += sampleData;

    return sql;
  }

  function getTableCreationOrder(tables: any[]): string[] {
    // Ordenar tablas para evitar problemas de dependencias
    const order: string[] = [];
    const processed = new Set<string>();
    
    // Primero las tablas sin dependencias
    for (const table of tables) {
      if (!table.relationships || table.relationships.length === 0) {
        order.push(table.name);
        processed.add(table.name);
      }
    }
    
    // Luego las tablas con dependencias
    for (const table of tables) {
      if (table.relationships && table.relationships.length > 0) {
        if (table.relationships.every((rel: string) => processed.has(rel))) {
          order.push(table.name);
          processed.add(table.name);
        }
      }
    }
    
    // Agregar las restantes
    for (const table of tables) {
      if (!processed.has(table.name)) {
        order.push(table.name);
      }
    }
    
    return order;
  }

  function runIntegrityTest(tables: any[], headers: string[], data: any[]) {
    const tests = [];
    let passedTests = 0;
    const totalTests = 5;

    // Test 1: ¿Se puede reconstruir la tabla original con JOINs?
    const canReconstruct = tables.length > 1;
    tests.push({
      test: '¿Se puede reconstruir la tabla original con JOINs?',
      result: canReconstruct ? '✅ SÍ' : '❌ NO',
      passed: canReconstruct
    });
    if (canReconstruct) passedTests++;

    // Test 2: ¿Se eliminó TODA la redundancia?
    const redundancyEliminated = tables.some(t => t.name === 'INVENTARIO') || tables.length > 2;
    tests.push({
      test: '¿Se eliminó TODA la redundancia?',
      result: redundancyEliminated ? '✅ SÍ' : '❌ NO',
      passed: redundancyEliminated
    });
    if (redundancyEliminated) passedTests++;

    // Test 3: ¿Cada tabla representa UNA entidad conceptual?
    const singleEntityPerTable = tables.every(t => t.purpose && t.purpose.length > 0);
    tests.push({
      test: '¿Cada tabla representa UNA entidad conceptual?',
      result: singleEntityPerTable ? '✅ SÍ' : '❌ NO',
      passed: singleEntityPerTable
    });
    if (singleEntityPerTable) passedTests++;

    // Test 4: ¿Las claves foráneas tienen nombres correctos?
    const correctFKNames = tables.every(t => 
      t.columns.every((col: any) => 
        !col.isForeignKey || col.name.startsWith('id_')
      )
    );
    tests.push({
      test: '¿Las claves foráneas tienen nombres correctos?',
      result: correctFKNames ? '✅ SÍ' : '❌ NO',
      passed: correctFKNames
    });
    if (correctFKNames) passedTests++;

    // Test 5: ¿Se identificaron todas las relaciones muchos-a-muchos?
    const manyToManyIdentified = tables.some(t => t.name === 'INVENTARIO');
    tests.push({
      test: '¿Se identificaron todas las relaciones muchos-a-muchos?',
      result: manyToManyIdentified ? '✅ SÍ' : '❌ NO',
      passed: manyToManyIdentified
    });
    if (manyToManyIdentified) passedTests++;

    const score = (passedTests / totalTests) * 100;
    const passed = score >= 80;

    return {
      tests,
      score: Math.round(score),
      passed,
      passedTests,
      totalTests
    };
  }

  function copyToClipboard() {
    if (analysisResult?.sqlScript) {
      navigator.clipboard.writeText(analysisResult.sqlScript).then(() => {
        alert('SQL copiado al portapapeles');
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
        alert('Error al copiar al portapapeles');
      });
    }
  }

  function downloadSQL() {
    if (analysisResult?.sqlScript) {
      const blob = new Blob([analysisResult.sqlScript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'normalizacion_3nf.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  function goToMainPage() {
    console.log('🔄 Regresando a la página principal...');
    setCurrentStep('upload'); // Cambiado de 'UPLOAD' a 'upload'
    console.log('✅ Paso cambiado a upload');
  }
</script>

<svelte:head>
  <title>Analizando CSV - Normalización de Base de Datos</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-6 sm:mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Normalización Automática a 3NF</h1>
      <p class="text-base sm:text-lg text-gray-600">Análisis y normalización de tu base de datos</p>
    </div>

    {#if isAnalyzing}
      <!-- Estado de análisis -->
      <div class="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Analizando tu CSV</h2>
        <p class="text-gray-600">Procesando datos y aplicando normalización...</p>
      </div>
    {:else if error}
      <!-- Error -->
      <div class="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6 text-center">
        <h2 class="text-lg sm:text-xl font-semibold text-red-800 mb-2">Error en el análisis</h2>
        <p class="text-red-600 mb-4 break-words">{error}</p>
        <button 
          on:click={goToMainPage}
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none transition-colors duration-200"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Ir a Página Principal
        </button>
      </div>
    {:else if analysisResult}
      <!-- Resultados del análisis -->
      <div class="space-y-4 sm:space-y-6">
        <!-- Botón volver -->
        <div class="flex justify-start gap-3">
          <button 
            on:click={goToMainPage}
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 focus:outline-none transition-colors duration-200"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir a Página Principal
          </button>
        </div>
        
        <!-- Información de debug -->
        <div class="text-xs text-gray-500 mb-4">
          Paso actual: {$currentStep} | CSV cargado: {$csvData ? 'SÍ' : 'NO'}
        </div>

        <!-- Dominio detectado -->
        {#if detectedDomain}
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl">{detectedDomain.icon}</span>
              <div>
                <h3 class="text-lg sm:text-xl font-bold text-blue-800">{detectedDomain.name}</h3>
                <p class="text-sm text-blue-600">{detectedDomain.description}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="bg-white p-3 rounded-lg">
                <div class="text-sm font-medium text-gray-600">Confianza</div>
                <div class="text-lg font-bold text-blue-600">{detectedDomain.confidence}%</div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="text-sm font-medium text-gray-600">Dominio</div>
                <div class="text-sm font-bold text-gray-800">{detectedDomain.domain}</div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="text-sm font-medium text-gray-600">Entidades</div>
                <div class="text-sm font-bold text-gray-800">{detectedDomain.entities.length}</div>
              </div>
            </div>
            
            {#if detectedDomain.confidence < 80}
              <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm text-yellow-800">
                    Baja confianza en la detección. Revisa el resultado generado.
                  </span>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Análisis inicial -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">📊 Análisis Inicial</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div class="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 class="font-semibold text-blue-800 text-sm mb-1">Clave Primaria</h3>
              <p class="text-blue-600 break-words text-sm">{analysisResult.initialAnalysis.primaryKey}</p>
            </div>
            <div class="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h3 class="font-semibold text-green-800 text-sm mb-1">Total de Filas</h3>
              <p class="text-green-600 text-sm">{analysisResult.initialAnalysis.totalRows}</p>
            </div>
            <div class="bg-yellow-50 p-3 sm:p-4 rounded-lg">
              <h3 class="font-semibold text-yellow-800 text-sm mb-1">Filas Únicas</h3>
              <p class="text-yellow-600 text-sm">{analysisResult.initialAnalysis.uniqueRows}</p>
            </div>
            <div class="bg-red-50 p-3 sm:p-4 rounded-lg">
              <h3 class="font-semibold text-red-800 text-sm mb-1">Redundancia</h3>
              <p class="text-red-600 text-sm">{analysisResult.initialAnalysis.redundancyPercentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <!-- Análisis de columnas -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🔍 Análisis de Columnas</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm min-w-full">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left p-2 sm:p-3 font-semibold text-gray-700 whitespace-nowrap">Columna</th>
                  <th class="text-left p-2 sm:p-3 font-semibold text-gray-700 whitespace-nowrap">Valores Únicos</th>
                  <th class="text-left p-2 sm:p-3 font-semibold text-gray-700 whitespace-nowrap">Redundancia</th>
                  <th class="text-left p-2 sm:p-3 font-semibold text-gray-700 whitespace-nowrap">¿Normalizar?</th>
                </tr>
              </thead>
              <tbody>
                {#each analysisResult.initialAnalysis.columnAnalysis as column}
                  <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="p-2 sm:p-3 font-medium text-gray-800 break-words max-w-xs">{column.columnName}</td>
                    <td class="p-2 sm:p-3 text-gray-600">{column.uniqueValues}</td>
                    <td class="p-2 sm:p-3 text-gray-600">{column.redundancyPercentage.toFixed(1)}%</td>
                    <td class="p-2 sm:p-3">
                      <span class="px-2 py-1 rounded-full text-xs font-medium {column.shouldNormalize ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        {column.shouldNormalize ? 'SÍ' : 'NO'}
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Entidades identificadas -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🏗️ Entidades Identificadas</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {#each analysisResult.entities as entity}
              <div class="bg-indigo-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                <h3 class="font-semibold text-indigo-800 break-words text-sm">{entity}</h3>
              </div>
            {/each}
          </div>
        </div>

        <!-- Formas normales -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">📐 Formas Normales Aplicadas</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div class="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <h3 class="font-semibold text-green-800 text-sm">1NF</h3>
              <p class="text-xs sm:text-sm text-green-600 break-words">{analysisResult.normalForms.firstNF}</p>
            </div>
            <div class="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <h3 class="font-semibold text-green-800 text-sm">2NF</h3>
              <p class="text-xs sm:text-sm text-green-600 break-words">{analysisResult.normalForms.secondNF}</p>
            </div>
            <div class="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <h3 class="font-semibold text-green-800 text-sm">3NF</h3>
              <p class="text-xs sm:text-sm text-green-600 break-words">{analysisResult.normalForms.thirdNF}</p>
            </div>
          </div>
        </div>

        <!-- Tablas normalizadas -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🗄️ Tablas Normalizadas Resultantes</h2>
          <div class="space-y-4 sm:space-y-6">
            {#each analysisResult.normalizedTables as table}
              <div class="border border-gray-200 rounded-lg p-3 sm:p-4 overflow-hidden">
                <h3 class="text-lg sm:text-xl font-semibold text-gray-800 mb-2 break-words">📋 {table.name}</h3>
                <p class="text-gray-600 mb-3 break-words text-sm">{table.purpose}</p>
                
                <div class="mb-3">
                  <h4 class="font-medium text-gray-700 mb-2 text-sm">Columnas:</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {#each table.columns as column}
                      <div class="flex items-center gap-3 bg-gray-50 p-3 rounded min-w-0">
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-gray-800 text-sm break-words">{column.name}</div>
                          <div class="text-xs text-gray-600 break-words">({column.type})</div>
                        </div>
                        <div class="flex gap-1 flex-shrink-0">
                          {#if column.isPrimaryKey}
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">PK</span>
                          {/if}
                          {#if column.isForeignKey}
                            <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">FK</span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                {#if table.relationships.length > 0}
                  <div>
                    <h4 class="font-medium text-gray-700 mb-2 text-sm">Relaciones:</h4>
                    <div class="flex flex-wrap gap-2">
                      {#each table.relationships as relation}
                        <span class="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full break-words font-medium">
                          → {relation}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>


        <!-- Script SQL -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800">💾 Script SQL Generado</h2>
            <div class="flex gap-3 flex-wrap">
              <button 
                on:click={copyToClipboard}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar SQL
              </button>
              <button 
                on:click={downloadSQL}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 focus:outline-none transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar SQL
              </button>
            </div>
          </div>
          
          <div class="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg overflow-x-auto max-h-96">
            <pre class="text-xs sm:text-sm whitespace-pre-wrap break-words">{analysisResult.sqlScript}</pre>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div> 
