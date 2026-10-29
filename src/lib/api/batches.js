import { createTableCrud } from './helpers.js'

export const batchesApi = createTableCrud('batches', {
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.capacity !== undefined) out.capacity = Number(out.capacity) || 0
    if (out.fee !== undefined) out.fee = Number(out.fee) || 0
    delete out.enrolledCount
    delete out.course
    delete out.teacher
    return out
  },
})

export const batchStudentsApi = createTableCrud('batch_students')

export const list = batchesApi.list
export const get = batchesApi.get
export const insert = batchesApi.insert
export const update = batchesApi.update
export const remove = batchesApi.remove
