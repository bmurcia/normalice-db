<script>
  import {
    setAppStatusLoading,
    setAppStatusError,
    setAppStatusAnalyzing,
    setFileData
  } from "../store.ts"

  import Dropzone from "svelte-file-dropzone";
  import Papa from "papaparse";

  let files = {
    accepted: [],
    rejected: []
  };

  // Función para descargar la plantilla CSV
  async function downloadTemplate() {
    try {
      // Leer la plantilla desde el archivo
      const response = await fetch('/templates/template_db.csv');
      const templateContent = await response.text();
      
      const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_db.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al cargar la plantilla:', error);
      // Fallback: mostrar mensaje de error al usuario
      alert('Error al cargar la plantilla. Inténtalo de nuevo.');
    }
  }

  async function handleFilesSelect(e) {
    const { acceptedFiles, fileRejections } = e.detail;
    files.accepted = [...files.accepted, ...acceptedFiles];
    files.rejected = [...files.rejected, ...fileRejections];

    if (acceptedFiles.length > 0) {
      setAppStatusLoading()

      try {
        const file = acceptedFiles[0]
        const text = await file.text()

        Papa.parse(text, {
          header: true,
          complete: function (results){
            if (results.errors.length > 0) {
              console.error('Error al parsear el CSV', results.errors);
              setAppStatusError()
              return
            }
            
            // Estructura: Línea 1 = Headers, Línea 2 = Tipos, Líneas 3+ = Datos
            const columns = results.meta.fields || [];  // Línea 1: nombres de columnas
            const allData = results.data;               // Líneas 2+ (tipos + datos)
            
            // La primera fila de datos (índice 0) contiene los tipos de datos
            const typesRow = allData[0];
            
            // Las filas restantes (índice 1+) contienen los datos reales
            const realData = allData.slice(1).filter(row => 
              Object.values(row).some(val => val && val.toString().trim() !== '')
            );
            
            // Mapear cada columna con su tipo de dato
            const columnTypes = {};
            columns.forEach(col => {
              columnTypes[col] = typesRow[col] || 'VARCHAR(255)';
            });
            
            console.log('Columnas detectadas:', columns);
            console.log('Tipos de datos:', columnTypes);
            console.log('Datos reales:', realData);
            
            // Identificar tablas únicas (por ahora asumimos una tabla)
            const tables = [{
              name: 'tabla_principal',
              columns: columns.map(col => ({
                name: col,
                type: columnTypes[col] || 'VARCHAR(255)',
                nullable: true,
                primaryKey: false,
              }))
            }]
            
            // Guardamos los datos en el store
            setFileData({
              fileName: file.name,
              fileType: file.type,
              rawData: realData,           // Solo los datos reales (sin tipos)
              tables: tables,
              columns: columns,
              columnTypes: columnTypes,    // Agregar tipos de datos
            });

            // Cambiamos al estado StepAnalyzing
            setAppStatusAnalyzing()
          },
          error: function (error){
            console.error('Error al parsear el CSV', error);
            setAppStatusError()
          }
        });

      } catch (error) {
        console.error('Error al procesar el archivo',error);
        setAppStatusError()
      }
    }
  }
</script>

<div class="max-w-2xl mx-auto p-6">
  <div class="text-center mb-8">
    <h2 class="text-2xl font-bold mb-4">Sube tu Archivo CSV</h2>
    
    <!-- Botón para descargar plantilla -->
    <div class="mb-6">
      <button 
        on:click={downloadTemplate}
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Descargar Plantilla CSV
      </button>
      <p class="text-sm text-gray-500 mt-2">
        Descarga la plantilla con datos de ejemplo para entender el formato
      </p>
    </div>
  </div>

  {#if files.accepted.length === 0}
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
      <Dropzone
        accept=".csv,text/csv"
        multiple={false}
        on:drop={handleFilesSelect}
        class="w-full h-32 flex items-center justify-center">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="text-lg font-medium text-gray-900 mb-2">
            Arrastra y suelta tu archivo CSV aquí
          </p>
          <p class="text-sm text-gray-500">
            o haz clic para seleccionar
          </p>
        </div>
      </Dropzone>
    </div>
  {/if}

  <!-- Archivos subidos -->
  {#if files.accepted.length > 0}
    <div class="mt-6">
      <h3 class="text-lg font-medium mb-3">Archivo subido:</h3>
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium text-green-800">{files.accepted[0].name}</span>
          <span class="text-sm text-green-600">({files.accepted[0].size} bytes)</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Archivos rechazados -->
  {#if files.rejected.length > 0}
    <div class="mt-4">
      <h3 class="text-lg font-medium text-red-600 mb-3">Archivos rechazados:</h3>
      <ul class="space-y-2">
        {#each files.rejected as item}
          <li class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-center gap-3">
              <svg class="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span class="text-red-800">{item.file.name}</span>
              <span class="text-sm text-red-600">({item.errors.join(', ')})</span>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>