# 🗄️ Normalice DB

**Aplicación Web para normalizar bases de datos a partir de archivos CSV**

## 📋 Descripción

Normalice DB es una aplicación web moderna que permite a los usuarios subir archivos CSV con datos tabulares y generar automáticamente scripts SQL normalizados para crear bases de datos optimizadas. La aplicación aplica principios de normalización de bases de datos (formas normales) para eliminar redundancias y crear estructuras eficientes.

## ✨ Características Principales

- **📁 Subida de Archivos CSV**: Interfaz drag & drop intuitiva
- **📋 Plantilla CSV Descargable**: Plantilla predefinida para estructurar tu base de datos
- **🔍 Análisis Automático**: Identificación automática de estructura de datos
- **📊 Normalización Inteligente**: Aplicación de formas normales (1NF, 2NF, 3NF)
- **💾 Generación de SQL**: Scripts SQL Server optimizados y formateados
- **📥 Descarga de Resultados**: Scripts SQL listos para usar
- **🎨 Interfaz Moderna**: Diseño responsive con Tailwind CSS

## 🚀 Tecnologías Utilizadas

### **Frontend**
- **Astro** - Framework web moderno
- **Svelte** - Componentes reactivos
- **Tailwind CSS** - Framework de estilos
- **Flowbite** - Componentes UI predefinidos

### **Procesamiento de Datos**
- **Papaparse** - Parser de archivos CSV
- **SQL Formatter** - Formateo de código SQL

### **Herramientas de Desarrollo**
- **TypeScript** - Tipado estático
- **PNPM** - Gestor de paquetes
- **Vite** - Bundler y dev server

## 📁 Estructura del Proyecto

```
normalice-db/
├── src/
│   ├── components/          # Componentes Svelte
│   │   ├── App.svelte      # Componente principal
│   │   ├── StepUpload.svelte    # Subida de archivos
│   │   ├── StepLoading.svelte   # Estado de carga
│   │   ├── StepAnalyzing.svelte # Análisis y normalización
│   │   └── StepNormalized.svelte # Resultados
│   ├── store.ts            # Estado global de la aplicación
│   ├── pages/              # Páginas y API routes
│   └── utils/              # Utilidades
├── public/                 # Archivos estáticos
│   └── templates/          # Plantillas descargables
├── docs/                   # Documentación
│   └── PLANTILLA_CSV.md   # Guía de la plantilla CSV
├── package.json            # Dependencias del proyecto
└── README.md               # Este archivo
```

## 🔧 Instalación

### **Prerrequisitos**
- Node.js 18+ 
- PNPM (recomendado) o npm

### **Pasos de Instalación**

1. **Clonar el repositorio**
```bash
git clone https://github.com/bmurcia/normalice-db.git
cd normalice-db
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Ejecutar en modo desarrollo**
```bash
pnpm run dev
```

4. **Abrir en el navegador**
```
http://localhost:4321
```

## 📖 Cómo Usar

### **1. Descargar Plantilla CSV**
- Haz clic en **"Descargar Plantilla CSV"** para obtener la plantilla
- La plantilla incluye ejemplos de estructura de base de datos
- Consulta `docs/PLANTILLA_CSV.md` para instrucciones detalladas

### **2. Preparar tu Archivo CSV**
- Usa la plantilla como base
- Define tus tablas, columnas y relaciones
- Sigue las convenciones de nomenclatura

### **3. Subir Archivo CSV**
- Arrastra y suelta tu archivo CSV en el área designada
- O haz clic para seleccionar el archivo
- La aplicación acepta archivos `.csv`

### **4. Procesamiento Automático**
- El sistema analiza la estructura de tu CSV
- Identifica columnas y tipos de datos
- Aplica algoritmos de normalización

### **5. Resultados**
- Visualiza las tablas normalizadas
- Revisa las relaciones identificadas
- Descarga el script SQL generado

### **6. Implementación**
- Usa el script SQL en tu SQL Server
- Ejecuta los comandos CREATE TABLE
- Tu base de datos estará normalizada

## 📊 Formato del CSV

### **Estructura de la Plantilla**
```csv
tabla_nombre,columna_nombre,tipo_dato,es_obligatorio,es_clave_primaria,es_clave_foranea,tabla_referencia,columna_referencia
usuarios,id,INT,true,true,false,,,
usuarios,nombre,VARCHAR(100),true,false,false,,,
usuarios,email,VARCHAR(255),true,false,false,,,
usuarios,precio,"DECIMAL(10,2)",true,false,false,,,
```

### **⚠️ IMPORTANTE: Escape de Tipos de Datos**
**Los tipos de datos que contienen comas deben estar entre comillas dobles** para evitar conflictos con el separador CSV:

- ✅ **Correcto**: `"DECIMAL(10,2)"` - Entre comillas dobles
- ❌ **Incorrecto**: `DECIMAL(10,2)` - Sin comillas (causa error de parsing)

**Tipos que requieren escape:**
- `"DECIMAL(10,2)"` - Números decimales
- `"VARCHAR(100)"` - Cadenas de texto con longitud
- `"CHAR(50)"` - Caracteres de longitud fija
- `"TEXT"` - Texto largo

**Tipos que NO requieren escape:**
- `INT` - Números enteros
- `DATE` - Fechas
- `BOOLEAN` - Valores booleanos
- `FLOAT` - Números flotantes

### **Requisitos**
- **Primera fila**: Nombres de columnas (según la plantilla)
- **Separador**: Coma (`,`) - **Estándar CSV**
- **Escape**: Tipos de datos con comas entre comillas dobles
- **Encoding**: UTF-8
- **Formato**: Datos tabulares consistentes
- **Valores booleanos**: `true` o `false`

## 🔄 Flujo de Trabajo

```
Plantilla CSV → Preparar Datos → CSV Upload → Análisis → Normalización → Generación SQL → Descarga
      ↓              ↓              ↓           ↓           ↓            ↓           ↓
  Descargar    Estructurar    Subir      Estructura   Formas      Script      Implementación
  Plantilla    Base Datos    Archivo    Identificada  Normales    SQL        en SQL Server
```

## 🛠️ Scripts Disponibles

```bash
pnpm run dev      # Modo desarrollo
pnpm run build    # Construir para producción
pnpm run preview  # Vista previa de producción
pnpm run astro    # Comandos de Astro
```

## 🐛 Solución de Problemas

### **Error: "Cannot resolve module"**
```bash
pnpm install
```

### **Error: Puerto en uso**
```bash
# El servidor automáticamente busca puertos disponibles
# Verifica la consola para el puerto asignado
```

### **Error: Archivo no se procesa**
- Verifica que sea un archivo CSV válido
- Asegúrate de que siga la estructura de la plantilla
- Revisa la consola del navegador para errores

### **Error: Plantilla no se descarga**
- Verifica que JavaScript esté habilitado
- Intenta con un navegador diferente
- Revisa la consola para errores

## 📚 Documentación Adicional

- **[Plantilla CSV](docs/PLANTILLA_CSV.md)** - Guía completa de la plantilla
- **[Función handleFilesSelect](FUNCION_HANDLEFILESELECT.md)** - Análisis del código

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 👨‍💻 Autor

**Bryan Murcia**
- Desarrollador Full Stack
- Especialista en bases de datos y normalización

## 🙏 Agradecimientos

- **Astro** por el framework web
- **Svelte** por los componentes reactivos
- **Tailwind CSS** por el sistema de diseño
- **Papaparse** por el parsing de CSV

---

⭐ **Si este proyecto te ayuda, ¡dale una estrella en GitHub!**
