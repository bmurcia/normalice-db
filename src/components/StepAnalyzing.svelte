<script>
    import { onMount } from 'svelte';
    import { fileData, setNormalizedData, setAppStatusNormalized, setAppStatusError } from '../store.ts'
    import { analyzeRedundancy, identifyEntities, generateSQLScript } from '../utils/normalization.ts'

    let currentStep = 'Iniciando análisis de datos...';
    let progress = 0;
    let analysisResult = null;
    let error = null;

    //Funcion para cuando montamos el componente

    onMount(async () => {
        try {

            //Paso 1. Analizar redundancia
            currentStep = 'Analizando redundancia en los datos...';
            progress = 25;

            const redundancyAnalysis = analyzeRedundancy(
                $fileData.rawData,
                $fileData.columns
            );

            //Paso 2. Identificar entidades
            currentStep = 'Identificando entidades y relaciones...';
            progress = 50;

            const entities = identifyEntities(
                $fileData.rawData,
                redundancyAnalysis.columnAnalysis,
                $fileData.columns,
                $fileData.columnTypes
            );

            //Paso 3. Generar script SQL
            currentStep = 'Generando script SQL...';
            progress = 75;
            const sqlScript = generateSQLScript(
                entities.tables,
                entities.relationships,
                $fileData.rawData
            );

            //Paso 4. Guardar resultados
            const normalizedData = {
                tables: entities.tables,
                relationships: entities.relationships,
                sqlScript: sqlScript,
                redundancyAnalysis: redundancyAnalysis,
            };

            //Actualizar el estado de la aplicación
            setNormalizedData(normalizedData);
            setAppStatusNormalized();


        } catch (err) {
            error = `Error durante la normalizacion: ${err.message}`;
            console.error(error);
            setAppStatusError();
        }
    })

</script>

<div class="max-w-2xl mx-auto p-6">
    <div class="text-center mb-8">
        <h2 class="text-2xl font-bold mb-4">Normalizando Base de Datos</h2>
        <p class="text-gray-600 mb-6">
            Analizando tu archivo CSV y generando la estructura normalizada
        </p>
    </div>

    <!-- Barra de progreso -->
    <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso</span>
            <span>{progress}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
            <div 
                class="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style="width: {progress}%">
            </div>
        </div>
    </div>

    <!-- Paso actual -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="font-medium">{currentStep}</span>
        </div>
    </div>

    <!-- Manejo de errores -->
    {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div class="flex items-center gap-3 justify-center">
                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span class="text-red-800 font-medium">{error}</span>
            </div>
        </div>
    {/if}
</div>

