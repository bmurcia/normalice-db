<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { detectColumnTypeIntelligently, analyzeAllColumns, calculateAverageRedundancy } from '../utils/analysis';
  import { analyzeDataIssues, generateRecommendations } from '../utils/analysis';
  
  const dispatch = createEventDispatcher();
  
  export let analysisData: any = null;
  export let detectedDomain: any = null;
  
  // Función para calcular redundancia promedio
  function getAverageRedundancy() {
    const columnAnalysis = getColumnAnalysis();
    return calculateAverageRedundancy(columnAnalysis);
  }
  
  function getColumnAnalysis() {
    if (!analysisData || !analysisData.headers || !Array.isArray(analysisData.headers)) {
      return [];
    }
    
    try {
      return analyzeAllColumns(analysisData);
    } catch (error) {
      console.error('Error en getColumnAnalysis:', error);
      return [];
    }
  }
  
  function getIssuesFromAnalysis() {
    if (!analysisData || !analysisData.headers || !Array.isArray(analysisData.headers)) {
      return [];
    }
    
    try {
      const columnAnalysis = getColumnAnalysis();
      return analyzeDataIssues(analysisData, columnAnalysis);
    } catch (error) {
      console.error('Error en getIssuesFromAnalysis:', error);
      return [];
    }
  }
  
  function getRecommendations() {
    if (!analysisData || !detectedDomain) {
      return [];
    }
    
    try {
      const columnAnalysis = getColumnAnalysis();
      return generateRecommendations(analysisData, detectedDomain, columnAnalysis);
    } catch (error) {
      console.error('Error en getRecommendations:', error);
      return [];
    }
  }
  
  function handleContinueNormalization() {
    dispatch('continueNormalization');
  }

  // Variable para controlar la vista de datos
  let showAllData: boolean = false;

</script>

<div class="bg-white rounded-2xl shadow-xl p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-800">📋 Información de la Tabla a Normalizar</h2>
    <div class="flex gap-3">

      <button 
        on:click={handleContinueNormalization}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 focus:outline-none transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        Continuar con Normalización
      </button>
    </div>
  </div>

  {#if detectedDomain && analysisData && analysisData.data && analysisData.data.length > 0}

    <!-- Dominio detectado -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-center gap-3 mb-4">
        <span class="text-3xl">{detectedDomain.icon}</span>
        <div>
          <h3 class="text-xl font-bold text-blue-800">{detectedDomain.name}</h3>
          <p class="text-blue-600">{detectedDomain.description}</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
        <div class="bg-white p-4 rounded-lg text-center">
          <div class="text-sm font-medium text-gray-600">Confianza</div>
          <div class="text-2xl font-bold text-blue-600">{detectedDomain.confidence}%</div>
        </div>
        <div class="bg-white p-4 rounded-lg text-center">
          <div class="text-sm font-medium text-gray-600">Entidades</div>
          <div class="text-2xl font-bold text-gray-800">{detectedDomain.entities && detectedDomain.entities.length ? detectedDomain.entities.length : 0}</div>
        </div>
        <div class="bg-white p-4 rounded-lg text-center">
          <div class="text-sm font-medium text-gray-600">Forma Normal</div>
          <div class="text-lg font-bold text-gray-800">1NF</div>
        </div>
      </div>
      
      {#if detectedDomain.confidence < 80}
        <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-yellow-800">
              Baja confianza en la detección. Revisa el resultado generado.
            </span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Estadísticas generales -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-gray-800 mb-1">{analysisData.totalRows.toLocaleString()}</div>
        <div class="text-sm text-gray-600">Total de Filas</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-gray-800 mb-1">{analysisData.totalColumns}</div>
        <div class="text-sm text-gray-600">Total de Columnas</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-red-600 mb-1">
          {getAverageRedundancy()}%
        </div>
        <div class="text-sm text-gray-600">Redundancia Promedio</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-blue-600 mb-1">1NF</div>
        <div class="text-sm text-gray-600">Forma Normal Actual</div>
      </div>
    </div>



    <!-- Análisis de columnas -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 Estructura de Columnas:</h3>
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Columna</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valores Únicos</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Redundancia</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each (() => {
              const columns = getColumnAnalysis();
              console.log('🔍 getColumnAnalysis retornó:', columns, 'tipo:', typeof columns, 'esArray:', Array.isArray(columns));
              return Array.isArray(columns) ? columns : [];
            })() as column}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {column.columnName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {column.detectedType}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {column.uniqueValues.toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                    column.redundancyPercentage > 70 ? 'bg-red-100 text-red-800' :
                    column.redundancyPercentage > 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }">
                    {column.redundancyPercentage}%
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {#if column.redundancyPercentage > 70}
                    <span class="text-red-600">🔴 Crítico</span>
                  {:else if column.redundancyPercentage > 40}
                    <span class="text-yellow-600">🟡 Moderado</span>
                  {:else}
                    <span class="text-green-600">🟢 Bajo</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Vista previa de datos -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">
          📋 Vista Previa de Datos 
          {#if showAllData}
            (Todas las {analysisData.data.length} filas)
          {:else}
            (Primeras 10 filas)
          {/if}
        </h3>
        <div class="flex gap-2">
          {#if analysisData.data.length > 10}
            <button 
              on:click={() => showAllData = !showAllData}
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-300 focus:outline-none transition-colors duration-200"
            >
              {#if showAllData}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                Mostrar Menos
              {:else}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                Ver Todas
              {/if}
            </button>
          {/if}
        </div>
      </div>
      
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {#each (() => {
                  const headers = analysisData?.headers;
                  console.log('🔍 analysisData.headers:', headers, 'tipo:', typeof headers, 'esArray:', Array.isArray(headers));
                  return Array.isArray(headers) ? headers : [];
                })() as header}
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-white">
                    {header}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#if analysisData.data && analysisData.data.length > 0}
                {#each (() => {
                  if (!Array.isArray(analysisData.data)) {
                    console.log('❌ analysisData.data no es un array:', analysisData.data);
                    return [];
                  }
                  const dataToShow = showAllData ? analysisData.data : analysisData.data.slice(0, 10);
                  console.log('🔍 Datos a mostrar en tabla:', dataToShow.length);
                  return dataToShow;
                })() as row, rowIndex}
                  <tr class="hover:bg-gray-50">
                    {#each (() => {
                      if (!row || typeof row !== 'object') {
                        console.log('❌ row no es un objeto válido:', row);
                        return [];
                      }
                      const cells = Object.values(row);
                      console.log('🔍 Celdas en fila:', cells.length);
                      return cells;
                    })() as cell, cellIndex}
                      <td class="px-3 py-2 text-xs text-gray-900 whitespace-nowrap max-w-32 truncate" title={cell}>
                        {cell}
                      </td>
                    {/each}
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan={analysisData.headers.length} class="px-3 py-2 text-center text-gray-500">
                    {#if !analysisData.data}
                      Error: No hay datos disponibles
                    {:else if analysisData.data.length === 0}
                      No hay datos para mostrar
                    {:else}
                      Cargando datos...
                    {/if}
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
        {#if !showAllData && analysisData.data.length > 10}
          <div class="mt-3 text-center text-sm text-gray-500">
            Mostrando 10 de {analysisData.data.length} filas
          </div>
        {/if}
      </div>
    </div>

    <!-- Problemas detectados -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">🚨 Problemas Detectados:</h3>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        {#each (() => {
          const issues = getIssuesFromAnalysis();
          console.log('🔍 getIssuesFromAnalysis retornó:', issues, 'tipo:', typeof issues, 'esArray:', Array.isArray(issues));
          return Array.isArray(issues) ? issues : [];
        })() as issue}
          <div class="flex items-center gap-2 mb-2 last:mb-0">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span class="text-red-800">{issue.message || 'Problema detectado'}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recomendaciones -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">💡 Recomendaciones:</h3>
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        {#each (() => {
          const recommendations = getRecommendations();
          console.log('🔍 getRecommendations retornó:', recommendations, 'tipo:', typeof recommendations, 'esArray:', Array.isArray(recommendations));
          return Array.isArray(recommendations) ? recommendations : [];
        })() as recommendation}
          <div class="flex items-center gap-2 mb-2 last:mb-0">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span class="text-green-800">{recommendation.message || 'Recomendación disponible'}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Beneficios esperados -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="font-semibold text-blue-800 mb-3">🚀 Beneficios Esperados:</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex items-center gap-2">
          <span class="text-blue-600">✅</span>
          <span class="text-sm text-blue-700">Eliminación significativa de datos duplicados</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-blue-600">✅</span>
          <span class="text-sm text-blue-700">Mejor integridad referencial</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-blue-600">✅</span>
          <span class="text-sm text-blue-700">Consultas más eficientes</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-blue-600">✅</span>
          <span class="text-sm text-blue-700">Estructura escalable y mantenible</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="text-center py-8 text-gray-500">
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>No hay datos de análisis disponibles</p>
      <div class="mt-4 text-sm">
        <div>detectedDomain: {detectedDomain ? 'Sí' : 'No'}</div>
        <div>analysisData: {analysisData ? 'Sí' : 'No'}</div>
        {#if analysisData}
          <div>Headers: {analysisData.headers ? analysisData.headers.length : 'undefined'}</div>
          <div>Data: {analysisData.data ? analysisData.data.length : 'undefined'}</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
