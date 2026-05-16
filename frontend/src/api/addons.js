import api from './axiosConfig'

export const getAddons = async () => {
  const response = await api.get('/addons')
  return response.data
}

export const createAddon = async (payload) => {
  const response = await api.post('/addons', payload)
  return response.data
}

export const updateAddon = async (id, payload) => {
  const response = await api.put(`/addons/${id}`, payload)
  return response.data
}

export const deleteAddon = async (id) => {
  const response = await api.delete(`/addons/${id}`)
  return response.data
}
