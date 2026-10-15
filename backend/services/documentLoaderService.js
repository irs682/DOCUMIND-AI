const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);
const { validateTextQuality, isUsableDocumentText, cleanDocumentText } = require("./textQualityService");

/**
 * Locate the active Python executable, preferring project virtual environment.
 */
const getPythonCommand = () => {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) return process.env.PYTHON_PATH;
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython = path.resolve(__dirname, "../../.venv/Scripts/python.exe");
  if (fs.existsSync(venvPython)) return venvPython;
  const posixVenv = path.resolve(__dirname, "../../.venv/bin/python");
  if (fs.existsSync(posixVenv)) return posixVenv;
  return process.platform === "win32" ? "python" : "python3";
};

/**
 * Load any document (PDF, DOCX, TXT, CSV, Image) through the centralized DocumentLoader.
 * Returns normalized schema:
 * {
 *   documentId: string,
 *   fileName: string,
 *   fileType: string,
 *   totalPages: number,
 *   pages: [{
 *     pageNumber: number,
 *     text: string,
 *     tables: [{ tableId, headers, rows, rawText, sourceBBox }],
 *     section: string,
 *     isReference: boolean,
 *     extractionMethod: "native" | "ocr",
 *     ocrUsed: boolean,
 *     ocrConfidence: number,
 *     qualityScore: number
 *   }],
 *   fullText: string
 * }
 */
const loadDocument = async (filePath, originalName = "") => {
  let resolvedPath = filePath;
  if (resolvedPath && !fs.existsSync(resolvedPath)) {
    const candidate = path.join(__dirname, "..", resolvedPath);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Document file not found at: ${filePath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.size === 0) {
    throw new Error(`Document file is empty (0 bytes): ${path.basename(resolvedPath)}`);
  }

  const pythonCmd = getPythonCommand();
  const scriptPath = path.resolve(__dirname, "../scripts/document_loader.py");
  const fileName = originalName || path.basename(resolvedPath);

  let pythonLoaderError = null;

  // Strategy 1: Centralized Python DocumentLoader
  if (fs.existsSync(scriptPath)) {
    try {
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        [scriptPath, path.resolve(resolvedPath), "--json"],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PYTHONIOENCODING: "utf-8",
            PYTHONUTF8: "1",
          },
          timeout: 60000,
          maxBuffer: 40 * 1024 * 1024,
        }
      );

      if (stderr && stderr.trim()) {
        console.log(`[DocumentLoader:stderr] ${stderr.trim()}`);
      }

      // Robustly locate JSON substring even if runtime prints diagnostic text before/after
      let parsed = null;
      if (stdout) {
        const firstBrace = stdout.indexOf('{');
        const lastBrace = stdout.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            parsed = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
          } catch (jsonErr) {
            console.warn(`[DocumentLoader] JSON parse error: ${jsonErr.message}`);
          }
        }
      }

      if (parsed) {
        if (parsed.isEncrypted || parsed.error === 'PDF_PASSWORD_REQUIRED') {
          const passErr = new Error("This PDF is password-protected. Please remove the password and try again.");
          passErr.code = 'PDF_PASSWORD_REQUIRED';
          throw passErr;
        }

        if (parsed.error && (!parsed.pages || parsed.pages.length === 0)) {
          pythonLoaderError = parsed.error;
        } else if (parsed.pages && parsed.pages.length > 0) {
          const docFileType = parsed.fileType || path.extname(resolvedPath).replace(".", "").toLowerCase();
          const pages = parsed.pages.map((p, idx) => ({
            pageNumber: p.pageNumber || idx + 1,
            text: cleanDocumentText(p.text || ""),
            tables: p.tables || [],
            figures: p.figures || [],
            evidenceObjects: p.evidenceObjects || [],
            section: p.section || "General",
            isReference: Boolean(p.isReference),
            extractionMethod: p.extractionMethod || "native",
            ocrUsed: Boolean(p.ocrUsed),
            ocrConfidence: typeof p.ocrConfidence === "number" ? p.ocrConfidence : 1.0,
            qualityScore: typeof p.qualityScore === "number" ? p.qualityScore : 0.9,
          }));

          const allTables = (parsed.tables && parsed.tables.length > 0)
            ? parsed.tables
            : pages.flatMap((p) => p.tables || []);

          const allFigures = (parsed.figures && parsed.figures.length > 0)
            ? parsed.figures
            : pages.flatMap((p) => p.figures || []);

          const allEvidenceObjects = (parsed.evidenceObjects && parsed.evidenceObjects.length > 0)
            ? parsed.evidenceObjects
            : pages.flatMap((p) => p.evidenceObjects || []);

          const diagnostics = parsed.diagnostics || {
            textBlocks: 0,
            tablesDetected: allTables.length,
            tablesParsed: allTables.length,
            figuresDetected: allFigures.length,
            figuresProcessed: allFigures.length,
            ocrPages: parsed.metadata?.ocrPages || 0,
            failedObjects: 0,
            evidenceObjectsCount: allEvidenceObjects.length,
          };

          const fullText = parsed.fullText || pages.map((p) => p.text).join("\f");
          const totalChars = pages.reduce((sum, p) => sum + (p.text ? p.text.length : 0), 0);

          if (totalChars > 0 || allTables.length > 0 || allFigures.length > 0) {
            return {
              documentId: parsed.documentId || path.basename(resolvedPath, path.extname(resolvedPath)),
              fileName,
              fileType: docFileType,
              pageCount: parsed.pageCount || parsed.totalPages || pages.length,
              totalPages: parsed.totalPages || parsed.pageCount || pages.length,
              pages,
              tables: allTables,
              figures: allFigures,
              evidenceObjects: allEvidenceObjects,
              diagnostics,
              fullText,
              metadata: parsed.metadata || {},
            };
          } else {
            pythonLoaderError = "Document extraction returned 0 characters and 0 tables";
          }
        }
      }
    } catch (loaderErr) {
      if (loaderErr.code === 'PDF_PASSWORD_REQUIRED' || (loaderErr.message && loaderErr.message.includes("password-protected"))) {
        throw loaderErr;
      }
      console.warn(`[DocumentLoader] Python loader warning: ${loaderErr.message}`);
      pythonLoaderError = loaderErr.message;
    }
  }

  // Strategy 2: Node-native Fallbacks
  const ext = path.extname(resolvedPath).toLowerCase();
  console.log(`[DocumentLoader] Checking Node native fallback for ${ext} file: ${fileName}`);

  if ([".txt", ".csv", ".json", ".md", ".log", ".xml"].includes(ext)) {
    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const cleaned = cleanDocumentText(raw);
    const quality = validateTextQuality(cleaned, { fileType: ext.replace(".", ""), fileName });
    if (quality.valid && cleaned.length > 0) {
      return {
        documentId: path.basename(resolvedPath, ext),
        fileName,
        fileType: ext.replace(".", ""),
        pageCount: 1,
        totalPages: 1,
        pages: [
          {
            pageNumber: 1,
            text: cleaned,
            tables: [],
            section: "General",
            isReference: false,
            extractionMethod: "native",
            ocrUsed: false,
            ocrConfidence: 1.0,
            qualityScore: quality.score,
          },
        ],
        tables: [],
        fullText: cleaned,
        metadata: { totalCharacters: cleaned.length },
      };
    }
  }

  if (ext === ".pdf") {
    try {
      const pdfParse = require("pdf-parse");
      const dataBuffer = fs.readFileSync(resolvedPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = cleanDocumentText(pdfData.text || "");
      if (text.length > 0) {
        return {
          documentId: path.basename(resolvedPath, ext),
          fileName,
          fileType: "pdf",
          pageCount: pdfData.numpages || 1,
          totalPages: pdfData.numpages || 1,
          pages: [
            {
              pageNumber: 1,
              text,
              tables: [],
              section: "General",
              isReference: false,
              extractionMethod: "node-native",
              ocrUsed: false,
              ocrConfidence: 1.0,
              qualityScore: 0.85,
            },
          ],
          tables: [],
          figures: [],
          evidenceObjects: [],
          diagnostics: { textBlocks: 1, tablesDetected: 0, tablesParsed: 0, figuresDetected: 0, figuresProcessed: 0, ocrPages: 0, failedObjects: 0, evidenceObjectsCount: 0 },
          fullText: text,
          metadata: { totalCharacters: text.length, numPages: pdfData.numpages },
        };
      }
    } catch (pdfErr) {
      console.warn(`[DocumentLoader] pdf-parse fallback error: ${pdfErr.message}`);
    }
  }

  const reason = pythonLoaderError
    ? `Python extraction error: ${pythonLoaderError}`
    : `Document extraction returned zero usable text or tables`;
  throw new Error(`Unable to extract readable content from ${fileName}. ${reason}`);
};

module.exports = {
  loadDocument,
  getPythonCommand,
};
