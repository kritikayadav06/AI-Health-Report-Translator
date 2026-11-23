const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/httpError');

function signToken(user) {
  return jwt.sign({ sub: user.id || user._id.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new HttpError(401, 'Session expired or invalid, please log in again'));
  }
}

module.exports = { signToken, requireAuth };
