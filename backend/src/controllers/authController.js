const authService = require('../services/authService');

const login = async (request, reply) => {
  const { username, password } = request.body || {};

  if (!username || !password) {
    return reply.code(400).send({ error: 'กรุณาส่ง Username และ Password ให้ครบถ้วน' });
  }

  try {
    const user = await authService.verifyUserCredentials({ username, password });
    const token = request.server.jwt.sign({
      id: user.id,
      username: user.username
    });

    return reply.send({
      message: 'เข้าสู่ระบบสำเร็จ',
      token
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'เกิดข้อผิดพลาดที่ระบบหลังบ้าน';
    return reply.code(statusCode).send({ error: message });
  }
};

module.exports = {
  login
};
