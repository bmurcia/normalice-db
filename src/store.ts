import { writable } from 'svelte/store'

export const APP_STATUS = {
  INIT: 0,
  LOADING: 1,
  ANALYZING: 2,
  NORMALIZED: 3,
  ERROR: -1
}

// Nuevo sistema de pasos
export const STEPS = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  NORMALIZED: 'normalized'
}

export const appStatus = writable(APP_STATUS.INIT)
export const currentStep = writable(STEPS.UPLOAD)

// Datos del CSV
export const csvData = writable<string | null>(null)

export const fileData = writable({
  fileName: '',
  fileType: '',
  rawData: '',
  tables: [],
  columns: [],
  columnTypes: {}
})

export const normalizedData = writable({
  tables: [],
  relationships: [],
  sqlScript: ''
})

// Funciones para el nuevo sistema
export const setCurrentStep = (step: string) => {
  currentStep.set(step)
}

export const setCSVData = (data: string) => {
  csvData.set(data)
}

export const setAppStatusLoading = () => {
  appStatus.set(APP_STATUS.LOADING)
}

export const setAppStatusAnalyzing = () => {
  appStatus.set(APP_STATUS.ANALYZING)
}

export const setAppStatusNormalized = () => {
  appStatus.set(APP_STATUS.NORMALIZED)
}

export const setAppStatusError = () => {
  appStatus.set(APP_STATUS.ERROR)
}

export const setFileData = (data: any) => {
  fileData.set(data)
}

export const setNormalizedData = (data: any) => {
  normalizedData.set(data)
}