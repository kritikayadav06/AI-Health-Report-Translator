process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = ''; // always offline in tests
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/ai_health_reporter_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');
const { shutdown } = require('../src/services/textExtractor');

const app = createApp();
const SAMPLE_PDF = path.join(__dirname, '..', 'samples', 'sample-report.pdf');

let token;
let other;

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.dropDatabase();
  token = (await register('a@example.com')).body.token;
  other = (await register('b@example.com')).body.token;
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await shutdown();
});

function register(email) {
  return request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'Passw0rd!', acceptDisclaimer: true });
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

test('auth: validation, duplicate email, login, protected routes', async () => {
  const weak = await request(app).post('/api/auth/register').send({ name: 'x', email: 'c@example.com', password: 'short', acceptDisclaimer: true });
  assert.equal(weak.status, 400);
  assert.equal((await register('a@example.com')).status, 409);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'wrong' })).status, 401);
  const ok = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'Passw0rd!' });
  assert.equal(ok.status, 200);
  assert.ok(!('passwordHash' in ok.body.user));
  assert.equal((await request(app).get('/api/reports')).status, 401);
});

test('upload rejects files whose content is not a PDF or image', async () => {
  const res = await request(app)
    .post('/api/reports/upload')
    .set(auth(token))
    .attach('file', Buffer.from('not really a pdf at all'), { filename: 'x.pdf', contentType: 'application/pdf' });
  assert.equal(res.status, 415);
});

test('full workflow: upload PDF -> review -> analyze -> trends -> overview', async () => {
  const up = await request(app).post('/api/reports/upload').set(auth(token)).attach('file', SAMPLE_PDF);
  assert.equal(up.status, 201, JSON.stringify(up.body));
  const report = up.body.report;
  assert.equal(report.state, 'pending_review');
  assert.equal(report.source.extraction, 'pdf-text');
  assert.ok(report.results.length >= 15, `found ${report.results.length}`);
  assert.equal(report.reportDate.slice(0, 10), '2026-11-15');
  const wbc = report.results.find((r) => r.key === 'wbc');
  assert.equal(wbc.status, 'High');

  // user corrects a misread value during review
  const edited = report.results.map((r) => (r.key === 'hemoglobin' ? { ...r, value: 12.5 } : r));
  const put = await request(app).put(`/api/reports/${report.id}`).set(auth(token)).send({ results: edited });
  assert.equal(put.status, 200);
  assert.equal(put.body.report.results.find((r) => r.key === 'hemoglobin').status, 'Normal');

  const an = await request(app).post(`/api/reports/${report.id}/analyze`).set(auth(token));
  assert.equal(an.status, 200);
  assert.equal(an.body.report.state, 'analyzed');
  assert.ok(an.body.report.analysis.summary.length > 20);
  assert.ok(an.body.report.analysis.doctorQuestions.length > 0);
  assert.ok(an.body.report.results.every((r) => r.explanation));
  assert.ok(an.body.report.disclaimer.includes('not medical advice'));

  const manual = await request(app)
    .post('/api/reports/manual')
    .set(auth(token))
    .send({ reportDate: '2026-05-01', results: [{ name: 'TSH', value: 3.2, unit: 'µIU/mL', refLow: 0.4, refHigh: 4 }] });
  assert.equal(manual.status, 201);
  await request(app).post(`/api/reports/${manual.body.report.id}/analyze`).set(auth(token));

  const tr = await request(app).get('/api/insights/trends/tsh').set(auth(token));
  assert.equal(tr.status, 200);
  assert.deepEqual(tr.body.points.map((p) => p.value), [3.2, 5.2]);

  const ov = await request(app).get('/api/insights/overview').set(auth(token));
  assert.equal(ov.status, 200);
  const thyroid = ov.body.organs.find((o) => o.key === 'thyroid');
  assert.equal(thyroid.status, 'attention');
  assert.equal(thyroid.tests[0].change, 'up');
  assert.equal(ov.body.organs.find((o) => o.key === 'lungs').status, 'no-data');
});

test('image upload is read with OCR', async () => {
  const res = await request(app)
    .post('/api/reports/upload')
    .set(auth(other))
    .attach('file', path.join(__dirname, '..', 'samples', 'sample-report.png'));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.report.source.extraction, 'ocr');
  assert.ok(res.body.report.results.length >= 6);
  assert.ok(res.body.report.warnings.some((w) => w.includes('OCR')));
  await request(app).delete(`/api/reports/${res.body.report.id}`).set(auth(other));
});

test('access control: users cannot read or delete each other\'s reports', async () => {
  const list = await request(app).get('/api/reports').set(auth(token));
  const id = list.body.reports[0].id;
  assert.equal((await request(app).get(`/api/reports/${id}`).set(auth(other))).status, 404);
  assert.equal((await request(app).delete(`/api/reports/${id}`).set(auth(other))).status, 404);
  assert.equal((await request(app).get('/api/reports').set(auth(other))).body.reports.length, 0);
});

test('deleting the account removes all reports', async () => {
  assert.equal((await request(app).delete('/api/auth/me').set(auth(token))).status, 204);
  assert.equal(await mongoose.connection.collection('reports').countDocuments(), 0);
  assert.equal((await request(app).get('/api/auth/me').set(auth(token))).status, 401);
});
