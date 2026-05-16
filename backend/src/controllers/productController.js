const productService = require('../services/productService');

const getProducts = async (request, reply) => {
  const { includeInactive } = request.query || {};
  try {
    const products = includeInactive === 'true'
      ? await productService.getAllProducts()
      : await productService.getActiveProducts();
    return reply.send({ data: products });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
  }
};

const normalizePrices = (prices) => {
  if (!prices || typeof prices !== 'object') return null;
  const allowedKeys = ['hot', 'iced', 'frappe', 'regular'];
  const normalized = {};

  for (const key of allowedKeys) {
    if (prices[key] !== undefined && prices[key] !== null && prices[key] !== '') {
      const value = Number(prices[key]);
      if (Number.isNaN(value) || value < 0) {
        return null;
      }
      normalized[key] = value;
    }
  }

  if (Object.keys(normalized).length === 0) return null;
  return normalized;
};

const createProduct = async (request, reply) => {
  const { name, category, prices, has_sweetness, allow_roast, allow_addons, is_active } = request.body || {};
  const normalizedPrices = normalizePrices(prices);

  if (!name || !category || !normalizedPrices) {
    return reply.code(400).send({ error: 'ข้อมูลสินค้าไม่ครบถ้วน' });
  }

  try {
    const product = await productService.createProduct({
      name,
      category,
      prices: normalizedPrices,
      has_sweetness: has_sweetness === undefined ? true : Boolean(has_sweetness),
      allow_roast: allow_roast === undefined ? true : Boolean(allow_roast),
      allow_addons: allow_addons === undefined ? true : Boolean(allow_addons),
      is_active: is_active === undefined ? true : Boolean(is_active)
    });
    return reply.code(201).send({ data: product });
  } catch (err) {
    if (err.code === '23505') {
      return reply.code(409).send({ error: 'ชื่อเมนูนี้มีอยู่แล้ว' });
    }
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า' });
  }
};

const updateProduct = async (request, reply) => {
  const { id } = request.params || {};
  const { name, category, prices, has_sweetness, allow_roast, allow_addons, is_active } = request.body || {};

  if (!id) {
    return reply.code(400).send({ error: 'ไม่พบรหัสสินค้า' });
  }

  const normalizedPrices = prices === undefined ? undefined : normalizePrices(prices);
  if (prices !== undefined && !normalizedPrices) {
    return reply.code(400).send({ error: 'รูปแบบราคาไม่ถูกต้อง' });
  }

  try {
    const product = await productService.updateProduct(id, {
      name,
      category,
      prices: normalizedPrices,
      has_sweetness,
      allow_roast,
      allow_addons,
      is_active
    });

    if (!product) {
      return reply.code(404).send({ error: 'ไม่พบสินค้า' });
    }

    return reply.send({ data: product });
  } catch (err) {
    if (err.code === '23505') {
      return reply.code(409).send({ error: 'ชื่อเมนูนี้มีอยู่แล้ว' });
    }
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการอัปเดตสินค้า' });
  }
};

const deleteProduct = async (request, reply) => {
  const { id } = request.params || {};

  if (!id) {
    return reply.code(400).send({ error: 'ไม่พบรหัสสินค้า' });
  }

  try {
    const deleted = await productService.deleteProduct(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'ไม่พบสินค้า' });
    }
    return reply.send({ data: deleted });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
