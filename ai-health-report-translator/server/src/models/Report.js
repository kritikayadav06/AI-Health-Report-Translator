const mongoose = require('mongoose');

const STATUSES = ['Normal', 'High', 'Low', 'No range', 'Not graded'];

const resultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: { type: String, required: true, index: true }, // normalised name for trends
    organ: { type: String, required: true, default: 'other' },
    value: { type: Number, default: null },
    valueText: { type: String, default: '' },
    unit: { type: String, default: '' },
    refLow: { type: Number, default: null },
    refHigh: { type: Number, default: null },
    refText: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'No range' },
    deviation: { type: Number, default: 0 },
    critical: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
  },
  { _id: true }
);

const analysisSchema = new mongoose.Schema(
  {
    summary: String,
    doctorQuestions: [String],
    organNotes: [{ organ: String, note: String }],
    provider: { type: String, enum: ['claude', 'offline'] },
    model: String,
    generatedAt: Date,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 120, default: 'Lab report' },
    labName: { type: String, trim: true, maxlength: 120, default: '' },
    reportDate: { type: Date, required: true },
    source: {
      type: { type: String, enum: ['pdf', 'image', 'manual'], required: true },
      fileName: String, // original name only; the file itself is never stored
      extraction: { type: String, enum: ['pdf-text', 'ocr', 'ai', 'manual'] },
      pages: Number,
    },
    // pending_review -> analyzed (user must confirm extracted values first)
    state: { type: String, enum: ['pending_review', 'analyzed'], default: 'pending_review', index: true },
    results: [resultSchema],
    analysis: analysisSchema,
    healthScore: { type: Number, min: 0, max: 100, default: null },
    warnings: [String],
  },
  { timestamps: true }
);

reportSchema.index({ user: 1, reportDate: -1 });

reportSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.results) ret.results = ret.results.map(({ _id, ...r }) => ({ id: _id?.toString(), ...r }));
    return ret;
  },
});

module.exports = mongoose.model('Report', reportSchema);
module.exports.STATUSES = STATUSES;
