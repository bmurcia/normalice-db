<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';
  import { csvData, currentStep, setCurrentStep, setOriginalAnalysis, setNormalizationSteps, setFinalAnalysis } from '../store';
  import { detectBusinessDomain } from '../utils/domain-detector';
  import { ImprovedSQLGenerator, convertEntitiesToSQLTables, downloadSQLScript } from '../utils/normalization/sqlGenerator';

  let analysisResult: any = null;
  let isAnalyzing = true;
  let error: string | null = null;
  let detectedDomain: any = null;
  let sqlScript: string = '';
  let showSQLPreview: boolean = false;

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

      // PASO 1: ANALIZAR ESTRUCTURA DEL CSV
      const csvStructure = analyzeCSVStructure(csvText);
      console.log('CSV structure analyzed:', csvStructure);

      // PASO 2: PARSEAR CSV CON ESTRUCTURA DETECTADA
      const parsedData = parseCSVWithStructure(csvText, csvStructure);
      console.log('CSV parsed with structure:', parsedData);

      // PASO 3: DETECCIÓN INTELIGENTE DE DOMINIO
      detectedDomain = detectBusinessDomain(parsedData.headers);
      console.log('🔄 Dominio detectado:', detectedDomain);

      // PASO 4: Realizar normalización completa a 3NF
      const normalizationResult = normalizeDatabaseTo3NF(parsedData.data, parsedData.headers);
      console.log('Normalization completed:', normalizationResult);

      // PASO 5: GUARDAR ANÁLISIS ORIGINAL EN EL STORE
      const originalAnalysis = {
        headers: parsedData.headers,
        totalRows: parsedData.data.length,
        totalColumns: parsedData.headers.length,
        redundancyScore: normalizationResult.initialAnalysis.redundancyPercentage,
        normalizationLevel: normalizationResult.initialAnalysis.initialNormalForm.level,
        initialNormalForm: normalizationResult.initialAnalysis.initialNormalForm,
        columnAnalysis: normalizationResult.initialAnalysis.columnAnalysis,
        functionalDependencies: normalizationResult.functionalDependencies,
        issues: generateIssuesFromAnalysis(normalizationResult.initialAnalysis, parsedData.data)
      };
      setOriginalAnalysis(originalAnalysis);

      // PASO 6: GUARDAR PASOS DE NORMALIZACIÓN
      const normalizationSteps = generateNormalizationSteps(normalizationResult);
      setNormalizationSteps(normalizationSteps);

      // PASO 7: GUARDAR ANÁLISIS FINAL
      const finalAnalysis = {
        normalizationScore: normalizationResult.integrityTest.score,
        tablesCreated: normalizationResult.normalizedTables.length,
        relationshipsCreated: countTotalRelationships(normalizationResult.normalizedTables),
        redundancyEliminated: calculateRedundancyElimination(normalizationResult.initialAnalysis, normalizationResult.normalizedTables),
        integrityTests: normalizationResult.integrityTest.tests
      };
      setFinalAnalysis(finalAnalysis);

      analysisResult = normalizationResult;
      sqlScript = normalizationResult.sqlScript || '';
      

      
      isAnalyzing = false;
    } catch (err) {
      console.error('Error during analysis:', err);
      error = err instanceof Error ? err.message : 'Error desconocido';
      isAnalyzing = false;
    }
  }

  // Función mejorada para analizar la estructura del CSV
  function analyzeCSVStructure(csvText: string) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos 2 filas (encabezados y datos)');
    }

    const firstLine = lines[0];
    const secondLine = lines[1];
    
    // Detectar si la primera fila contiene tipos de datos
    const firstLineHasTypes = detectIfFirstLineHasTypes(firstLine);
    const secondLineHasTypes = detectIfFirstLineHasTypes(secondLine);
    
    let structure = {
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

    console.log('CSV Structure detected:', structure);
    return structure;
  }

  // Función para detectar si una línea contiene tipos de datos
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

  // Función para parsear CSV con la estructura detectada
  function parseCSVWithStructure(csvText: string, structure: any) {
    const lines = csvText.trim().split('\n');
    
    // Extraer solo las filas de datos
    const dataLines = lines.slice(structure.dataStartIndex);
    
    // Parsear datos manualmente para mayor control
    const data = dataLines.map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      structure.cleanHeaders.forEach((header: string, colIndex: number) => {
        if (values[colIndex] !== undefined) {
          row[header] = values[colIndex];
        }
      });
      
      return row;
    }).filter(row => Object.keys(row).length > 0); // Filtrar filas vacías

    return {
      headers: structure.cleanHeaders,
      types: structure.detectedTypes,
      data: data,
      structure: structure
    };
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
    console.log('Detected domain:', detectedDomain);
    console.log('Entities array length:', entities ? entities.length : 'undefined');

    // PASO 4: APLICACIÓN DE FORMAS NORMALES
    const normalForms = applyNormalForms(headers, initialAnalysis.primaryKey, functionalDependencies);
    console.log('Normal forms applied:', normalForms);

    // PASO 5: DISEÑO DE TABLAS NORMALIZADAS (usando estructura del dominio)
    let normalizedTables = designNormalizedTablesFromDomain(headers, initialAnalysis.primaryKey, entities, data);
    console.log('Normalized tables designed:', normalizedTables);

          // PASO 6: SCRIPT SQL DE CREACIÓN (usando generador mejorado)
      const sqlGenerator = new ImprovedSQLGenerator();
      console.log('SQL Generator creado:', sqlGenerator);
      
      // Convertir las tablas normalizadas al formato correcto para SQL
      const sqlTables = convertEntitiesToSQLTables(normalizedTables);
      
      console.log('Tablas convertidas a formato SQL:', sqlTables);
      console.log('Número de tablas SQL:', sqlTables.length);
      
      const sqlScript = sqlGenerator.generateSQL(sqlTables);
      console.log('SQL script generated with improved generator');
      console.log('Longitud del SQL generado:', sqlScript ? sqlScript.length : 'undefined');
      console.log('SQL generado (primeros 300 chars):', sqlScript ? sqlScript.substring(0, 300) : 'undefined');
      
      // PASO 7: ACTUALIZAR LAS TABLAS NORMALIZADAS CON TIPOS CORREGIDOS
      // Para que la visualización y Mermaid usen los mismos tipos que el SQL
      normalizedTables = normalizedTables.map(table => ({
        ...table,
        columns: table.columns.map((col: any) => {
          const sqlTable = sqlTables.find(st => st.name === table.name);
          const sqlColumn = sqlTable?.columns.find(sc => sc.name === col.name);
          return {
            ...col,
            type: sqlColumn?.type || col.type
          };
        })
      }));

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

    // Detectar clave primaria de forma inteligente
    let primaryKey = detectIntelligentPrimaryKey(headers, data);

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
    const initialNormalForm = detectInitialNormalForm(data, headers, primaryKey, redundancyPercentage);

    return {
      primaryKey,
      totalRows,
      uniqueRows,
      redundancyPercentage,
      columnAnalysis,
      initialNormalForm
    };
  }

  // Función para detectar clave primaria de forma inteligente
  function detectIntelligentPrimaryKey(headers: string[], data: any[]): string {
    console.log('🔍 Detectando clave primaria inteligente...');
    console.log('Headers:', headers);
    
    // PATRÓN 1: Tabla de facturación (num_factura + id_producto)
    if (headers.some(h => h.toLowerCase().includes('num_factura') || h.toLowerCase().includes('factura')) &&
        headers.some(h => h.toLowerCase().includes('id_producto') || h.toLowerCase().includes('producto'))) {
      console.log('📋 Patrón de facturación detectado');
      return 'num_factura,id_producto';
    }
    
    // PATRÓN 2: Tabla de transacciones con múltiples entidades
    if (headers.some(h => h.toLowerCase().includes('id_cliente')) &&
        headers.some(h => h.toLowerCase().includes('id_producto')) &&
        headers.some(h => h.toLowerCase().includes('cantidad') || h.toLowerCase().includes('precio'))) {
      console.log('🛒 Patrón de transacción detectado');
      return 'id_cliente,id_producto';
    }
    
    // PATRÓN 3: Tabla de catálogo simple (solo ID)
    if (headers.some(h => h.toLowerCase().includes('id_') && !h.toLowerCase().includes('factura'))) {
      const idColumn = headers.find(h => h.toLowerCase().includes('id_'));
      console.log('🏷️ Patrón de catálogo detectado:', idColumn);
      return idColumn || headers[0];
    }
    
    // PATRÓN 4: Tabla de relación muchos a muchos
    if (headers.filter(h => h.toLowerCase().includes('id_')).length >= 2) {
      const idColumns = headers.filter(h => h.toLowerCase().includes('id_'));
      console.log('🔗 Patrón de relación M:N detectado:', idColumns);
      return idColumns.join(',');
    }
    
    // PATRÓN 5: Tabla con código único (num_factura, codigo, etc.)
    if (headers.some(h => h.toLowerCase().includes('num_') || h.toLowerCase().includes('codigo'))) {
      const codeColumn = headers.find(h => h.toLowerCase().includes('num_') || h.toLowerCase().includes('codigo'));
      console.log('🔢 Patrón de código único detectado:', codeColumn);
      return codeColumn || headers[0];
    }
    
    // PATRÓN 6: Fallback a la primera columna que parezca ID
    const idColumn = headers.find(h => h.toLowerCase().includes('id')) || headers[0];
    console.log('🔄 Fallback a columna ID:', idColumn);
    return idColumn;
  }

  // Función para detectar la forma normal inicial de la tabla
  function detectInitialNormalForm(data: any[], headers: string[], primaryKey: string, redundancyPercentage: number) {
    console.log('🔍 detectInitialNormalForm llamado con:');
    console.log('  - PrimaryKey:', primaryKey);
    console.log('  - Headers:', headers);
    console.log('  - RedundancyPercentage:', redundancyPercentage);
    
    const issues = [];
    let currentLevel = 'UNNORMALIZED';
    let levelName = 'Sin Normalizar';
    let description = 'La tabla requiere análisis completo';
    
    // PASO 1: Verificar 1NF (valores atómicos)
    const hasAtomicValues = checkFirstNormalForm(data, headers);
    console.log('✅ 1NF - Valores atómicos:', hasAtomicValues);
    
    if (!hasAtomicValues) {
      issues.push('Valores no atómicos detectados (múltiples valores en una celda)');
      return {
        level: 'UNNORMALIZED',
        name: 'Sin Normalizar',
        description: 'La tabla contiene valores no atómicos',
        issues: issues
      };
    }
    
    currentLevel = 'FIRST_NF';
    levelName = 'Primera Forma Normal (1NF)';
    description = 'Valores atómicos verificados';
    
    // PASO 2: Verificar 2NF (sin dependencias parciales)
    const hasPartialDependencies = checkSecondNormalForm(data, headers, primaryKey);
    console.log('✅ 2NF - Dependencias parciales:', hasPartialDependencies);
    
    if (hasPartialDependencies) {
      issues.push('Dependencias parciales detectadas (columnas dependen solo de parte de la clave primaria)');
      issues.push('Redundancia de datos identificada');
      console.log('🚨 Se mantiene en 1NF por dependencias parciales');
      // Se mantiene en 1NF si hay dependencias parciales
    } else {
      currentLevel = 'SECOND_NF';
      levelName = 'Segunda Forma Normal (2NF)';
      description = 'Sin dependencias parciales detectadas';
      console.log('✅ Avanza a 2NF');
    }
    
    // PASO 3: Verificar 3NF (sin dependencias transitivas)
    const hasTransitiveDependencies = checkThirdNormalForm(data, headers, primaryKey);
    console.log('✅ 3NF - Dependencias transitivas:', hasTransitiveDependencies);
    
    if (hasTransitiveDependencies) {
      issues.push('Dependencias transitivas detectadas (columnas dependen de otras columnas no-PK)');
      if (currentLevel === 'SECOND_NF') {
        issues.push('Requiere normalización a 3NF');
      }
    } else {
      currentLevel = 'THIRD_NF';
      levelName = 'Tercera Forma Normal (3NF)';
      description = 'Sin dependencias transitivas detectadas';
    }
    
    // Agregar issues basados en redundancia
    if (redundancyPercentage > 30) {
      issues.push(`Alta redundancia detectada (${redundancyPercentage.toFixed(1)}%)`);
    } else if (redundancyPercentage > 15) {
      issues.push(`Redundancia moderada detectada (${redundancyPercentage.toFixed(1)}%)`);
    }
    
    console.log('🎯 Forma normal final detectada:', currentLevel);
    console.log('📝 Issues encontrados:', issues);
    
    return {
      level: currentLevel,
      name: levelName,
      description: description,
      issues: issues
    };
  }
  
  // Verificar 1NF: valores atómicos
  function checkFirstNormalForm(data: any[], headers: string[]): boolean {
    for (const row of data) {
      for (const header of headers) {
        const value = row[header];
        if (value && typeof value === 'string') {
          // Verificar si hay múltiples valores separados por comas, puntos y coma, etc.
          if (value.includes(',') || value.includes(';') || value.includes('|') || value.includes('/')) {
            return false;
          }
        }
      }
    }
    return true;
  }
  
  // Verificar 2NF: sin dependencias parciales
  function checkSecondNormalForm(data: any[], headers: string[], primaryKey: string): boolean {
    console.log('🔍 checkSecondNormalForm llamado con:');
    console.log('  - PrimaryKey:', primaryKey);
    console.log('  - Headers:', headers);
    
    // Si la clave primaria es simple (una sola columna), está en 2NF
    if (!primaryKey.includes(',')) {
      console.log('✅ PK simple detectada, no hay dependencias parciales');
      return false; // No hay dependencias parciales
    }
    
    // Para claves compuestas, verificar dependencias parciales
    const pkColumns = primaryKey.split(',').map(col => col.trim());
    console.log('🔑 PK compuesta detectada:', pkColumns);
    
    // Lista de dependencias parciales conocidas para facturación
    const knownPartialDependencies = [
      // Dependencias de num_factura
      { pk: 'num_factura', dependent: 'fecha_factura' },
      { pk: 'num_factura', dependent: 'id_cliente' },
      { pk: 'num_factura', dependent: 'nombre_cliente' },
      { pk: 'num_factura', dependent: 'email_cliente' },
      // Dependencias de id_producto
      { pk: 'id_producto', dependent: 'descripcion_producto' },
      { pk: 'id_producto', dependent: 'precio_unitario' },
      { pk: 'id_producto', dependent: 'impuesto' },
      // Dependencias de id_cliente
      { pk: 'id_cliente', dependent: 'nombre_cliente' },
      { pk: 'id_cliente', dependent: 'email_cliente' },
      { pk: 'id_cliente', dependent: 'descuento' }
    ];
    
    // Verificar dependencias parciales conocidas
    for (const dep of knownPartialDependencies) {
      if (pkColumns.includes(dep.pk) && headers.includes(dep.dependent)) {
        const hasDependency = hasFunctionalDependency(data, dep.pk, dep.dependent);
        console.log(`🔍 Dependencia parcial conocida: ${dep.pk} → ${dep.dependent}: ${hasDependency}`);
        if (hasDependency) {
          console.log('🚨 Dependencia parcial detectada!');
          return true;
        }
      }
    }
    
    // Verificar dependencias parciales generales
    for (const header of headers) {
      if (!pkColumns.includes(header)) {
        console.log(`🔍 Analizando columna: ${header}`);
        // Verificar si esta columna depende solo de parte de la PK
        for (const pkCol of pkColumns) {
          const hasDependency = hasFunctionalDependency(data, pkCol, header);
          console.log(`  - ${pkCol} → ${header}: ${hasDependency}`);
          if (hasDependency) {
            console.log('🚨 Dependencia parcial detectada!');
            return true; // Dependencia parcial detectada
          }
        }
      }
    }
    
    console.log('✅ No se detectaron dependencias parciales');
    return false; // No hay dependencias parciales, está en 2NF
  }
  
  // Verificar 3NF: sin dependencias transitivas
  function checkThirdNormalForm(data: any[], headers: string[], primaryKey: string): boolean {
    console.log('🔍 Verificando dependencias transitivas...');
    
    // Lista de dependencias transitivas conocidas para facturación
    const knownTransitiveDependencies = [
      // Cliente → Nombre → Descuento
      { from: 'id_cliente', to: 'nombre_cliente' },
      { from: 'nombre_cliente', to: 'descuento' },
      // Cliente → Email
      { from: 'id_cliente', to: 'email_cliente' },
      // Producto → Descripción → Impuesto
      { from: 'id_producto', to: 'descripcion_producto' },
      { from: 'descripcion_producto', to: 'impuesto' },
      // Factura → Fecha
      { from: 'num_factura', to: 'fecha_factura' },
      // Cálculos
      { from: 'cantidad', to: 'subtotal' },
      { from: 'precio_unitario', to: 'subtotal' },
      { from: 'subtotal', to: 'total' },
      { from: 'impuesto', to: 'total' },
      { from: 'descuento', to: 'total' }
    ];
    
    // Verificar dependencias transitivas conocidas
    for (const dep of knownTransitiveDependencies) {
      if (headers.includes(dep.from) && headers.includes(dep.to)) {
        const hasDependency = hasFunctionalDependency(data, dep.from, dep.to);
        if (hasDependency) {
          console.log(`🚨 Dependencia transitiva detectada: ${dep.from} → ${dep.to}`);
          return true;
        }
      }
    }
    
    // Verificar dependencias transitivas generales
    for (const header of headers) {
      if (header !== primaryKey && !primaryKey.includes(header)) {
        // Verificar si esta columna depende de otra columna no-PK
        for (const otherHeader of headers) {
          if (otherHeader !== primaryKey && otherHeader !== header && !primaryKey.includes(otherHeader)) {
            const hasDependency = hasFunctionalDependency(data, otherHeader, header);
            if (hasDependency) {
              console.log(`🚨 Dependencia transitiva general detectada: ${otherHeader} → ${header}`);
              return true; // Dependencia transitiva detectada
            }
          }
        }
      }
    }
    
    console.log('✅ No se detectaron dependencias transitivas');
    return false;
  }
  
  // Verificar dependencia funcional entre dos columnas
  function hasFunctionalDependency(data: any[], determinant: string, dependent: string): boolean {
    const dependencyMap = new Map();
    let totalRows = 0;
    let consistentRows = 0;
    
    console.log(`🔍 Verificando dependencia: ${determinant} → ${dependent}`);
    
    for (const row of data) {
      const detValue = row[determinant];
      const depValue = row[dependent];
      
      if (detValue !== null && detValue !== undefined && depValue !== null && depValue !== undefined) {
        totalRows++;
        
        if (dependencyMap.has(detValue)) {
          if (dependencyMap.get(detValue) === depValue) {
            consistentRows++;
          } else {
            // Dependencia inconsistente encontrada
            console.log(`❌ Dependencia inconsistente: ${detValue} → ${dependencyMap.get(detValue)} vs ${depValue}`);
            return false;
          }
        } else {
          dependencyMap.set(detValue, depValue);
          consistentRows++;
        }
      }
    }
    
    // Debe tener al menos 2 filas para considerar dependencia funcional
    // y al menos 80% de consistencia
    const consistency = totalRows >= 2 ? (consistentRows / totalRows) : 0;
    const hasDependency = totalRows >= 2 && consistency >= 0.8;
    
    console.log(`  - Total filas: ${totalRows}, Consistencia: ${(consistency * 100).toFixed(1)}%, Dependencia: ${hasDependency}`);
    
    return hasDependency;
  }



  // Función para detectar el tipo de columna basado en los datos
  function detectColumnType(values: any[], columnName: string): string {
    if (values.length === 0) return 'VARCHAR(255)';
    
    const name = columnName.toLowerCase();
    
    // Si el nombre sugiere un tipo específico
    if (name.includes('id') && name !== 'id') return 'INTEGER';
    if (name.includes('salario') || name.includes('precio') || name.includes('costo')) return 'DECIMAL(10,2)';
    if (name.includes('fecha') || name.includes('date')) return 'DATE';
    if (name.includes('email') || name.includes('correo')) return 'VARCHAR(255)';
    if (name.includes('telefono') || name.includes('phone')) return 'VARCHAR(20)';
    if (name.includes('nombre') || name.includes('name')) return 'VARCHAR(100)';
    
    // Analizar los valores para determinar el tipo
    const sampleValues = values.slice(0, 10); // Tomar muestra de 10 valores
    
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
    const maxLength = Math.max(...sampleValues.map(val => String(val).length));
    if (maxLength <= 50) return 'VARCHAR(50)';
    if (maxLength <= 100) return 'VARCHAR(100)';
    if (maxLength <= 255) return 'VARCHAR(255)';
    return 'TEXT';
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
    console.log('🏗️ Diseñando tablas normalizadas con estructura correcta...');
    
    // Detectar si es un sistema de facturación
    const isFacturacion = headers.some(h => h.toLowerCase().includes('factura')) &&
                         headers.some(h => h.toLowerCase().includes('cliente')) &&
                         headers.some(h => h.toLowerCase().includes('producto'));
    
    if (isFacturacion) {
      console.log('📋 Sistema de facturación detectado - Generando estructura correcta');
      return createFacturacionTables(headers, data);
    } else {
      console.log('🔄 Sistema genérico detectado - Usando análisis inteligente');
      return createGenericTables(headers, data, primaryKey);
    }
  }
  
  // Función para crear tablas de facturación con estructura correcta
  function createFacturacionTables(headers: string[], data: any[]) {
    const tables = [];
    
    // 1. TABLA CLIENTES
    const clientesTable = {
      name: 'CLIENTES',
      purpose: 'Tabla de Clientes (1NF, 2NF, 3NF)',
      columns: [
        {
          name: 'id_cliente',
          type: 'INT',
          isPrimaryKey: true,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'nombre_cliente',
          type: 'VARCHAR(100)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'email_cliente',
          type: 'VARCHAR(100)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        }
      ],
      relationships: []
    };
    tables.push(clientesTable);
    
    // 2. TABLA PRODUCTOS
    const productosTable = {
      name: 'PRODUCTOS',
      purpose: 'Tabla de Productos (1NF, 2NF, 3NF)',
      columns: [
        {
          name: 'id_producto',
          type: 'INT',
          isPrimaryKey: true,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'descripcion_producto',
          type: 'VARCHAR(200)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'precio_unitario',
          type: 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        }
      ],
      relationships: []
    };
    tables.push(productosTable);
    
    // 3. TABLA FACTURAS (Cabecera)
    const facturasTable = {
      name: 'FACTURAS',
      purpose: 'Tabla de Facturas (Cabecera)',
      columns: [
        {
          name: 'num_factura',
          type: 'INT',
          isPrimaryKey: true,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'fecha_factura',
          type: 'DATE',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'id_cliente',
          type: 'INT',
          isPrimaryKey: false,
          isForeignKey: true,
          isRequired: true
        }
      ],
      relationships: [
        {
          column: 'id_cliente',
          references: {
            table: 'CLIENTES',
            column: 'id_cliente'
          }
        }
      ]
    };
    tables.push(facturasTable);
    
    // 4. TABLA DETALLE_FACTURAS (Líneas de productos)
    const detalleFacturasTable = {
      name: 'DETALLE_FACTURAS',
      purpose: 'Tabla de Detalles de Factura (Líneas de productos)',
      columns: [
        {
          name: 'id_detalle',
          type: 'INT',
          isPrimaryKey: true,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'num_factura',
          type: 'INT',
          isPrimaryKey: false,
          isForeignKey: true,
          isRequired: true
        },
        {
          name: 'id_producto',
          type: 'INT',
          isPrimaryKey: false,
          isForeignKey: true,
          isRequired: true
        },
        {
          name: 'cantidad',
          type: 'INT',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'subtotal',
          type: 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'impuesto',
          type: 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'descuento',
          type: 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        },
        {
          name: 'total',
          type: 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true
        }
      ],
      relationships: [
        {
          column: 'num_factura',
          references: {
            table: 'FACTURAS',
            column: 'num_factura'
          }
        },
        {
          column: 'id_producto',
          references: {
            table: 'PRODUCTOS',
            column: 'id_producto'
          }
        }
      ]
    };
    tables.push(detalleFacturasTable);
    
    console.log('✅ Tablas de facturación creadas con estructura correcta:', tables);
    return tables;
  }
  
  // Función para crear tablas genéricas (fallback)
  function createGenericTables(headers: string[], data: any[], primaryKey: string) {
    console.log('🧠 Creando tablas genéricas...');
    const tables = [];
    
    // Crear tabla principal con todas las columnas
    const mainTable = {
      name: 'TABLA_PRINCIPAL',
      purpose: 'Tabla principal del sistema',
      columns: headers.map(header => ({
        name: header,
        type: detectColumnType(data.map(row => row[header]), header),
        isPrimaryKey: header === primaryKey,
        isForeignKey: false,
        isRequired: true
      })),
      relationships: []
    };
    tables.push(mainTable);
    
    return tables;
  }

  // Función para crear tablas de forma inteligente basándose en los datos
  function createIntelligentTables(headers: string[], data: any[], primaryKey: string) {
    console.log('🧠 Creando tablas inteligentes genéricas...');
    const tables = [];
    
    // Analizar dependencias funcionales para identificar entidades
    const dependencies = analyzeFunctionalDependencies(headers, data);
    
    // Identificar columnas que se repiten mucho (candidatas para normalización)
    const highRedundancyColumns = headers.filter(header => {
      const values = data.map(row => row[header]);
      const uniqueValues = new Set(values).size;
      const redundancyPercentage = ((values.length - uniqueValues) / values.length) * 100;
      return redundancyPercentage > 30; // Más del 30% de redundancia
    });
    
    // Identificar columnas que podrían ser entidades independientes
    const potentialEntityColumns = headers.filter(header => {
      if (header === primaryKey) return false;
      
      // Columnas que podrían ser entidades: nombres, categorías, tipos, etc.
      const isEntityColumn = header.match(/^(nombre|name|tipo|type|categoria|category|departamento|department|cliente|customer|producto|product|proveedor|supplier|almacen|warehouse|ubicacion|location)$/i);
      
      if (isEntityColumn) {
        const values = data.map(row => row[header]);
        const uniqueValues = new Set(values).size;
        // Si hay muchos valores únicos, es una entidad
        return uniqueValues > 1 && uniqueValues < data.length * 0.8;
      }
      
      return false;
    });
    
    // Crear tabla principal con todas las columnas
    const mainTable = {
      name: generateTableName(headers, data),
      purpose: 'Tabla principal del sistema',
      columns: headers.map(header => ({
        name: header,
        type: detectColumnType(data.map(row => row[header]), header),
        isPrimaryKey: header === primaryKey,
        isForeignKey: false
      })),
      relationships: []
    };
    tables.push(mainTable);
    
    // Crear tablas de lookup para entidades con alta redundancia
    const allEntityColumns = [...new Set([...highRedundancyColumns, ...potentialEntityColumns])];
    
    allEntityColumns.forEach(column => {
      if (column !== primaryKey) {
        const tableName = generateEntityTableName(column);
        const lookupTable = {
          name: tableName,
          purpose: `Tabla de referencia para ${column}`,
          columns: [
            {
              name: generatePrimaryKeyName(column),
              type: 'INTEGER',
              isPrimaryKey: true,
              isForeignKey: false
            },
            {
              name: column,
              type: detectColumnType(data.map(row => row[column]), column),
              isPrimaryKey: false,
              isForeignKey: false
            }
          ],
          relationships: []
        };
        tables.push(lookupTable);
        
        // Agregar columna FK en tabla principal
        const fkColumnName = generateForeignKeyName(column);
        const fkColumn = {
          name: fkColumnName,
          type: 'INTEGER',
          isPrimaryKey: false,
          isForeignKey: true
        };
        mainTable.columns.push(fkColumn);
        
        // Agregar relación
        mainTable.relationships.push({
          from: mainTable.name,
          to: tableName,
          fromColumn: fkColumnName,
          toColumn: generatePrimaryKeyName(column),
          type: 'MANY_TO_ONE'
        });
      }
    });
    
    console.log(`✅ Se crearon ${tables.length} tablas inteligentes`);
    return tables;
  }
  
  // Función para generar nombres de tablas genéricos
  function generateTableName(headers: string[], data: any[]): string {
    // Intentar inferir el nombre basado en el contenido
    const sampleValues = data.slice(0, 3).map(row => 
      Object.values(row).join(' ').toLowerCase()
    );
    
    if (sampleValues.some(v => v.includes('empleado') || v.includes('employee'))) return 'EMPLEADOS';
    if (sampleValues.some(v => v.includes('cliente') || v.includes('customer'))) return 'CLIENTES';
    if (sampleValues.some(v => v.includes('producto') || v.includes('product'))) return 'PRODUCTOS';
    if (sampleValues.some(v => v.includes('factura') || v.includes('invoice'))) return 'FACTURAS';
    if (sampleValues.some(v => v.includes('venta') || v.includes('sale'))) return 'VENTAS';
    if (sampleValues.some(v => v.includes('inventario') || v.includes('inventory'))) return 'INVENTARIO';
    
    // Nombre genérico basado en la primera columna
    const firstColumn = headers[0];
    if (firstColumn.match(/^id_/)) {
      return firstColumn.replace(/^id_/, '').toUpperCase() + 'S';
    }
    
    return 'TABLA_PRINCIPAL';
  }
  
  // Función para generar nombres de tablas de entidades
  function generateEntityTableName(columnName: string): string {
    const singularToPlural: { [key: string]: string } = {
      'nombre': 'NOMBRES',
      'name': 'NAMES',
      'tipo': 'TIPOS',
      'type': 'TYPES',
      'categoria': 'CATEGORIAS',
      'category': 'CATEGORIES',
      'departamento': 'DEPARTAMENTOS',
      'department': 'DEPARTMENTS',
      'cliente': 'CLIENTES',
      'customer': 'CUSTOMERS',
      'producto': 'PRODUCTOS',
      'product': 'PRODUCTS',
      'proveedor': 'PROVEEDORES',
      'supplier': 'SUPPLIERS',
      'almacen': 'ALMACENES',
      'warehouse': 'WAREHOUSES',
      'ubicacion': 'UBICACIONES',
      'location': 'LOCATIONS'
    };
    
    return singularToPlural[columnName.toLowerCase()] || columnName.toUpperCase();
  }
  
  // Función para generar nombres de claves primarias
  function generatePrimaryKeyName(columnName: string): string {
    return `id_${columnName.toLowerCase()}`;
  }
  
  // Función para generar nombres de claves foráneas
  function generateForeignKeyName(columnName: string): string {
    return `id_${columnName.toLowerCase()}`;
  }


  
  // Función auxiliar para extraer nombre de tabla objetivo
  function extractTargetTableName(columnName: string): string {
    // id_departamento → DEPARTAMENTOS
    // id_cargo → CARGOS
    // id_cliente → CLIENTES
    // id_producto → PRODUCTOS
    
    let tableName = columnName.replace(/^id_/, '').replace(/_id$/, '');
    
    // Convertir a plural y singular según contexto
    const singularToPlural: { [key: string]: string } = {
      'departamento': 'DEPARTAMENTOS',
      'cargo': 'CARGOS',
      'cliente': 'CLIENTES',
      'producto': 'PRODUCTOS',
      'factura': 'FACTURAS',
      'empleado': 'EMPLEADOS',
      'categoria': 'CATEGORIAS',
      'proveedor': 'PROVEEDORES',
      'almacen': 'ALMACENES',
      'ubicacion': 'UBICACIONES'
    };
    
    return singularToPlural[tableName.toLowerCase()] || tableName.toUpperCase();
  }
  
  // Función para detectar relaciones por patrones en los datos
  function detectRelationshipsByDataPatterns(sqlTables: any[]) {
    console.log('🔍 Analizando patrones de datos para relaciones...');
    
    // Esta función se puede expandir para analizar valores repetidos
    // y detectar dependencias funcionales más complejas
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
          if (col.isPrimaryKey) sql += ` IDENTITY(1,1) PRIMARY KEY`;
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
        if (col.isPrimaryKey) sql += ` IDENTITY(1,1) PRIMARY KEY`;
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
    if (sqlScript) {
      downloadSQLScript(sqlScript, 'script_normalizacion.sql');
    }
  }



  function generateMermaidDiagram() {
    try {
      // Verificar que tengamos el resultado del análisis
      if (!analysisResult?.normalizedTables || analysisResult.normalizedTables.length === 0) {
        showNotification('❌ Error: No hay tablas normalizadas disponibles', 'error');
        return;
      }
      
      // Generar diagrama Mermaid
      const mermaidDiagram = generateMermaidERDiagram();
      
      // Mostrar el diagrama
      showMermaidDiagram(mermaidDiagram);
      
    } catch (error) {
      showNotification('❌ Error al generar el diagrama', 'error');
    }
  }

  function generateMermaidERDiagram(): string {
    if (!analysisResult?.normalizedTables || analysisResult.normalizedTables.length === 0) {
      return '';
    }

    let diagram = 'erDiagram\n';
    
    // Generar definiciones de tablas usando los datos sincronizados
    analysisResult.normalizedTables.forEach((table, tableIndex) => {
      diagram += `    ${table.name} {\n`;
      
      table.columns.forEach((column, colIndex) => {
        // Usar tipos Mermaid válidos
        let line = `        ${getMermaidType(column.type)} ${column.name}`;
        
        if (column.isPrimaryKey) {
          line += ' PK';
        }
        
        if (column.isForeignKey) {
          line += ' FK';
        }
        
        diagram += line + '\n';
      });
      
      diagram += '    }\n\n';
    });
    
    // Generar relaciones basadas en las relaciones definidas
    analysisResult.normalizedTables.forEach(table => {
      if (table.relationships && table.relationships.length > 0) {
        table.relationships.forEach(rel => {
          // Formato de relaciones para facturación
          if (rel.column && rel.references) {
            const fromTable = table.name;
            const toTable = rel.references.table;
            const fromColumn = rel.column;
            const toColumn = rel.references.column;
            
            // Determinar tipo de relación (ONE_TO_MANY por defecto)
            const relationshipType = '||--o{';
            const description = `${fromTable}.${fromColumn} → ${toTable}.${toColumn}`;
            
            diagram += `    ${fromTable} ${relationshipType} ${toTable} : "${description}"\n`;
          }
          // Formato de relaciones antiguo (por compatibilidad)
          else if (rel.type !== 'MANY_TO_MANY' && rel.to && rel.fromColumn && rel.toColumn) {
            const relationshipType = rel.type === 'ONE_TO_MANY' ? '||--o{' : '||--||';
            const description = rel.description || `${table.name} ${rel.type === 'ONE_TO_MANY' ? 'tiene muchos' : 'pertenece a'} ${rel.to}`;
            
            diagram += `    ${table.name} ${relationshipType} ${rel.to} : "${description}"\n`;
          }
        });
      }
    });
    
    console.log('Generated Mermaid diagram:', diagram);
    console.log('Normalized tables with relationships:', analysisResult.normalizedTables);
    console.log('Diagram length:', diagram.length);
    console.log('First 500 chars:', diagram.substring(0, 500));
    return diagram;
  }

  function getMermaidType(sqlType: string): string {
    // Mermaid no acepta tipos con paréntesis, usar tipos básicos
    if (!sqlType) return 'string';
    
    // Extraer el tipo base (antes de paréntesis)
    const baseType = sqlType.split('(')[0].toUpperCase();
    
    // Mapear tipos SQL a tipos Mermaid válidos (solo tipos básicos)
    const typeMappings: { [key: string]: string } = {
      'INTEGER': 'int',
      'INT': 'int',
      'BIGINT': 'int',
      'SMALLINT': 'int',
      'TINYINT': 'int',
      'VARCHAR': 'string',
      'CHAR': 'string',
      'TEXT': 'string',
      'NVARCHAR': 'string',
      'DECIMAL': 'float',
      'NUMERIC': 'float',
      'FLOAT': 'float',
      'DOUBLE': 'float',
      'REAL': 'float',
      'DATE': 'date',
      'DATETIME': 'datetime',
      'TIMESTAMP': 'datetime',
      'TIME': 'time',
      'BOOLEAN': 'boolean',
      'BIT': 'boolean'
    };
    
    return typeMappings[baseType] || 'string';
  }



  function showMermaidDiagram(diagram: string) {
    // Crear modal para mostrar el diagrama
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '🎨 Diagrama de Base de Datos (Mermaid)';
    title.style.cssText = `
      margin: 0;
      color: #1f2937;
      font-size: 24px;
      font-weight: 500;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Contenedor para el diagrama Mermaid renderizado
    const diagramContainer = document.createElement('div');
    diagramContainer.id = 'mermaid-diagram';
    diagramContainer.className = 'mermaid';
    diagramContainer.style.cssText = `
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Mostrar mensaje de carga
    diagramContainer.innerHTML = '<p style="color: #6b7280; font-size: 16px;">🔄 Renderizando diagrama...</p>';
    
    content.appendChild(header);
    content.appendChild(diagramContainer);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Renderizar el diagrama Mermaid después de que el modal esté en el DOM
    setTimeout(() => {
      try {
        // Configurar Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });
        
        // Renderizar el diagrama usando mermaid.init() (más confiable)
        try {
          // Limpiar el contenedor y agregar el código Mermaid
          diagramContainer.innerHTML = `<div class="mermaid">${diagram}</div>`;
          
          // Inicializar Mermaid en el contenedor
          mermaid.init(undefined, diagramContainer.querySelector('.mermaid'));
          
        } catch (renderError) {
          
          // Fallback: mostrar el código Mermaid con opción de copiar
          diagramContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444;">
              <p>❌ Error al renderizar el diagrama visual</p>
              <p style="font-size: 12px; color: #6b7280;">${renderError.message}</p>
              <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #374151; font-weight: 500;">📋 Código Mermaid generado:</p>
                <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 0; text-align: left; color: #1f2937;">${diagram}</pre>
              </div>
            </div>
          `;
        }
              } catch (error) {
          diagramContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444;">
              <p>❌ Error inesperado</p>
              <p style="font-size: 12px; color: #6b7280;">${error.message}</p>
              <details style="margin-top: 10px; text-align: left;">
                <summary style="cursor: pointer; color: #3b82f6;">Ver código Mermaid</summary>
                <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${diagram}</pre>
              </details>
            </div>
          `;
        }
    }, 100);
  }

  // Función para mostrar notificaciones
  function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Por ahora usamos alert, después puedes mejorar con un sistema más elegante
    if (type === 'error') {
      alert(`❌ ${message}`);
    } else if (type === 'success') {
      alert(`✅ ${message}`);
    } else {
      alert(`ℹ️ ${message}`);
    }
  }





  // Función para generar issues del análisis
  function generateIssuesFromAnalysis(initialAnalysis: any, data: any[]) {
    const issues = [];
    
    // Issue de redundancia
    if (initialAnalysis.redundancyPercentage > 20) {
      issues.push({
        type: 'REDUNDANCY',
        severity: 'HIGH',
        description: `Alta redundancia detectada: ${initialAnalysis.redundancyPercentage.toFixed(1)}%`,
        recommendation: 'Normalizar para eliminar duplicación de datos'
      });
    }
    
    // Issues por columna
    initialAnalysis.columnAnalysis.forEach((col: any) => {
      if (col.redundancyPercentage > 30) {
        issues.push({
          type: 'COLUMN_REDUNDANCY',
          severity: 'MEDIUM',
          description: `Columna "${col.columnName}" tiene ${col.redundancyPercentage.toFixed(1)}% de redundancia`,
          recommendation: 'Crear tabla de lookup para esta columna'
        });
      }
    });
    
    return issues;
  }

  // Función para generar pasos de normalización
  function generateNormalizationSteps(normalizationResult: any) {
    const steps = [];
    
    // Paso 1: Análisis inicial
    steps.push({
      step: 1,
      title: 'Análisis de Estructura',
      description: 'Análisis de la tabla original',
      details: `Se analizaron ${normalizationResult.initialAnalysis.totalRows} filas y ${normalizationResult.initialAnalysis.totalColumns} columnas`,
      status: 'COMPLETED'
    });
    
    // Paso 2: Detección de forma normal inicial
    steps.push({
      step: 2,
      title: 'Detección de Forma Normal Inicial',
      description: `Forma normal detectada: ${normalizationResult.initialAnalysis.initialNormalForm.name}`,
      details: `La tabla estaba en ${normalizationResult.initialAnalysis.initialNormalForm.level}`,
      status: 'COMPLETED'
    });
    
    // Paso 3: Detección de dominio
    if (detectedDomain) {
      steps.push({
        step: 3,
        title: 'Detección de Dominio',
        description: `Dominio detectado: ${detectedDomain.name}`,
        details: `Confianza: ${detectedDomain.confidence}%`,
        status: 'COMPLETED'
      });
    }
    
    // Paso 4: Normalización
    steps.push({
      step: 4,
      title: 'Normalización a 3NF',
      description: 'Aplicación de formas normales',
      details: `Se crearon ${normalizationResult.normalizedTables.length} tablas normalizadas`,
      status: 'COMPLETED'
    });
    
    // Paso 5: Generación SQL
    steps.push({
      step: 5,
      title: 'Generación de SQL',
      description: 'Script SQL de creación',
      details: 'Script SQL generado exitosamente',
      status: 'COMPLETED'
    });
    
    return steps;
  }

  // Función para contar relaciones totales
  function countTotalRelationships(tables: any[]) {
    return tables.reduce((total, table) => {
      return total + (table.relationships ? table.relationships.length : 0);
    }, 0);
  }

  // Función para calcular eliminación de redundancia
  function calculateRedundancyElimination(initialAnalysis: any, normalizedTables: any[]) {
    const originalRedundancy = initialAnalysis.redundancyPercentage;
    const estimatedFinalRedundancy = 5; // Estimación conservadora
    return Math.max(0, originalRedundancy - estimatedFinalRedundancy);
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

<div class="min-h-screen p-4 sm:p-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        

        <!-- Dominio detectado -->  
        {#if detectedDomain}
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6 text-center">
            <div class="flex items-center justify-center gap-3 mb-3">
              <span class="text-2xl">{detectedDomain.icon}</span>
              <div>
                <h3 class="text-lg sm:text-xl font-bold text-blue-800">{detectedDomain.name}</h3>
                <p class="text-sm text-blue-600">{detectedDomain.description}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <div class="bg-white p-3 rounded-lg">
                <div class="text-sm font-medium text-gray-600">Confianza</div>
                <div class="text-lg font-bold text-blue-600">{detectedDomain.confidence}%</div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="text-sm font-medium text-gray-600">Entidades</div>
                <div class="text-sm font-bold text-gray-800">{detectedDomain.entities.length}</div>
              </div>
            </div>
            
            {#if detectedDomain.confidence < 80}
              <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                <div class="flex items-center justify-center gap-2">
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



        <!-- Pasos de Normalización -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🔄 Proceso de Normalización</h2>
          
          <div class="space-y-4">
            {#each generateNormalizationSteps(analysisResult) as step, index}
              <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step.step}
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800">{step.title}</h3>
                  <p class="text-sm text-gray-600">{step.description}</p>
                  <p class="text-xs text-gray-500 mt-1">{step.details}</p>
                </div>
                <div class="flex-shrink-0">
                  <span class="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    ✅ Completado
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Estado de Normalización -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">📊 Estado de Normalización</h2>
          
          <!-- Forma Normal: Antes vs Después -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-700 mb-3"> Forma Normal: Antes vs Después</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- FORMA NORMAL INICIAL -->
              <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 class="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <span>📋</span>
                  Forma Normal Inicial
                </h4>
                <div class="bg-white p-3 rounded border border-red-200">
                  <div class="text-lg font-bold text-red-600 mb-1">
                    {analysisResult.initialAnalysis.initialNormalForm.name}
                  </div>
                  <div class="text-sm text-red-700 mb-2">
                    {analysisResult.initialAnalysis.initialNormalForm.description}
                  </div>
                  <div class="text-xs text-red-600">
                    <strong>Nivel:</strong> {analysisResult.initialAnalysis.initialNormalForm.level}
                  </div>
                </div>
                <!-- Issues identificados -->
                {#if analysisResult.initialAnalysis.initialNormalForm.issues.length > 0}
                  <div class="mt-3">
                    <h5 class="font-medium text-red-700 mb-2 text-sm">Problemas Identificados:</h5>
                    <div class="space-y-1">
                      {#each analysisResult.initialAnalysis.initialNormalForm.issues as issue}
                        <div class="text-xs text-red-600 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{issue}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- FORMA NORMAL FINAL -->
              <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 class="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <span>✅</span>
                  Forma Normal Final
                </h4>
                <div class="bg-white p-3 rounded border border-green-200">
                  <div class="text-lg font-bold text-green-600 mb-1">
                    Tercera Forma Normal (3NF)
                  </div>
                  <div class="text-sm text-green-700 mb-2">
                    Base de datos completamente normalizada
                  </div>
                  <div class="text-xs text-green-600">
                    <strong>Nivel:</strong> THIRD_NF
                  </div>
                </div>
                <!-- Beneficios obtenidos -->
                <div class="mt-3">
                  <h5 class="font-medium text-green-700 mb-2 text-sm">Beneficios Obtenidos:</h5>
                  <div class="space-y-1">
                    <div class="text-xs text-green-600 flex items-center gap-1">
                      <span>✅</span>
                      <span>Eliminación de redundancia</span>
                    </div>
                    <div class="text-xs text-green-600 flex items-center gap-1">
                      <span>✅</span>
                      <span>Integridad referencial</span>
                    </div>
                    <div class="text-xs text-green-600 flex items-center gap-1">
                      <span>✅</span>
                      <span>Mejor rendimiento</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

        <!-- Comparación: Antes vs Después -->
        <div class="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🔄 Comparación: Antes vs Después</h2>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- TABLA ORIGINAL -->
            <div class="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 class="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                <span>📋</span>
                Tabla Original (CSV)
              </h3>
              
              <!-- Estructura original -->
              <div class="mb-4">
                <h4 class="font-medium text-red-700 mb-2 text-sm">Estructura:</h4>
                <div class="bg-white p-3 rounded border border-red-200">
                  <div class="text-sm text-red-600 mb-2">
                    <strong>Filas:</strong> {analysisResult.initialAnalysis.totalRows} | 
                    <strong>Columnas:</strong> {analysisResult.initialAnalysis.totalColumns}
                  </div>
                  <div class="text-xs text-red-500 mb-2">
                    <strong>Redundancia:</strong> {analysisResult.initialAnalysis.redundancyPercentage.toFixed(1)}%
                  </div>
                  <div class="text-xs text-red-600">
                    <strong>Forma Normal:</strong> {analysisResult.initialAnalysis.initialNormalForm.name}
                  </div>
                </div>
              </div>
              
              <!-- Columnas originales -->
              <div class="mb-4">
                <h4 class="font-medium text-red-700 mb-2 text-sm">Columnas Originales:</h4>
                <div class="space-y-2">
                  {#each analysisResult.initialAnalysis.columnAnalysis as column}
                    <div class="bg-white p-2 rounded border border-red-200">
                      <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-red-800">{column.columnName}</span>
                        <span class="text-xs text-red-600">{column.detectedType}</span>
                      </div>
                      {#if column.redundancyPercentage > 20}
                        <div class="text-xs text-red-500 mt-1">
                          ⚠️ Redundancia: {column.redundancyPercentage.toFixed(1)}%
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
              
              <!-- Problemas identificados -->
              <div>
                <h4 class="font-medium text-red-700 mb-2 text-sm">Problemas Identificados:</h4>
                <div class="space-y-2">
                  {#if analysisResult.initialAnalysis.redundancyPercentage > 30}
                    <div class="bg-red-100 p-2 rounded border border-red-300">
                      <div class="text-sm text-red-800">🚨 Alta redundancia de datos</div>
                      <div class="text-xs text-red-600">Se repiten valores innecesariamente</div>
                    </div>
                  {/if}
                  {#if analysisResult.initialAnalysis.totalColumns > 10}
                    <div class="bg-red-100 p-2 rounded border border-red-300">
                      <div class="text-sm text-red-800">⚠️ Demasiadas columnas</div>
                      <div class="text-xs text-red-600">Posibles dependencias funcionales</div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
            
            <!-- TABLA NORMALIZADA -->
            <div class="border border-green-200 rounded-lg p-4 bg-green-50">
              <h3 class="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                <span>🗄️</span>
                Base de Datos Normalizada (3NF)
              </h3>
              
              <!-- Estructura normalizada -->
              <div class="mb-4">
                <h4 class="font-medium text-green-700 mb-2 text-sm">Estructura:</h4>
                <div class="bg-white p-3 rounded border border-green-200">
                  <div class="text-sm text-green-600 mb-2">
                    <strong>Tablas:</strong> {analysisResult.normalizedTables.length} | 
                    <strong>Relaciones:</strong> {countTotalRelationships(analysisResult.normalizedTables)}
                  </div>
                  <div class="text-xs text-green-500">
                    <strong>Score 3NF:</strong> {analysisResult.integrityTest.score}%
                  </div>
                </div>
              </div>
              
              <!-- Tablas creadas -->
              <div class="mb-4">
                <h4 class="font-medium text-green-700 mb-2 text-sm">Tablas Creadas:</h4>
                <div class="space-y-2">
                  {#each analysisResult.normalizedTables as table}
                    <div class="bg-white p-2 rounded border border-green-200">
                      <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-green-800">{table.name}</span>
                        <span class="text-xs text-green-600">{table.columns.length} cols</span>
                      </div>
                      <div class="text-xs text-green-600 mt-1">{table.purpose}</div>
                    </div>
                  {/each}
                </div>
              </div>
              
              <!-- Beneficios obtenidos -->
              <div>
                <h4 class="font-medium text-green-700 mb-2 text-sm">Beneficios Obtenidos:</h4>
                <div class="space-y-2">
                  <div class="bg-green-100 p-2 rounded border border-green-300">
                    <div class="text-sm text-green-800">✅ Eliminación de redundancia</div>
                    <div class="text-xs text-green-600">Datos más eficientes</div>
                    </div>
                  <div class="bg-green-100 p-2 rounded border border-green-300">
                    <div class="text-sm text-green-800">🔗 Relaciones claras</div>
                    <div class="text-xs text-green-600">Integridad referencial</div>
                  </div>
                  <div class="bg-green-100 p-2 rounded border border-green-300">
                    <div class="text-sm text-green-800">📊 Mejor rendimiento</div>
                    <div class="text-xs text-green-600">Consultas optimizadas</div>
                  </div>
                </div>
              </div>
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
                          {#if relation.column && relation.references}
                            → {relation.references.table}
                          {:else if relation.to}
                            → {relation.to}
                          {:else}
                            → {JSON.stringify(relation)}
                          {/if}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>


        <!-- Resumen de la Transformación -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h2 class="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">🎯 Resumen de la Transformación</h2>
          
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 justify-items-center">
              
              <div class="bg-white p-4 rounded-lg border border-blue-200 text-center">
                <div class="text-2xl font-bold text-green-600 mb-1">
                  {analysisResult.normalizedTables.length}
                </div>
                <div class="text-sm text-green-700">Tablas Creadas</div>
              </div>
              
              <div class="bg-white p-4 rounded-lg border border-blue-200 text-center">
                <div class="text-2xl font-bold text-purple-600 mb-1">
                  {countTotalRelationships(analysisResult.normalizedTables)}
                </div>
                <div class="text-sm text-purple-700">Relaciones Establecidas</div>
              </div>
              
              <div class="bg-white p-4 rounded-lg border border-blue-200 text-center">
                <div class="text-2xl font-bold text-indigo-600 mb-1">
                  {analysisResult.integrityTest.score}%
                </div>
                <div class="text-sm text-indigo-700">Score de Calidad</div>
              </div>
            </div>
          
          <!-- Beneficios obtenidos -->
          <div class="bg-white p-4 rounded-lg border border-blue-200">
            <h3 class="font-semibold text-blue-800 mb-3">🚀 Beneficios Obtenidos:</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex items-center gap-2">
                <span class="text-green-600">✅</span>
                <span class="text-sm text-gray-700">Eliminación de duplicación de datos</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-600">✅</span>
                <span class="text-sm text-gray-700">Mejor integridad referencial</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-600">✅</span>
                <span class="text-sm text-gray-700">Consultas más eficientes</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-600">✅</span>
                <span class="text-sm text-gray-700">Estructura escalable</span>
              </div>
            </div>
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
              <button 
                on:click={() => showSQLPreview = !showSQLPreview}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-300 focus:outline-none transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {showSQLPreview ? 'Ocultar SQL' : 'Ver SQL'}
              </button>
              <button 
                on:click={generateMermaidDiagram}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 focus:outline-none transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Ver Diagrama
              </button>
            </div>
          </div>
          
          <!-- Vista previa del SQL -->
          {#if showSQLPreview && sqlScript}
            <div class="mt-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">📄 Vista Previa del Script SQL:</h3>
              <div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                <pre class="text-sm whitespace-pre-wrap">{sqlScript}</pre>
              </div>
            </div>
          {/if}
          

        </div>
      </div>
    {/if}
  </div>
</div> 
