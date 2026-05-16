const addonService = require('../services/addonService');

const normalizeCategory = (value) => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized !== 'roast' && normalized !== 'addon') return null;
  return normalized;
};

const normalizePrice = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const price = Number(value);
  if (Number.isNaN(price) || price < 0) return null;
  return price;
};

const getAddons = async (request, reply) => {
  try {
    const addons = await addonService.getAddons();
    return reply.send({ data: addons });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวเลือกเสริม' });
  }
};

const createAddon = async (request, reply) => {
  const { name, price, category } = request.body || {};
  const normalizedCategory = normalizeCategory(category);
  const normalizedPrice = normalizePrice(price);

  if (!name || !normalizedCategory || normalizedPrice === null) {
    return reply.code(400).send({ error: 'ข้อมูลตัวเลือกเสริมไม่ครบถ้วน' });
  }

  try {
    const addon = await addonService.createAddon({
      name: String(name).trim(),
      price: normalizedPrice,
      category: normalizedCategory
    });
    return reply.code(201).send({ data: addon });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการเพิ่มตัวเลือกเสริม' });
  }
};

const updateAddon = async (request, reply) => {
  const { id } = request.params || {};
  const { name, price, category } = request.body || {};

  if (!id) {
    return reply.code(400).send({ error: 'ไม่พบรหัสตัวเลือกเสริม' });
  }

  const normalizedCategory = category === undefined ? undefined : normalizeCategory(category);
  const normalizedPrice = price === undefined ? undefined : normalizePrice(price);

  if (category !== undefined && !normalizedCategory) {
    return reply.code(400).send({ error: 'ประเภทตัวเลือกเสริมไม่ถูกต้อง' });
  }

  if (price !== undefined && normalizedPrice === null) {
    return reply.code(400).send({ error: 'รูปแบบราคาไม่ถูกต้อง' });
  }

  try {
    const addon = await addonService.updateAddon(id, {
      name,
      price: normalizedPrice,
      category: normalizedCategory
    });

    if (!addon) {
      return reply.code(404).send({ error: 'ไม่พบตัวเลือกเสริม' });
    }

    return reply.send({ data: addon });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการอัปเดตตัวเลือกเสริม' });
  }
};

const deleteAddon = async (request, reply) => {
  const { id } = request.params || {};

  if (!id) {
    return reply.code(400).send({ error: 'ไม่พบรหัสตัวเลือกเสริม' });
  }

  try {
    const deleted = await addonService.deleteAddon(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'ไม่พบตัวเลือกเสริม' });
    }
    return reply.send({ data: deleted });
  } catch (err) {
    return reply.code(500).send({ error: 'เกิดข้อผิดพลาดในการลบตัวเลือกเสริม' });
  }
};

module.exports = {
  getAddons,
  createAddon,
  updateAddon,
  deleteAddon
};
