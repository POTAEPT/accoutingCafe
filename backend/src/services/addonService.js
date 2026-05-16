const addonRepository = require('../repositories/addonRepository');

const getAddons = async () => {
  return addonRepository.listAddons();
};

const createAddon = async ({ name, price, category }) => {
  return addonRepository.createAddon({ name, price, category });
};

const updateAddon = async (id, payload) => {
  return addonRepository.updateAddon(id, payload);
};

const deleteAddon = async (id) => {
  return addonRepository.deleteAddon(id);
};

module.exports = {
  getAddons,
  createAddon,
  updateAddon,
  deleteAddon
};
