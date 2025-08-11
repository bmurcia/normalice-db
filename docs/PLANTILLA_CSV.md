# 📋 Plantilla CSV para Normalización de Bases de Datos

## **Descripción**

Esta plantilla CSV te permite definir la estructura de tu base de datos de manera organizada para que la aplicación pueda normalizarla automáticamente.

## **Estructura de la Plantilla**

### **Columnas de la Plantilla:**

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **tabla_nombre** | Nombre de la tabla | `usuarios`, `productos`, `categorias` |
| **columna_nombre** | Nombre de la columna | `id`, `nombre`, `email`, `precio` |
| **tipo_dato** | Tipo de dato SQL | `INT`, `VARCHAR(100)`, `DECIMAL(10,2)` |
| **es_obligatorio** | Si es NOT NULL | `true` o `false` |
| **es_clave_primaria** | Si es PRIMARY KEY | `true` o `false` |
| **es_clave_foranea** | Si es FOREIGN KEY | `true` o `false` |
| **tabla_referencia** | Tabla referenciada (si es FK) | `categorias` |
| **columna_referencia** | Columna referenciada (si es FK) | `id` |

## **Ejemplo de Uso**

### **1. Tabla de Usuarios:**
```csv
usuarios,id,INT,true,true,false,,,
usuarios,nombre,VARCHAR(100),true,false,false,,,
usuarios,email,VARCHAR(255),true,false,false,,,
usuarios,fecha_registro,DATE,false,false,false,,,
```

### **2. Tabla de Productos:**
```csv
productos,id,INT,true,true,false,,,
productos,nombre,VARCHAR(200),true,false,false,,,
productos,precio,DECIMAL(10,2),true,false,false,,,
productos,categoria_id,INT,false,false,true,categorias,id
productos,stock,INT,false,false,false,,,
```

### **3. Tabla de Categorías:**
```csv
categorias,id,INT,true,true,false,,,
categorias,nombre,VARCHAR(100),true,false,false,,,
categorias,descripcion,TEXT,false,false,false,,,
```

## **Tipos de Datos Soportados**

### **Números:**
- `INT` - Números enteros
- `BIGINT` - Números enteros grandes
- `DECIMAL(10,2)` - Números decimales con precisión
- `FLOAT` - Números de punto flotante

### **Texto:**
- `VARCHAR(100)` - Texto de longitud variable (máx 100)
- `CHAR(10)` - Texto de longitud fija (10 caracteres)
- `TEXT` - Texto largo sin límite específico

### **Fechas:**
- `DATE` - Solo fecha (YYYY-MM-DD)
- `DATETIME` - Fecha y hora
- `TIMESTAMP` - Marca de tiempo

### **Booleanos:**
- `BOOLEAN` - true/false
- `TINYINT(1)` - 0/1 (MySQL)

## **Reglas de Normalización**

### **1. Primera Forma Normal (1NF):**
- ✅ Cada columna debe contener valores atómicos
- ✅ No debe haber grupos repetitivos
- ✅ Cada fila debe ser única

### **2. Segunda Forma Normal (2NF):**
- ✅ Debe estar en 1NF
- ✅ Todos los atributos no clave deben depender completamente de la clave primaria

### **3. Tercera Forma Normal (3NF):**
- ✅ Debe estar en 2NF
- ✅ No debe haber dependencias transitivas

## **Ejemplos de Relaciones**

### **Relación Uno a Muchos:**
```csv
productos,categoria_id,INT,false,false,true,categorias,id
```
- **Explicación**: Un producto pertenece a una categoría, pero una categoría puede tener muchos productos

### **Relación Muchos a Muchos:**
```csv
pedidos_productos,pedido_id,INT,true,false,true,pedidos,id
pedidos_productos,producto_id,INT,true,false,true,productos,id
```
- **Explicación**: Tabla intermedia para relacionar pedidos con productos

## **Consejos de Uso**

### **1. Nombres de Tablas:**
- Usa nombres en plural: `usuarios`, `productos`
- Usa snake_case: `pedidos_productos`
- Sé descriptivo pero conciso

### **2. Nombres de Columnas:**
- Usa nombres descriptivos: `fecha_creacion`, `ultimo_acceso`
- Evita abreviaciones confusas
- Usa snake_case consistentemente

### **3. Tipos de Datos:**
- `VARCHAR` para texto de longitud variable
- `CHAR` para códigos de longitud fija
- `DECIMAL` para precios y cantidades monetarias
- `INT` para IDs y contadores

### **4. Claves Primarias:**
- Siempre incluye un campo `id` como clave primaria
- Usa `INT AUTO_INCREMENT` para IDs automáticos
- Evita usar datos de negocio como claves primarias

## **Validación de la Plantilla**

### **Antes de subir:**
1. ✅ Verifica que no haya filas vacías
2. ✅ Asegúrate de que los tipos de datos sean válidos
3. ✅ Confirma que las relaciones estén correctamente definidas
4. ✅ Revisa que los nombres de tablas y columnas sean únicos

### **Errores comunes:**
- ❌ Tipos de datos incorrectos
- ❌ Relaciones mal definidas
- ❌ Nombres duplicados
- ❌ Valores booleanos incorrectos (debe ser `true` o `false`)

## **Descargar la Plantilla**

Haz clic en el botón **"Descargar Plantilla CSV"** en la aplicación para obtener la plantilla completa con ejemplos.

## **Soporte**

Si tienes dudas sobre cómo usar la plantilla o cómo estructurar tu base de datos, consulta la documentación principal o abre un issue en el repositorio.
