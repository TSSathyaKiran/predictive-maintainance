import mongoose from 'mongoose';

// RISK_SCORE entity: one document per machine per batch run.
const riskScoreSchema = new mongoose.Schema(
  {
    machine_id: { type: Number, required: true },
    score_date: { type: Date, required: true, default: Date.now },
    risk_value: { type: Number, required: true, min: 0, max: 1 },
    source_batch_job: { type: String, required: true },
    // Inputs used to compute the score, kept for explainability
    features: {
      errors_7d: Number,
      errors_30d: Number,
      failures_90d: Number,
      days_since_maintenance: Number,
      age_years: Number,
    },
  },
  {
    collection: 'risk_scores',
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        ret.risk_id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

riskScoreSchema.index({ machine_id: 1, score_date: -1 });

export default mongoose.model('RiskScore', riskScoreSchema);
