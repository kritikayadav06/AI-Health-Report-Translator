const User = require('../models/User');
const Report = require('../models/Report');
const HttpError = require('../utils/httpError');
const { signToken } = require('../middleware/auth');

async function register(req, res) {
  const { name, email, password } = req.body;
  const user = await User.create({
    name,
    email,
    passwordHash: await User.hashPassword(password),
    consentAcceptedAt: new Date(),
  });
  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password (no account enumeration)
  if (!user || !(await user.verifyPassword(password))) throw new HttpError(401, 'Invalid email or password');
  res.json({ token: signToken(user), user });
}

async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Account not found');
  res.json({ user });
}

async function updateProfile(req, res) {
  const { name, sex, birthYear } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (sex !== undefined) update['profile.sex'] = sex;
  if (birthYear !== undefined) update['profile.birthYear'] = birthYear;
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true });
  res.json({ user });
}

/** Right to erasure: delete the account and every report it owns. */
async function deleteAccount(req, res) {
  await Report.deleteMany({ user: req.userId });
  await User.deleteOne({ _id: req.userId });
  res.status(204).end();
}

module.exports = { register, login, me, updateProfile, deleteAccount };
