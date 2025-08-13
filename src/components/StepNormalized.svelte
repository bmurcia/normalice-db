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
        a.download = 'script_normalizacion.sql';
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
            <h2 class="text-3xl font-bold mb-4 text-green-600">✅ Base de Datos Normalizada</h2>
            <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
                Tu archivo CSV ha sido analizado y normalizado exitosamente
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
