<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseCSVData, validateCSVStructure, getCSVStats } from '../../utils/data-processing';
  
  const dispatch = createEventDispatcher();
  
  export let csvData: string = '';
  export let fileName: string = '';
  
  let currentPage: number = 1;
  let rowsPerPage: number = 10;
  let parsedData: any = null;
  
  // Parsear CSV cuando cambie el csvData
  $: if (csvData && typeof csvData === 'string') {
    parsedData = parseCSVData(csvData);
  } else if (csvData) {
    console.warn('CSVData no es una cadena válida:', typeof csvData, csvData);
    parsedData = null;
  }
  

  
  function getCurrentPageData() {
    if (!parsedData) return [];
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return parsedData.data.slice(startIndex, endIndex);
  }
  
  function getTotalPages() {
    if (!parsedData) return 0;
    return Math.ceil(parsedData.totalRows / rowsPerPage);
  }
  
  function changePage(page: number) {
    if (page >= 1 && page <= getTotalPages()) {
      currentPage = page;
    }
  }
  
  function changeRowsPerPage(newRowsPerPage: number) {
    rowsPerPage = newRowsPerPage;
    currentPage = 1;
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function handleAnalyze() {
    if (!csvData || typeof csvData !== 'string') {
      alert('No hay datos CSV válidos para analizar');
      return;
    }
    
    if (!parsedData) {
      alert('Error al procesar el CSV. Verifica que el archivo sea válido.');
      return;
    }
    
    dispatch('analyzeRequested');
  }
  
  function handleDownload() {
    if (!csvData || typeof csvData !== 'string') {
      alert('No hay datos CSV válidos para descargar');
      return;
    }
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
  
  function handleCopy() {
    if (!csvData || typeof csvData !== 'string') {
      alert('No hay datos CSV válidos para copiar');
      return;
    }
    
    navigator.clipboard.writeText(csvData).then(() => {
      // Mostrar notificación de copiado
      alert('Datos copiados al portapapeles');
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('Error al copiar al portapapeles');
    });
  }
</script>

<div class="bg-white rounded-2xl shadow-xl p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-800">📄 Datos Originales del Archivo CSV</h2>
    <div class="flex gap-3">
      <button 
        on:click={handleDownload}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 focus:outline-none transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Descargar CSV
      </button>
      <button 
        on:click={handleCopy}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar Datos
      </button>
      <button 
        on:click={handleAnalyze}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 focus:outline-none transition-colors duration-200"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Analizar Datos
      </button>
    </div>
  </div>

  {#if parsedData}
    <!-- Información del archivo -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="text-sm font-medium text-gray-600">📁 Archivo</div>
        <div class="text-lg font-semibold text-gray-800">{fileName || 'data.csv'}</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="text-sm font-medium text-gray-600">📊 Tamaño</div>
        <div class="text-lg font-semibold text-gray-800">{formatFileSize(new Blob([csvData]).size)}</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="text-sm font-medium text-gray-600">📈 Filas</div>
        <div class="text-lg font-semibold text-gray-800">{parsedData.totalRows.toLocaleString()}</div>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="text-sm font-medium text-gray-600">📋 Columnas</div>
        <div class="text-lg font-semibold text-gray-800">{parsedData.totalColumns}</div>
      </div>
    </div>

    <!-- Información técnica -->
    <div class="bg-blue-50 p-4 rounded-lg mb-6">
      <h3 class="font-semibold text-blue-800 mb-2">🔧 Información Técnica del CSV:</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div><span class="font-medium">Separador:</span> Coma (,)</div>
        <div><span class="font-medium">Delimitador:</span> Comillas dobles (")</div>
        <div><span class="font-medium">Codificación:</span> UTF-8</div>
        <div><span class="font-medium">Encabezados:</span> Sí</div>
        <div><span class="font-medium">Fila de tipos:</span> No</div>
        <div><span class="font-medium">Formato:</span> Estándar CSV</div>
      </div>
    </div>

    <!-- Vista previa de datos -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">🔍 Vista Previa de Datos:</h3>
      
      <!-- Controles de paginación -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Mostrar:</span>
          <select 
            bind:value={rowsPerPage} 
            on:change={() => changeRowsPerPage(rowsPerPage)}
            class="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value={10}>10 filas</option>
            <option value={25}>25 filas</option>
            <option value={50}>50 filas</option>
            <option value={100}>100 filas</option>
          </select>
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            on:click={() => changePage(1)}
            disabled={currentPage === 1}
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Primera
          </button>
          <button 
            on:click={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span class="text-sm text-gray-600">
            {currentPage} de {getTotalPages()}
          </span>
          <button 
            on:click={() => changePage(currentPage + 1)}
            disabled={currentPage === getTotalPages()}
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
          <button 
            on:click={() => changePage(getTotalPages())}
            disabled={currentPage === getTotalPages()}
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Última
          </button>
        </div>
      </div>

      <!-- Tabla de datos -->
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              {#each parsedData.headers as header}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each getCurrentPageData() as row, rowIndex}
              <tr class="hover:bg-gray-50">
                {#each parsedData.headers as header}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row[header] || ''}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <div class="text-sm text-gray-500 mt-2 text-center">
        Mostrando filas {(currentPage - 1) * rowsPerPage + 1} a {Math.min(currentPage * rowsPerPage, parsedData.totalRows)} de {parsedData.totalRows} total
      </div>
    </div>
  {:else if csvData && typeof csvData !== 'string'}
    <div class="text-center py-8 text-red-500">
      <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p class="text-lg font-medium mb-2">Error en los datos CSV</p>
      <p class="text-sm">El archivo no contiene datos válidos para procesar</p>
    </div>
  {:else}
    <div class="text-center py-8 text-gray-500">
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>No hay datos CSV para mostrar</p>
    </div>
  {/if}
</div>
