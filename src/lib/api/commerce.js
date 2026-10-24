import { createTableCrud } from './helpers.js'

export const ordersApi = createTableCrud('orders')

export const paymentsApi = createTableCrud('payments')

export const couponsApi = createTableCrud('coupons')

export const enrollmentsApi = createTableCrud('enrollments')

export const lessonProgressApi = createTableCrud('lesson_progress')

export const list = ordersApi.list
export const get = ordersApi.get
export const insert = ordersApi.insert
export const update = ordersApi.update
export const remove = ordersApi.remove
