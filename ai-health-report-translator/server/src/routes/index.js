const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { upload, verifyFile } = require('../middleware/upload');
const v = require('../validators');
const auth = require('../controllers/authController');
const reports = require('../controllers/reportController');
const insights = require('../controllers/insightController');

const router = Router();
const isTest = env.NODE_ENV === 'test';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: isTest ? 1000 : 20, standardHeaders: 'draft-8', legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: isTest ? 1000 : 30, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/health', (_req, res) => res.json({ ok: true, ai: env.AI_ENABLED ? 'claude' : 'offline' }));
router.get('/catalog', insights.catalog);

// Auth
router.post('/auth/register', authLimiter, validate(v.register), auth.register);
router.post('/auth/login', authLimiter, validate(v.login), auth.login);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, validate(v.profile), auth.updateProfile);
router.delete('/auth/me', requireAuth, auth.deleteAccount);

// Reports
router.get('/reports', requireAuth, reports.list);
router.post('/reports/upload', requireAuth, aiLimiter, upload.single('file'), verifyFile, reports.upload);
router.post('/reports/manual', requireAuth, validate(v.manualReport), reports.createManual);
router.get('/reports/:id', requireAuth, reports.get);
router.put('/reports/:id', requireAuth, validate(v.reportUpdate), reports.update);
router.post('/reports/:id/analyze', requireAuth, aiLimiter, reports.analyze);
router.delete('/reports/:id', requireAuth, reports.remove);

// Insights
router.get('/insights/overview', requireAuth, insights.overview);
router.get('/insights/trends', requireAuth, insights.trendList);
router.get('/insights/trends/:key', requireAuth, insights.trend);

module.exports = router;
