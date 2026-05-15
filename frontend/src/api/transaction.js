import api from './axiosConfig';

export const createTransaction = async (payload) => {
  try {
    const response = await api.post('/transactions', payload);
    return response.data;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};