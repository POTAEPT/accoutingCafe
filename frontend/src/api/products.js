import api from './axiosConfig'

export const getProducts = async (includeInactive = false) => {
  const response = await api.get('/products', {
    params: includeInactive ? { includeInactive: 'true' } : undefined
  })
  return response.data
}

export const createProduct = async (payload) => {
  const response = await api.post('/products', payload)
  return response.data
}

export const updateProduct = async (id, payload) => {
  const response = await api.put(`/products/${id}`, payload)
  return response.data
}
