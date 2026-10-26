import mongoose from 'mongoose';

// ERROR_LOG entity. machine_id references machine.machine_id in MySQL;
// the reference is validated by the API since it crosses databases.
const errorLogSchema = new mongoose.Schema(
  {
    machine_id: { type: Number, required: true },
    error_datetime: { type: Date, required: true, default: Date.now },
    error_code: { type: String, required: true, trim: true },
  },
  {
    collection: 'error_logs',
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        ret.error_id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Most queries are "errors for machine X in a time window"
errorLogSchema.index({ machine_id: 1, error_datetime: -1 });
errorLogSchema.index({ error_code: 1 });

export default mongoose.model('ErrorLog', errorLogSchema);
