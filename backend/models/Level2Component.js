const mongoose = require('mongoose');

const Level2ComponentSchema = new mongoose.Schema({
  code: { type: String, required: true },
  componentName: { type: String, required: true },
  componentDescription: { type: String },
  estimatedAmount: { type: Number, default: 0, required: true, min: 0 },
  parentComponent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level1Component',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Level2Component', Level2ComponentSchema);