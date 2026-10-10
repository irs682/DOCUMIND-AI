const mongoose = require('mongoose');

const researchDatasetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    items: [
      {
        question: {
          type: String,
          required: true,
        },
        expectedAnswer: {
          type: String,
          default: '',
        },
        relevantKeywords: [String],
        relevantDocumentNames: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ResearchDataset =
  mongoose.models.ResearchDataset || mongoose.model('ResearchDataset', researchDatasetSchema);

module.exports = ResearchDataset;
