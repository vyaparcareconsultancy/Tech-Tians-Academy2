import { createTableCrud } from './helpers.js'

export const batchesApi = createTableCrud('batches')

export const batchStudentsApi = createTableCrud('batch_students')

export const list = batchesApi.list
export const get = batchesApi.get
export const insert = batchesApi.insert
export const update = batchesApi.update
export const remove = batchesApi.remove
