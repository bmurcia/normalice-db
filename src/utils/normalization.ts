
//interfaces para el analisis de redundancia

export interface ColumnAnalysis {
    columnName: string;
    uniqueValues: number;
    totalRows: number;
    redundancyPercentage: number;
    shouldNormalize: boolean;
}

export interface RedundancyAnalysis {
    columnAnalysis: ColumnAnalysis[];
    recommendations: string[];
    summary: {
        totalColumns: number;
        columnsToNormalize: number;
    };
}

//funcion para el analisis de redundancia
export function analyzeRedundancy(
    csvData: any[],
    columns: string[],
    threshold: number = 70
): RedundancyAnalysis {
    const columnAnalysis: ColumnAnalysis[] = [];
    const recommendations: string[] = [];

    for (const columnName of columns){
        const values = csvData.map(row => row[columnName]); //extraer los valores de la columna
        const uniqueValues = [...new Set(values)].length; //extraer los valores unicos (sin los duplicados)
        const totalRows = csvData.length; //total de filas en el archivo csv
        const redundancyPercentage = ((totalRows - uniqueValues)/totalRows)*100; //calcular el porcentaje de redundancia
        // MEJORA: No normalizar columnas con valores únicos
        const shouldNormalize = redundancyPercentage >= threshold && uniqueValues < totalRows;
        
        columnAnalysis.push({
            columnName,
            uniqueValues,
            totalRows,
            redundancyPercentage: Math.round(redundancyPercentage),
            shouldNormalize
        });

        if (shouldNormalize){
            recommendations.push(`crear tabla separada para ${columnName}`);
        }
    }
    // MEJORA: Analizar combinaciones de columnas
    const combinationAnalysis = analyzeColumnCombinations(csvData, columns);
    
    return {
        columnAnalysis,
        recommendations: [...recommendations, ...combinationAnalysis.recommendations],
        summary: {
            totalColumns: columns.length,
            columnsToNormalize: columnAnalysis.filter(col => col.shouldNormalize).length + combinationAnalysis.combinationsToNormalize
        }
    }
}

// Nueva función para analizar combinaciones de columnas
function analyzeColumnCombinations(csvData: any[], columns: string[]) {
    const recommendations: string[] = [];
    let combinationsToNormalize = 0;
    const detectedEntities = [];



    // ALGORITMO GENÉRICO: Detectar patrones automáticamente
    
    // 1. Buscar columnas que parecen IDs (contienen 'id', 'ID', 'Id')
    const idColumns = columns.filter(col => 
        col.toLowerCase().includes('id') || 
        col.toLowerCase().includes('codigo') ||
        col.toLowerCase().includes('numero')
    );
    


    // 2. Para cada ID, buscar columnas relacionadas
    for (const idCol of idColumns) {
        const relatedColumns = [];
        
        // Buscar columnas que podrían estar relacionadas con este ID
        for (const col of columns) {
            if (col !== idCol) {
                // MEJORA: Solo considerar columnas que parecen estar relacionadas con el ID
                const isRelatedColumn = isColumnRelatedToId(col, idCol);
                
                if (isRelatedColumn) {
                    // Verificar si hay redundancia entre esta columna y el ID
                    const idValues = csvData.map(row => row[idCol]);
                    const uniqueIds = [...new Set(idValues)].length;
                    
                    if (uniqueIds < csvData.length) {
                        // CORRECCIÓN: Verificar si esta columna se repite cuando el ID se repite
                        const idValueToColumnValue = new Map();
                        let isConsistent = true;
                        
                        for (const row of csvData) {
                            const idValue = row[idCol];
                            const colValue = row[col];
                            
                            if (idValueToColumnValue.has(idValue)) {
                                // Si el ID se repite, verificar si la columna tiene el mismo valor
                                if (idValueToColumnValue.get(idValue) !== colValue) {
                                    isConsistent = false;
                                    break;
                                }
                            } else {
                                idValueToColumnValue.set(idValue, colValue);
                            }
                        }
                        
                        // Si todos los valores de la columna son consistentes para cada ID, es candidata
                        if (isConsistent) {
                            relatedColumns.push(col);
                        }
                    }
                }
            }
        }

        // 3. Si encontramos columnas relacionadas, crear entidad
        if (relatedColumns.length > 0) {
            const entityName = generateEntityName(idCol);
            const entityColumns = [idCol, ...relatedColumns];
            
            // Verificar redundancia en toda la combinación
            const fullCombinationValues = csvData.map(row => 
                entityColumns.map(col => row[col]).join('|')
            );
            const uniqueFullCombinations = [...new Set(fullCombinationValues)].length;
            
            if (uniqueFullCombinations < csvData.length) {
                recommendations.push(`crear tabla ${entityName} para ${entityColumns.join(', ')}`);
                detectedEntities.push({
                    name: entityName,
                    columns: entityColumns,
                    primaryKey: idCol
                });
                combinationsToNormalize++;
            }
        }
    }

    return { 
        recommendations, 
        combinationsToNormalize,
        detectedEntities 
    };
}

// Función para determinar si una columna está relacionada con un ID
function isColumnRelatedToId(columnName: string, idColumnName: string): boolean {
    // Extraer el nombre base del ID (sin prefijos)
    const idBase = idColumnName
        .replace(/^id/i, '')
        .replace(/^codigo/i, '')
        .replace(/^numero/i, '')
        .replace(/^key/i, '')
        .toLowerCase();
    
    // Verificar si la columna parece estar relacionada con este ID
    const columnLower = columnName.toLowerCase();
    
    // Patrones de relación
    const relationPatterns = [
        // Si el ID es "compania", buscar columnas como "nombre", "direccion", "telefono"
        { idPattern: 'compania', relatedPatterns: ['nombre', 'direccion', 'telefono', 'email', 'contacto'] },
        { idPattern: 'departamento', relatedPatterns: ['nombre', 'descripcion', 'jefe'] },
        { idPattern: 'categoria', relatedPatterns: ['nombre', 'descripcion', 'tipo'] },
        { idPattern: 'producto', relatedPatterns: ['nombre', 'descripcion', 'precio'] },
        { idPattern: 'empleado', relatedPatterns: ['nombre', 'apellido', 'email', 'telefono'] }
    ];
    
    // Buscar patrón que coincida
    for (const pattern of relationPatterns) {
        if (idBase.includes(pattern.idPattern) || pattern.idPattern.includes(idBase)) {
            for (const relatedPattern of pattern.relatedPatterns) {
                if (columnLower.includes(relatedPattern)) {
                    return true;
                }
            }
        }
    }
    
    // Si no encuentra patrón específico, usar lógica genérica
    // Evitar columnas que parecen ser de la entidad principal
    const mainEntityPatterns = ['titulo', 'genero', 'sinopsis', 'precio', 'cantidad', 'fecha'];
    for (const pattern of mainEntityPatterns) {
        if (columnLower.includes(pattern)) {
            return false; // No está relacionada con el ID
        }
    }
    
    // Si la columna no parece ser de la entidad principal, podría estar relacionada
    return true;
}

// Función para generar nombres de entidades automáticamente
function generateEntityName(idColumn: string): string {
    // Remover prefijos comunes
    let name = idColumn
        .replace(/^id/i, '')
        .replace(/^codigo/i, '')
        .replace(/^numero/i, '')
        .replace(/^key/i, '');
    
    // Capitalizar primera letra
    name = name.charAt(0).toUpperCase() + name.slice(1);
    
    // Si está vacío, usar un nombre genérico
    if (!name || name.length < 2) {
        name = 'Entidad';
    }
    
    return name;
}

//Funcion para la identificacion de entidades

export function identifyEntities(
    csvData: any[],
    columnAnalysis: ColumnAnalysis[],
    originalColumns: string[],
    columnTypes: any = {}
) {
    const tables = [];
    const relationships = [];

    // ALGORITMO GENÉRICO: Usar entidades detectadas automáticamente
    const combinationAnalysis = analyzeColumnCombinations(csvData, originalColumns);
    
    // Crear tablas para entidades detectadas
    for (const entity of combinationAnalysis.detectedEntities) {
        const entityTable = {
            name: entity.name,
            columns: entity.columns.map(col => ({
                name: col,
                type: columnTypes[col] || 'VARCHAR(255)',
                nullable: col !== entity.primaryKey,
                primaryKey: col === entity.primaryKey
            }))
        };
        tables.push(entityTable);

        // Crear relación con la tabla principal
        relationships.push({
            fromTable: 'TablaPrincipal', // Nombre genérico
            toTable: entity.name,
            fromColumn: entity.primaryKey,
            toColumn: entity.primaryKey,
            type: 'MANY_TO_ONE'
        });
    }

    // Crear tabla principal con columnas restantes
    const usedColumns = combinationAnalysis.detectedEntities.flatMap(entity => entity.columns);
    const mainTableColumns = originalColumns.filter(col => !usedColumns.includes(col));

    // Determinar nombre de la tabla principal
    const mainTableName = generateMainTableName(originalColumns);

    const mainTable = {
        name: mainTableName,
        columns: mainTableColumns.map(col => ({
            name: col,
            type: columnTypes[col] || 'VARCHAR(255)',
            nullable: col !== getPrimaryKeyColumn(mainTableColumns),
            primaryKey: col === getPrimaryKeyColumn(mainTableColumns)
        }))
    };

    tables.unshift(mainTable); // Agregar al inicio

    // Actualizar relaciones con el nombre correcto de la tabla principal
    relationships.forEach(rel => {
        rel.fromTable = mainTableName;
    });

    return {
        tables,
        relationships,
        summary: {
            totalTables: tables.length,
            mainTableColumns: mainTableColumns.length,
            secondaryTables: tables.length - 1
        }
    };
}

// Función para generar nombre de tabla principal
function generateMainTableName(columns: string[]): string {
    // MEJORA: Buscar patrones más específicos
    const entityPatterns = [
        { pattern: ['titulo', 'genero', 'sinopsis'], name: 'Pelicula' },
        { pattern: ['nombre', 'email', 'salario'], name: 'Empleado' },
        { pattern: ['nombre', 'precio', 'categoria'], name: 'Producto' },
        { pattern: ['nombre', 'direccion', 'telefono'], name: 'Cliente' }
    ];
    
    // Verificar patrones específicos
    for (const pattern of entityPatterns) {
        const hasPattern = pattern.pattern.every(hint => 
            columns.some(col => col.toLowerCase().includes(hint))
        );
        if (hasPattern) {
            return pattern.name;
        }
    }
    
    // Buscar columnas que sugieran el tipo de entidad
    const entityHints = ['nombre', 'titulo', 'descripcion', 'title', 'name', 'description'];
    
    for (const hint of entityHints) {
        const found = columns.find(col => col.toLowerCase().includes(hint));
        if (found) {
            // Extraer nombre de la entidad
            const words = found.split(/[_\s]/);
            const entityWord = words.find(word => 
                entityHints.some(hint => word.toLowerCase().includes(hint))
            );
            if (entityWord) {
                return entityWord.charAt(0).toUpperCase() + entityWord.slice(1);
            }
        }
    }
    
    // Si no encuentra pistas, usar nombre genérico
    return 'TablaPrincipal';
}

// Función para determinar la clave primaria
function getPrimaryKeyColumn(columns: string[]): string {
    // Buscar columnas que parezcan claves primarias
    const primaryKeyHints = ['id', 'codigo', 'numero', 'key'];
    
    for (const hint of primaryKeyHints) {
        const found = columns.find(col => 
            col.toLowerCase().includes(hint) && 
            (col.toLowerCase().startsWith(hint) || col.toLowerCase().includes('id'))
        );
        if (found) {
            return found;
        }
    }
    
    // Si no encuentra, usar la primera columna
    return columns[0];
}


//SEGMENTO QUE GENERARA EL SCRIPT SQL

// Interfaces para las tablas y relaciones
export interface Table {
    name: string;
    columns: Column[];
}

export interface Column {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    unique?: boolean;
}

export interface Relationship {
    fromTable: string;
    toTable: string;
    fromColumn: string;
    toColumn: string;
    type: string;
}

// Función para generar el script SQL
export function generateSQLScript(
    tables: Table[],
    relationships: Relationship[],
    csvData: any[] = []
): string {
    let sqlScript = '';
    
    // 1. Generar CREATE TABLE para cada tabla
    for (const table of tables) {
        sqlScript += `-- Crear tabla: ${table.name}\n`;
        sqlScript += `CREATE TABLE ${table.name} (\n`;
        
        // Agregar columnas
        const columnDefinitions = table.columns.map(col => {
            let definition = `    ${col.name} ${col.type}`;
            
            if (!col.nullable) {
                definition += ' NOT NULL';
            }
            
            if (col.unique) {
                definition += ' UNIQUE';
            }
            
            return definition;
        });
        
        sqlScript += columnDefinitions.join(',\n');
        
        // Agregar PRIMARY KEY si existe
        const primaryKeyColumns = table.columns.filter(col => col.primaryKey);
        if (primaryKeyColumns.length > 0) {
            sqlScript += ',\n    PRIMARY KEY (';
            sqlScript += primaryKeyColumns.map(col => col.name).join(', ');
            sqlScript += ')';
        }
        
        sqlScript += '\n);\n\n';
    }
    
    // 2. Generar FOREIGN KEY constraints
    if (relationships.length > 0) {
        sqlScript += '-- Agregar relaciones entre tablas\n';
        
        for (const rel of relationships) {
            sqlScript += `ALTER TABLE ${rel.fromTable}\n`;
            sqlScript += `ADD CONSTRAINT FK_${rel.fromTable}_${rel.toTable}\n`;
            sqlScript += `FOREIGN KEY (${rel.fromColumn})\n`;
            sqlScript += `REFERENCES ${rel.toTable}(${rel.toColumn});\n\n`;
        }
    }
    
    // 3. Generar INSERT statements si hay datos
    if (csvData.length > 0) {
        sqlScript += '-- Insertar datos en las tablas\n\n';
        
        for (const table of tables) {
            // Solo insertar en tablas que no sean la principal (para evitar duplicados)
            if (table.name !== 'TablaPrincipal' && table.name !== 'Pelicula') {
                const uniqueData = getUniqueDataForTable(csvData, table);
                if (uniqueData.length > 0) {
                    sqlScript += `-- Insertar datos en ${table.name}\n`;
                    sqlScript += `INSERT INTO ${table.name} (${table.columns.map(col => col.name).join(', ')}) VALUES\n`;
                    
                    const insertValues = uniqueData.map(row => {
                        const values = table.columns.map(col => {
                            const value = row[col.name];
                            return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
                        });
                        return `(${values.join(', ')})`;
                    });
                    
                    sqlScript += insertValues.join(',\n') + ';\n\n';
                }
            }
        }
        
        // Insertar datos en la tabla principal
        const mainTable = tables.find(t => t.name === 'Pelicula' || t.name === 'TablaPrincipal');
        if (mainTable) {
            sqlScript += `-- Insertar datos en ${mainTable.name}\n`;
            sqlScript += `INSERT INTO ${mainTable.name} (${mainTable.columns.map(col => col.name).join(', ')}) VALUES\n`;
            
            const insertValues = csvData.map(row => {
                const values = mainTable.columns.map(col => {
                    const value = row[col.name];
                    return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
                });
                return `(${values.join(', ')})`;
            });
            
            sqlScript += insertValues.join(',\n') + ';\n\n';
        }
    }
    return sqlScript;
}

// Función auxiliar para obtener datos únicos para una tabla
function getUniqueDataForTable(csvData: any[], table: Table): any[] {
    const uniqueData = new Map();
    
    for (const row of csvData) {
        const key = table.columns.map(col => row[col.name]).join('|');
        if (!uniqueData.has(key)) {
            const tableRow: any = {};
            table.columns.forEach(col => {
                tableRow[col.name] = row[col.name];
            });
            uniqueData.set(key, tableRow);
        }
    }
    
    return Array.from(uniqueData.values());
}