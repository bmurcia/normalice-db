# 📚 Normalización de Bases de Datos - Guía Completa

## **🎯 ¿Qué es la Normalización?**

La normalización es un proceso sistemático para **organizar datos** en una base de datos de manera que se **eliminen redundancias** y se **mejore la integridad** de los datos.

### **📋 Objetivos de la Normalización:**
- ✅ **Eliminar redundancias** (datos duplicados)
- ✅ **Prevenir inconsistencias** en los datos
- ✅ **Facilitar mantenimiento** de la base de datos
- ✅ **Mejorar rendimiento** de consultas
- ✅ **Reducir espacio** de almacenamiento

---

## **🔍 Conceptos Fundamentales**

### **1. Redundancia**
**¿Qué es?**
- Datos que se **repiten** en múltiples filas
- Información **duplicada** que puede causar problemas
- Valores que **deberían estar** en una tabla separada

**Ejemplo concreto:**
```
Tabla Original:
EmpleadoID | NombreEmpleado | Departamento | JefeDepartamento | Salario
1          | Ana            | Ventas       | Carlos           | 1200
2          | Luis           | Ventas       | Carlos           | 1500
3          | María          | Marketing    | Lucía            | 1300
4          | Pedro          | Marketing    | Lucía            | 1400
5          | Sofía          | Ventas       | Carlos           | 1600

REDUNDANCIAS IDENTIFICADAS:
- "Ventas" aparece 3 veces
- "Marketing" aparece 2 veces  
- "Carlos" aparece 3 veces
- "Lucía" aparece 2 veces
```

**¿Por qué es un problema?**
- ❌ **Desperdicio de espacio** en la base de datos
- ❌ **Dificulta actualizaciones** (cambiar "Ventas" por "Ventas y Marketing")
- ❌ **Puede causar inconsistencias** (un departamento con dos nombres diferentes)
- ❌ **Complicado de mantener** (¿qué pasa si Carlos cambia de nombre?)

### **2. Entidad**
**¿Qué es?**
- **Objeto o concepto** del mundo real
- **Puede ser una tabla** en la base de datos
- **Tiene atributos** (columnas) que lo describen

**En tu caso de empleados:**
1. **empleados** - Personas que trabajan en la empresa
   - Atributos: ID, nombre, salario
2. **departamentos** - Áreas de la empresa
   - Atributos: ID, nombre, descripción
3. **jefes** - Empleados que dirigen departamentos
   - Atributos: ID, nombre, experiencia

### **3. Relación**
**¿Qué es?**
- **Conexión** entre dos entidades
- **Se establece** mediante claves foráneas
- **Define cómo** se relacionan los datos

**Tipos de relaciones:**
- **Uno a Muchos**: Un departamento tiene muchos empleados
- **Muchos a Muchos**: Un empleado puede trabajar en varios proyectos
- **Uno a Uno**: Un empleado tiene un solo contrato

---

## **🔄 Proceso de Normalización**

### **¿Qué significa "normalizar"?**
- **Reorganizar datos** para eliminar redundancias
- **Crear tablas separadas** para cada entidad
- **Establecer relaciones** entre las tablas

### **Reglas básicas:**
1. **Cada tabla** debe tener un propósito único
2. **No debe haber** datos duplicados
3. **Las relaciones** se establecen con claves foráneas
4. **Cada entidad** debe ser independiente

---

## **📊 Formas Normales (NF - Normal Forms)**

### **Primera Forma Normal (1NF)**
**¿Qué es?**
- Cada columna debe contener **valores atómicos** (indivisibles)
- No debe haber **grupos repetitivos**
- Cada fila debe ser **única**

**Ejemplo de 1NF:**
```
✅ CORRECTO (1NF):
EmpleadoID | NombreEmpleado | Departamento
1          | Ana            | Ventas
2          | Luis           | Ventas

❌ INCORRECTO (no 1NF):
EmpleadoID | NombreEmpleado | Departamentos
1          | Ana            | Ventas, Marketing
2          | Luis           | Ventas
```

### **Segunda Forma Normal (2NF)**
**¿Qué es?**
- Debe estar en **1NF**
- Todos los atributos no clave deben **depender completamente** de la clave primaria

**Ejemplo de 2NF:**
```
✅ CORRECTO (2NF):
Tabla empleados:
EmpleadoID | NombreEmpleado | Salario
1          | Ana            | 1200
2          | Luis           | 1500

Tabla departamentos:
DepartamentoID | NombreDepartamento
1              | Ventas
2              | Marketing

❌ INCORRECTO (no 2NF):
EmpleadoID | NombreEmpleado | Departamento | NombreDepartamento
1          | Ana            | 1            | Ventas
2          | Luis           | 1            | Ventas
```

### **Tercera Forma Normal (3NF)**
**¿Qué es?**
- Debe estar en **2NF**
- No debe haber **dependencias transitivas**

**Ejemplo de 3NF:**
```
✅ CORRECTO (3NF):
Tabla empleados:
EmpleadoID | NombreEmpleado | DepartamentoID
1          | Ana            | 1
2          | Luis           | 1

Tabla departamentos:
DepartamentoID | NombreDepartamento | JefeID
1              | Ventas            | 1
2              | Marketing         | 2

Tabla jefes:
JefeID | NombreJefe
1      | Carlos
2      | Lucía

❌ INCORRECTO (no 3NF):
EmpleadoID | NombreEmpleado | DepartamentoID | NombreDepartamento | JefeDepartamento
1          | Ana            | 1              | Ventas            | Carlos
2          | Luis           | 1              | Ventas            | Carlos
```

---

## **🎯 Aplicación a tu Caso de Empleados**

### **Análisis de tu Tabla Original:**
```
EmpleadoID | NombreEmpleado | Departamento | JefeDepartamento | Salario
1          | Ana            | Ventas       | Carlos           | 1200
2          | Luis           | Ventas       | Carlos           | 1500
3          | María          | Marketing    | Lucía            | 1300
4          | Pedro          | Marketing    | Lucía            | 1400
5          | Sofía          | Ventas       | Carlos           | 1600
```

### **Problemas Identificados:**
1. **Departamento se repite**: "Ventas" (3 veces), "Marketing" (2 veces)
2. **JefeDepartamento se repite**: "Carlos" (3 veces), "Lucía" (2 veces)
3. **Información del departamento** está mezclada con empleados
4. **Información del jefe** está mezclada con empleados

### **Solución: Normalización a 3NF**

#### **Tabla 1: empleados**
```sql
CREATE TABLE empleados (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  departamento_id INT NOT NULL,
  salario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);
```

#### **Tabla 2: departamentos**
```sql
CREATE TABLE departamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  jefe_id INT,
  FOREIGN KEY (jefe_id) REFERENCES empleados(id)
);
```

### **Datos Normalizados:**

#### **Tabla empleados:**
```
id | nombre | departamento_id | salario
1  | Ana    | 1               | 1200
2  | Luis   | 1               | 1500
3  | María  | 2               | 1300
4  | Pedro  | 2               | 1400
5  | Sofía  | 1               | 1600
```

#### **Tabla departamentos:**
```
id | nombre     | jefe_id
1  | Ventas     | 1
2  | Marketing  | 2
```

---

## **🔄 Algoritmo de Normalización Automática**

### **Paso 1: Análisis de Redundancias**
1. **Contar valores únicos** en cada columna
2. **Identificar columnas** con valores repetidos
3. **Calcular porcentaje** de repetición

### **Paso 2: Identificación de Entidades**
1. **Analizar dependencias** entre columnas
2. **Identificar grupos** de columnas relacionadas
3. **Determinar** qué puede ser una tabla separada

### **Paso 3: Creación de Estructura**
1. **Definir tablas** para cada entidad
2. **Establecer claves primarias**
3. **Crear claves foráneas** para relaciones

### **Paso 4: Generación de SQL**
1. **Crear comandos** CREATE TABLE
2. **Definir restricciones** (NOT NULL, UNIQUE, etc.)
3. **Establecer relaciones** con FOREIGN KEY

---

## **💡 Beneficios de la Normalización**

### **Antes de Normalizar:**
- ❌ Datos duplicados
- ❌ Dificultad para actualizaciones
- ❌ Posibles inconsistencias
- ❌ Mayor uso de espacio

### **Después de Normalizar:**
- ✅ **Sin redundancias**
- ✅ **Fácil mantenimiento**
- ✅ **Datos consistentes**
- ✅ **Mejor rendimiento**
- ✅ **Estructura clara**

---

## **📚 Recursos Adicionales**

- **Base de datos relacional**: Sistema que organiza datos en tablas
- **Clave primaria**: Identificador único de cada fila
- **Clave foránea**: Referencia a otra tabla
- **Integridad referencial**: Garantía de que las relaciones son válidas

---

## **🎯 Resumen**

La normalización es un proceso que:
1. **Identifica redundancias** en los datos
2. **Separa entidades** en tablas diferentes
3. **Establece relaciones** entre las tablas
4. **Mejora la calidad** de la base de datos

---

