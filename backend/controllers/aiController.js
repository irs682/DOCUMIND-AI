const { askDocument, removeDocumentFromVectorDB } = require("../services/ragService");

const askAI = async (req, res) => {
  try {
    const { question, documentId = null, knowledgeBaseId = null } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "A question is required",
      });
    }

    // req.user._id may be a real ObjectId or the demo string 'demo-user-id'
    // ragService handles both via the flexible filter
    const result = await askDocument({
      question,
      documentId,
      userId: req.user._id,
      knowledgeBaseId,
    });

    return res.status(200).json({
      success: true,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error("AI Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteDocumentVectors = async (req, res) => {
  try {
    const { documentId } = req.params;
    await removeDocumentFromVectorDB({
      documentId,
      userId: req.user?._id || null,
    });
    return res.status(200).json({
      success: true,
      message: "Document vectors deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  askAI,
  deleteDocumentVectors,
};
