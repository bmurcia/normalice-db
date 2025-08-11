import { writable } from 'svelte/store'

export const APP_STATUS = {
  INIT: 0,
  LOADING: 1,
  ANALYZING: 2,
  NORMALIZED: 3,
  ERROR: -1
}

export const appStatus = writable(APP_STATUS.INIT)

export const fileData = writable({
  fileName: '',
  fileType: '',
  rawData: '',
  tables: [],
  columns: []
})

export const normalizedData = writable({
  tables: [],
  relationsships: [],
  sqlScript: ''
})

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