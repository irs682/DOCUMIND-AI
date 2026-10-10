const mongoose = require("mongoose");

/**
 * Unified Evidence Object Schema for DOCUMIND-AI
 * Treats paragraphs, headings, tables, figures, charts, diagrams,
 * screenshots, OCR regions, and equations as first-class document evidence.
 */
const evidenceObjectSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    pageNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    objectType: {
      type: String,
      enum: [
        "text",
        "heading",
        "table",
        "figure",
        "chart",
        "diagram",
        "image",
        "ocr",
        "equation",
      ],
      required: true,
      index: true,
    },
    section: {
      type: String,
      default: "General",
    },
    objectId: {
      type: String,
      default: null,
      index: true,
    },
    caption: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    bbox: {
      type: [Number], // [x1, y1, x2, y2]
      default: [],
    },
    sourceMethod: {
      type: String,
      enum: [
        "native_text",
        "table_parser",
        "ocr",
        "vision",
        "layout_parser",
        "docx_embedded_image",
        "pdf_embedded_image",
      ],
      default: "native_text",
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const EvidenceObject = mongoose.model("EvidenceObject", evidenceObjectSchema);

module.exports = {
  evidenceObjectSchema,
  EvidenceObject,
};
