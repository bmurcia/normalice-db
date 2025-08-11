# 🗄️ Normalice DB

**Aplicación Web para normalizar bases de datos a partir de archivos CSV**

## 📋 Descripción

Normalice DB es una aplicación web moderna que permite a los usuarios subir archivos CSV con datos tabulares y generar automáticamente scripts SQL normalizados para crear bases de datos optimizadas. La aplicación aplica principios de normalización de bases de datos (formas normales) para eliminar redundancias y crear estructuras eficientes.

## ✨ Características Principales

- **📁 Subida de Archivos CSV**: Interfaz drag & drop intuitiva
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
git clone <https://github.com/bmurcia/normalice-db.git>
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

### **1. Subir Archivo CSV**
- Arrastra y suelta tu archivo CSV en el área designada
- O haz clic para seleccionar el archivo
- La aplicación acepta archivos `.csv`

### **2. Procesamiento Automático**
- El sistema analiza la estructura de tu CSV
- Identifica columnas y tipos de datos
- Aplica algoritmos de normalización

### **3. Resultados**
- Visualiza las tablas normalizadas
- Revisa las relaciones identificadas
- Descarga el script SQL generado

### **4. Implementación**
- Usa el script SQL en tu SQL Server
- Ejecuta los comandos CREATE TABLE
- Tu base de datos estará normalizada

## 📊 Formato del CSV

### **Estructura Recomendada**
```csv
id,nombre,email,edad,ciudad,profesion
1,Juan Pérez,juan@email.com,28,Madrid,Desarrollador
2,María García,maria@email.com,32,Barcelona,Diseñadora
```

### **Requisitos**
- **Primera fila**: Nombres de columnas
- **Separador**: Coma (,)
- **Encoding**: UTF-8
- **Formato**: Datos tabulares consistentes

## 🔄 Flujo de Trabajo

```
CSV Upload → Análisis → Normalización → Generación SQL → Descarga
     ↓           ↓           ↓            ↓           ↓
  Archivo    Estructura   Formas      Script      Implementación
  CSV       Identificada  Normales    SQL        en SQL Server
```



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
