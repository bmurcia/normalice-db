<script>
    import { normalizedData } from '../store.ts';
    import { GradientButton } from "flowbite-svelte";
    
    // Función para descargar el script SQL
    function downloadSQL() {
        const sqlContent = $normalizedData.sqlScript;
        const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script_normalizado.sql';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Función para copiar al portapapeles
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText($normalizedData.sqlScript);
            alert('Script SQL copiado al portapapeles');
        } catch (err) {
            console.error('Error al copiar:', err);
            alert('Error al copiar al portapapeles');
        }
    }
</script>

<div class="w-full">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="text-center mb-8">
            {#if $normalizedData.isAlreadyNormalized}
                <h2 class="text-3xl font-bold mb-4 text-green-600">🎉 ¡Tabla Ya Normalizada!</h2>
                <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Tu tabla ya está bien estructurada y no requiere normalización adicional
                </p>
                
                <!-- Score de normalización -->
                <div class="inline-flex items-center gap-3 px-6 py-3 bg-green-50 text-green-700 rounded-lg border border-green-200 mb-6">
                    <span class="text-2xl font-bold">{$normalizedData.normalizationScore}/100</span>
                    <span class="text-sm">Puntuación de Normalización</span>
                </div>
                
                <!-- Razones de normalización -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                    <h4 class="font-semibold text-blue-800 mb-3">📊 Análisis de Normalización:</h4>
                    <ul class="text-sm text-blue-700 space-y-2 text-left">
                        {#each $normalizedData.normalizationReasons as reason}
                            <li class="flex items-start gap-2">
                                <span class="text-blue-600">•</span>
                                <span>{reason}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {:else}
                <h2 class="text-3xl font-bold mb-4 text-blue-600">✅ Base de Datos Normalizada</h2>
                <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Tu archivo CSV ha sido analizado y normalizado exitosamente
                </p>
                
                <!-- Score de normalización -->
                <div class="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 mb-6">
                    <span class="text-2xl font-bold">{$normalizedData.normalizationScore}/100</span>
                    <span class="text-sm">Puntuación de Normalización</span>
                </div>
            {/if}
        </div>

        <!-- Botón para cargar otro archivo -->
        <div class="text-center mb-8">
            <button 
                on:click={() => window.location.reload()}
                class="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🔄 Cargar Otro Archivo CSV
            </button>
            <p class="text-sm text-gray-500 mt-2">
                Analiza y normaliza otro archivo CSV
            </p>
        </div>

        <!-- Resumen de la normalización -->
        <div class="flex justify-center mb-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div class="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                    <div class="text-2xl font-bold text-blue-600">{$normalizedData.tables.length}</div>
                    <div class="text-blue-800 text-sm">Tablas Creadas</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                    <div class="text-2xl font-bold text-green-600">{$normalizedData.relationships.length}</div>
                    <div class="text-green-800 text-sm">Relaciones</div>
                </div>
            </div>
        </div>

        <!-- Estructura de tablas -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            <h3 class="text-xl font-semibold mb-6 text-gray-800">Estructura de Tablas</h3>
            <div class="space-y-6">
                {#each $normalizedData.tables as table}
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 class="font-semibold text-gray-800">Tabla: {table.name}</h4>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Columna</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Nullable</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Primary Key</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    {#each table.columns as column}
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-4 py-3 text-sm text-gray-900">{column.name}</td>
                                            <td class="px-4 py-3 text-sm font-mono text-gray-700">{column.type}</td>
                                            <td class="px-4 py-3 text-sm text-gray-700">{column.nullable ? 'Sí' : 'No'}</td>
                                            <td class="px-4 py-3 text-sm text-gray-700">{column.primaryKey ? 'Sí' : 'No'}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Script SQL -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 class="text-xl font-semibold text-gray-800">Script SQL Generado</h3>
                <div class="flex gap-2">
                    <GradientButton 
                         on:click={copyToClipboard}
                         outline 
                         color="pinkToOrange"
                         class="text-sm font-medium">
                         📋 Copiar
                     </GradientButton>
                     <GradientButton 
                         on:click={downloadSQL}
                         outline 
                         color="cyanToBlue"
                         class="text-sm font-medium">
                         💾 Descargar
                     </GradientButton>
                </div>
            </div>
            <div class="bg-gray-900 rounded-lg overflow-hidden">
                <pre class="text-green-400 p-4 overflow-x-auto text-sm leading-relaxed"><code>{$normalizedData.sqlScript}</code></pre>
            </div>
        </div>

        <!-- Botón para volver a empezar -->
        <div class="text-center pb-8">
            <div class="inline-block">
                <GradientButton 
                    on:click={() => window.location.reload()}
                    outline 
                    color="greenToBlue"
                    size="sm"
                    class="font-medium">
                    🔄 Normalizar Otro Archivo
                </GradientButton>
            </div>
        </div>
    </div>
</div>
