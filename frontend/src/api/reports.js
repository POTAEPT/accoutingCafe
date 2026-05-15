import api from './axiosConfig'

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const getTransactions = async ({ date, startDate, endDate } = {}) => {
  const params = {}
  if (date) params.date = date
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  const response = await api.get('/transactions', {
    params: Object.keys(params).length ? params : undefined
  })
  return response.data
}

export const downloadReceipt = async (receiptNo) => {
  const response = await api.get(`/export/${receiptNo}`, {
    responseType: 'blob'
  })
  downloadBlob(response.data, `${receiptNo}.pdf`)
}

export const downloadDailySummary = async (date) => {
  const response = await api.get('/reports/daily-summary', {
    params: { date },
    responseType: 'blob'
  })
  downloadBlob(response.data, `Summary_${date}.pdf`)
}

export const downloadPeriodSummary = async (startDate, endDate) => {
  const response = await api.get('/reports/period-summary', {
    params: { startDate, endDate },
    responseType: 'blob'
  })
  downloadBlob(response.data, `Period_${startDate}_to_${endDate}.pdf`)
}

export const voidTransaction = async (id) => {
  const response = await api.patch(`/transactions/${id}/void`)
  return response.data
}

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}`)
  return response.data
}
