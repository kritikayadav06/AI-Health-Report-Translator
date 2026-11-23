const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const register = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password,
  acceptDisclaimer: z.literal(true, { message: 'You must accept the disclaimer to continue' }),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const profile = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sex: z.enum(['female', 'male', 'other', '']).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

const numOrNull = z.union([z.number(), z.string().trim(), z.null()]).optional();

const resultRow = z.object({
  name: z.string().trim().min(1).max(100),
  value: numOrNull,
  valueText: z.string().max(40).optional(),
  unit: z.string().max(30).optional().default(''),
  refLow: numOrNull,
  refHigh: numOrNull,
  refText: z.string().max(60).optional(),
  organ: z.string().max(20).optional(),
});

const results = z.object({ results: z.array(resultRow).max(200) });

const meta = z.object({
  title: z.string().trim().max(120).optional(),
  labName: z.string().trim().max(120).optional(),
  reportDate: z.coerce.date().optional(),
});

const manualReport = meta.extend({ results: z.array(resultRow).min(1).max(200) });

const reportUpdate = meta.extend({ results: z.array(resultRow).max(200).optional() });

module.exports = { register, login, profile, results, manualReport, reportUpdate, meta };
