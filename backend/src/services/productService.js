const productRepository = require('../repositories/productRepository');

const getActiveProducts = async () => {
  return productRepository.listActiveProducts();
};

const getAllProducts = async () => {
  return productRepository.listAllProducts();
};

const createProduct = async ({ name, category, prices, has_sweetness, is_active }) => {
  return productRepository.createProduct({ name, category, prices, has_sweetness, is_active });
};

const updateProduct = async (id, payload) => {
  return productRepository.updateProduct(id, payload);
};

module.exports = {
  getActiveProducts,
  getAllProducts,
  createProduct,
  updateProduct
};
