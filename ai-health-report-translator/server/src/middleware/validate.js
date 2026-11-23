const HttpError = require('../utils/httpError');

/** Validate req[part] against a zod schema and replace it with the parsed value. */
const validate = (schema, part = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new HttpError(400, 'Invalid input', details));
  }
  if (part === 'body') req.body = result.data;
  else req.validated = { ...(req.validated || {}), [part]: result.data };
  return next();
};

module.exports = validate;
