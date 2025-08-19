import mermaid from 'mermaid';

// Tipos para las tablas normalizadas
export interface NormalizedColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface NormalizedRelationship {
  column?: string;
  references?: {
    table: string;
    column: string;
  };
  type?: string;
  to?: string;
  fromColumn?: string;
  toColumn?: string;
  description?: string;
}

export interface NormalizedTable {
  name: string;
  columns: NormalizedColumn[];
  relationships?: NormalizedRelationship[];
}

/**
 * Genera un diagrama ER en formato Mermaid a partir de las tablas normalizadas
 */
export function generateMermaidERDiagram(normalizedTables: NormalizedTable[]): string {
  if (!normalizedTables || normalizedTables.length === 0) {
    return '';
  }

  let diagram = 'erDiagram\n';
  
  // Generar definiciones de tablas
  normalizedTables.forEach((table) => {
    diagram += `    ${table.name} {\n`;
    
    table.columns.forEach((column) => {
      // Usar tipos Mermaid válidos
      let line = `        ${getMermaidType(column.type)} ${column.name}`;
      
      if (column.isPrimaryKey) {
        line += ' PK';
      }
      
      if (column.isForeignKey) {
        line += ' FK';
      }
      
      diagram += line + '\n';
    });
    
    diagram += '    }\n\n';
  });
  
  // Generar relaciones basadas en las relaciones definidas
  normalizedTables.forEach(table => {
    if (table.relationships && table.relationships.length > 0) {
      table.relationships.forEach(rel => {
        // Formato de relaciones para facturación
        if (rel.column && rel.references) {
          const fromTable = table.name;
          const toTable = rel.references.table;
          const fromColumn = rel.column;
          const toColumn = rel.references.column;
          
          // Determinar tipo de relación (ONE_TO_MANY por defecto)
          const relationshipType = '||--o{';
          const description = `${fromTable}.${fromColumn} → ${toTable}.${toColumn}`;
          
          diagram += `    ${fromTable} ${relationshipType} ${toTable} : "${description}"\n`;
        }
        // Formato de relaciones antiguo (por compatibilidad)
        else if (rel.type !== 'MANY_TO_MANY' && rel.to && rel.fromColumn && rel.toColumn) {
          const relationshipType = rel.type === 'ONE_TO_MANY' ? '||--o{' : '||--||';
          const description = rel.description || `${table.name} ${rel.type === 'ONE_TO_MANY' ? 'tiene muchos' : 'pertenece a'} ${rel.to}`;
          
          diagram += `    ${table.name} ${relationshipType} ${rel.to} : "${description}"\n`;
        }
      });
    }
  });
  
  console.log('Generated Mermaid diagram:', diagram);
  console.log('Normalized tables with relationships:', normalizedTables);
  console.log('Diagram length:', diagram.length);
  console.log('First 500 chars:', diagram.substring(0, 500));
  return diagram;
}

/**
 * Mapea tipos SQL a tipos Mermaid válidos
 */
function getMermaidType(sqlType: string): string {
  // Mermaid no acepta tipos con paréntesis, usar tipos básicos
  if (!sqlType) return 'string';
  
  // Extraer el tipo base (antes de paréntesis)
  const baseType = sqlType.split('(')[0].toUpperCase();
  
  // Mapear tipos SQL a tipos Mermaid válidos (solo tipos básicos)
  const typeMappings: { [key: string]: string } = {
    'INTEGER': 'int',
    'INT': 'int',
    'BIGINT': 'int',
    'SMALLINT': 'int',
    'TINYINT': 'int',
    'VARCHAR': 'string',
    'CHAR': 'string',
    'TEXT': 'string',
    'NVARCHAR': 'string',
    'DECIMAL': 'float',
    'NUMERIC': 'float',
    'FLOAT': 'float',
    'DOUBLE': 'float',
    'REAL': 'float',
    'DATE': 'date',
    'DATETIME': 'datetime',
    'TIMESTAMP': 'datetime',
    'TIME': 'time',
    'BOOLEAN': 'boolean',
    'BIT': 'boolean'
  };
  
  return typeMappings[baseType] || 'string';
}

/**
 * Muestra el diagrama Mermaid en un modal
 */
export function showMermaidDiagram(diagram: string): void {
  // Crear modal para mostrar el diagrama
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
    position: relative;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
  `;
  
  const title = document.createElement('h2');
  title.textContent = '🎨 Diagrama de Base de Datos (Mermaid)';
  title.style.cssText = `
    margin: 0;
    color: #1f2937;
    font-size: 24px;
    font-weight: 500;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = () => document.body.removeChild(modal);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Contenedor para el diagrama Mermaid renderizado
  const diagramContainer = document.createElement('div');
  diagramContainer.id = 'mermaid-diagram';
  diagramContainer.className = 'mermaid';
  diagramContainer.style.cssText = `
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Mostrar mensaje de carga
  diagramContainer.innerHTML = '<p style="color: #6b7280; font-size: 16px;">🔄 Renderizando diagrama...</p>';
  
  content.appendChild(header);
  content.appendChild(diagramContainer);
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Renderizar el diagrama Mermaid después de que el modal esté en el DOM
  setTimeout(() => {
    try {
      // Configurar Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true
        }
      });
      
      // Renderizar el diagrama usando mermaid.init() (más confiable)
      try {
        // Limpiar el contenedor y agregar el código Mermaid
        diagramContainer.innerHTML = `<div class="mermaid">${diagram}</div>`;
        
        // Inicializar Mermaid en el contenedor
        const mermaidElement = diagramContainer.querySelector('.mermaid');
        if (mermaidElement) {
          mermaid.init(undefined, mermaidElement);
        }
        
      } catch (renderError: any) {
        // Fallback: mostrar el código Mermaid con opción de copiar
        diagramContainer.innerHTML = `
          <div style="text-align: center; color: #ef4444;">
            <p>❌ Error al renderizar el diagrama visual</p>
            <p style="font-size: 12px; color: #6b7280;">${renderError.message}</p>
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #374151; font-weight: 500;">📋 Código Mermaid generado:</p>
              <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 0; text-align: left; color: #1f2937;">${diagram}</pre>
            </div>
          </div>
        `;
      }
    } catch (error: any) {
      diagramContainer.innerHTML = `
        <div style="text-align: center; color: #ef4444;">
          <p>❌ Error inesperado</p>
          <p style="font-size: 12px; color: #6b7280;">${error.message}</p>
          <details style="margin-top: 10px; text-align: left;">
            <summary style="cursor: pointer; color: #3b82f6;">Ver código Mermaid</summary>
            <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${diagram}</pre>
          </details>
        </div>
      `;
    }
  }, 100);
}

