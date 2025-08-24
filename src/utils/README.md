# 🏗️ Estructura de Utilidades

Este directorio contiene las utilidades organizadas por funcionalidad para mantener el código modular y reutilizable.

## 📁 Estructura de Carpetas

```
src/utils/
├── analysis/           # Análisis de datos CSV y normalización
├── data-processing/    # Procesamiento y validación de datos CSV
├── diagram/           # Generación de diagramas ERD
├── domain-detector/   # Detección de dominios de negocio
├── normalization/     # Normalización de bases de datos
└── types/            # Tipos TypeScript compartidos
```

## 🔍 Análisis (`analysis/`)

### `csvAnalyzer.ts`
- **`analyzeCSVStructure(csvText)`**: Analiza la estructura de un CSV para detectar filas de tipos, headers y datos
- **`parseCSVWithStructure(csvText, structure)`**: Parsea un CSV con la estructura detectada
- **`performInitialAnalysis(data, headers)`**: Realiza el análisis inicial de los datos CSV

### `typeDetector.ts`
- **`detectColumnTypeIntelligently(analysisData, header)`**: Detecta el tipo de dato de una columna de forma inteligente
- **`analyzeAllColumns(analysisData)`**: Analiza todas las columnas de un dataset
- **`calculateAverageRedundancy(columnAnalysis)`**: Calcula la redundancia promedio

### `issueAnalyzer.ts`
- **`analyzeDataIssues(analysisData, columnAnalysis)`**: Analiza los datos para detectar problemas potenciales
- **`generateRecommendations(analysisData, detectedDomain, columnAnalysis)`**: Genera recomendaciones basadas en el análisis
- **`calculateDataQualityMetrics(analysisData, columnAnalysis)`**: Calcula métricas de calidad de los datos

## 📊 Procesamiento de Datos (`data-processing/`)

### `csvParser.ts`
- **`parseCSVData(csvText, options)`**: Parsea un archivo CSV y retorna los datos estructurados
- **`validateCSVStructure(csvText)`**: Valida que el CSV tenga una estructura válida
- **`cleanCSVData(csvText)`**: Limpia y normaliza los datos CSV
- **`csvToJSON(csvText)`**: Convierte los datos CSV a formato JSON
- **`csvToHTMLTable(csvText)`**: Convierte los datos CSV a formato de tabla HTML

### `dataValidator.ts`
- **`validateCSVData(csvText)`**: Valida la estructura y calidad de los datos CSV
- **`calculateDataQuality(csvText)`**: Calcula métricas de calidad de los datos
- **`isDataSuitableForNormalization(csvText)`**: Verifica si los datos son adecuados para normalización

## 🎯 Componentes de Visualización (`data-display/`)

### `CSVDataViewer.svelte`
- Componente para mostrar y navegar por datos CSV
- Incluye paginación y funcionalidades de exportación
- Utiliza las utilidades de `data-processing` para parseo y validación

## 🔗 Uso en Componentes

### Importar funciones de análisis:
```typescript
import { analyzeCSVStructure, parseCSVWithStructure, performInitialAnalysis } from '../utils/analysis';
```

### Importar funciones de procesamiento:
```typescript
import { parseCSVData, validateCSVStructure, getCSVStats } from '../utils/data-processing';
```

### Importar componentes de visualización:
```typescript
import { CSVDataViewer } from '../components/data-display/CSVDataViewer.svelte';
```

## 🚀 Beneficios de la Refactorización

1. **Modularidad**: Cada utilidad tiene una responsabilidad específica
2. **Reutilización**: Las funciones se pueden usar en múltiples componentes
3. **Mantenibilidad**: Código más fácil de mantener y debuggear
4. **Testing**: Funciones individuales más fáciles de probar
5. **Escalabilidad**: Fácil agregar nuevas funcionalidades

## 📝 Convenciones

- **Nombres de archivos**: camelCase para archivos TypeScript
- **Nombres de funciones**: camelCase descriptivo
- **Interfaces**: PascalCase con prefijo descriptivo
- **Exportaciones**: Usar `export` nombrado para funciones, `export type` para tipos
- **Documentación**: JSDoc para todas las funciones públicas

