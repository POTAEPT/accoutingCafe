const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');

const verifyUserCredentials = async ({ username, password }) => {
  const user = await userRepository.findByUsername(username);

  if (!user) {
    const error = new Error('Username หรือ Password ไม่ถูกต้อง');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Username หรือ Password ไม่ถูกต้อง');
    error.statusCode = 401;
    throw error;
  }

  return user;
};

module.exports = {
  verifyUserCredentials
};
