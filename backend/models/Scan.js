const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: String,
  risk: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Info'],
    default: 'Info'
  },
  description: String,
  mitigation: String
});

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: String,
    required: true
  },
  overallRisk: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Safe'],
    default: 'Safe'
  },
  issues: [issueSchema],
  reportFile: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Scan', scanSchema);
