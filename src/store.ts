import { writable } from 'svelte/store'

// Sistema de pasos
export const STEPS = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  NORMALIZED: 'normalized'
}

export const currentStep = writable(STEPS.UPLOAD)

// Datos del CSV
export const csvData = writable<string | null>(null)

// Datos normalizados
export const normalizedData = writable({
  tables: [],
  relationships: [],
  sqlScript: '',
  // Datos del análisis original
  originalAnalysis: {
    headers: [],
    totalRows: 0,
    totalColumns: 0,
    redundancyScore: 0,
    normalizationLevel: 'NONE',
    initialNormalForm: {
      level: 'UNNORMALIZED',
      name: 'Sin Normalizar',
      description: 'No se ha analizado aún',
      issues: []
    },
    columnAnalysis: [],
    functionalDependencies: [],
    issues: []
  },
  // Proceso de normalización
  normalizationSteps: [],
  // Resultado final
  finalAnalysis: {
    normalizationScore: 0,
    tablesCreated: 0,
    relationshipsCreated: 0,
    redundancyEliminated: 0,
    integrityTests: []
  }
})

// Funciones del sistema
export const setCurrentStep = (step: string) => {
  currentStep.set(step)
}

export const setCSVData = (data: string) => {
  csvData.set(data)
}

export const setOriginalAnalysis = (analysis: any) => {
  normalizedData.update(current => ({
    ...current,
    originalAnalysis: analysis
  }))
}

export const setNormalizationSteps = (steps: any[]) => {
  normalizedData.update((current: any) => ({
    ...current,
    normalizationSteps: steps
  }))
}

export const setFinalAnalysis = (analysis: any) => {
  normalizedData.update(current => ({
    ...current,
    finalAnalysis: analysis
  }))
}