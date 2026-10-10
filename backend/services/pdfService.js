const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);
const { isUsableDocumentText, cleanDocumentText, validateTextQuality } = require("./textQualityService");

/**
 * Find the active Python executable, preferring project virtual environment.
 */
const getPythonCommand = () => {
  const venvPython = path.resolve(__dirname, "../../.venv/Scripts/python.exe");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  const posixVenv = path.resolve(__dirname, "../../.venv/bin/python");
  if (fs.existsSync(posixVenv)) {
    return posixVenv;
  }
  return "python";
};

const { loadDocument } = require("./documentLoaderService");

/**
 * Extract structured PDF pages and section metadata using PyMuPDF via centralized DocumentLoader.
 */
const extractDetailedPDF = async (filePath) => {
  let resolvedPath = filePath;
  if (resolvedPath && !fs.existsSync(resolvedPath)) {
    const candidate = path.join(__dirname, "..", resolvedPath);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.size === 0) {
    throw new Error("File is empty");
  }

  // Primary: Centralized DocumentLoader (PyMuPDF + find_tables + OCR fallback)
  try {
    const docData = await loadDocument(resolvedPath);
    if (docData && docData.pages && docData.pages.length > 0) {
      return {
        totalPages: docData.totalPages,
        pages: docData.pages.map((p) => ({
          pageNumber: p.pageNumber,
          section: p.section || "General",
          isReference: Boolean(p.isReference),
          text: p.text,
          tables: p.tables || [],
          qualityScore: p.qualityScore || 0.9,
          method: p.extractionMethod || "native_pymupdf",
        })),
        fullText: docData.fullText,
      };
    }
  } catch (err) {
    if (err.message && err.message.includes("password-protected")) {
      throw err;
    }
    console.warn(`[PDF] Centralized loadDocument warning: ${err.message}`);
  }

  const pythonCmd = getPythonCommand();
  const scriptPath = path.resolve(__dirname, "../scripts/extract_pdf.py");

  if (fs.existsSync(scriptPath)) {
    try {
      const { stdout } = await execFileAsync(pythonCmd, [scriptPath, path.resolve(resolvedPath), "--json"], {
        timeout: 45000,
        maxBuffer: 30 * 1024 * 1024,
      });

      if (stdout && stdout.trim().startsWith("{")) {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.is_encrypted) {
          throw new Error("This PDF is password-protected. Please remove the password and try again.");
        }
        if (parsed.pages && parsed.pages.length > 0) {
          const validPages = parsed.pages.filter((p) => isUsableDocumentText(p.text));
          if (validPages.length > 0) {
            return {
              totalPages: parsed.total_pages || parsed.pages.length,
              pages: parsed.pages.map((p) => ({
                pageNumber: p.page_number,
                section: p.section || "General",
                isReference: Boolean(p.is_reference),
                text: cleanDocumentText(p.text),
                qualityScore: p.quality_score || 0.9,
                method: p.method || "native_pymupdf",
              })),
              fullText: parsed.full_text,
            };
          }
        }
      }
    } catch (err) {
      if (err.message && err.message.includes("password-protected")) {
        throw err;
      }
      console.warn(`[PDF] Detailed extraction notice: ${err.message}`);
    }
  }

  // Fallback to simple extraction
  const simpleText = await extractTextFromPDF(resolvedPath);
  const rawPages = simpleText.split("\f");
  return {
    totalPages: rawPages.length,
    pages: rawPages.map((text, i) => ({
      pageNumber: i + 1,
      section: i >= rawPages.length - 2 && /references|bibliography/i.test(text.slice(0, 100)) ? "References" : "General",
      isReference: i >= rawPages.length - 2 && /references|bibliography/i.test(text.slice(0, 100)),
      text: cleanDocumentText(text),
      qualityScore: 0.85,
      method: "native_pymupdf",
    })),
    fullText: simpleText,
  };
};

/**
 * Safely extract text from a PDF file.
 * Prioritizes PyMuPDF via Python -> pypdf -> Mozilla pdfjs-dist fallback -> OCR.
 * Never decodes raw PDF binary directly as UTF-8 string.
 */
const extractTextFromPDF = async (filePath) => {
  let resolvedPath = filePath;
  if (resolvedPath && !fs.existsSync(resolvedPath)) {
    const candidate = path.join(__dirname, "..", resolvedPath);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.size === 0) {
    throw new Error("File is empty");
  }

  console.log(`[PDF] file path: ${resolvedPath}`);

  let text = "";
  const pythonCmd = getPythonCommand();
  const scriptPath = path.resolve(__dirname, "../scripts/extract_pdf.py");

  // Strategy 1: Dedicated PyMuPDF extract_pdf.py script
  if (fs.existsSync(scriptPath)) {
    try {
      const { stdout } = await execFileAsync(pythonCmd, [scriptPath, path.resolve(resolvedPath)], {
        timeout: 45000,
        maxBuffer: 25 * 1024 * 1024,
      });
      if (stdout && stdout.trim().length > 30) {
        text = stdout.trim();
      }
    } catch (err) {
      console.warn(`[PDF] Script extraction warning: ${err.message}`);
    }
  }

  // Strategy 2: Python inline PyMuPDF / pypdf
  if (!text || !isUsableDocumentText(text)) {
    const inlineScript = `
import sys
try:
    path = sys.argv[1]
    import pymupdf as fitz
    doc = fitz.open(path)
    if doc.is_encrypted:
        print("ERROR: PASSWORD_PROTECTED")
        sys.exit(0)
    pages = [p.get_text("text") or "" for p in doc]
    doc.close()
    res = "\\f".join(pages)
    if len(res.strip()) > 30:
        sys.stdout.buffer.write(res.encode("utf-8", errors="replace"))
        sys.exit(0)
except Exception:
    pass

try:
    from pypdf import PdfReader
    reader = PdfReader(path)
    pages = [p.extract_text() or "" for p in reader.pages]
    res = "\\f".join(pages)
    sys.stdout.buffer.write(res.encode("utf-8", errors="replace"))
except Exception:
    sys.exit(1)
`;
    try {
      const { stdout } = await execFileAsync(pythonCmd, ["-c", inlineScript, path.resolve(resolvedPath)], {
        timeout: 25000,
        maxBuffer: 20 * 1024 * 1024,
      });
      if (stdout && stdout.trim().includes("ERROR: PASSWORD_PROTECTED")) {
        throw new Error("This PDF is password-protected. Please remove the password and try again.");
      }
      if (stdout && stdout.trim().length > 30) {
        text = stdout.trim();
      }
    } catch (err) {
      if (err.message && err.message.includes("password-protected")) throw err;
      console.warn(`[PDF] Python inline extraction warning: ${err.message}`);
    }
  }

  // Strategy 3: Mozilla pdfjs-dist fallback
  if (!text || !isUsableDocumentText(text)) {
    try {
      const pdfBuffer = fs.readFileSync(resolvedPath);
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
      });
      const pdfDoc = await loadingTask.promise;
      const pages = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) {
          pages.push(pageText);
        }
      }
      const combined = pages.join("\f");
      if (isUsableDocumentText(combined)) {
        text = combined;
      }
    } catch (pdfjsErr) {
      console.warn(`[PDF] pdfjs-dist warning:`, pdfjsErr.message);
    }
  }

  const cleaned = cleanDocumentText(text);
  if (!cleaned || !isUsableDocumentText(cleaned)) {
    throw new Error(`PDF contains no readable text layer. File: ${path.basename(resolvedPath)}`);
  }

  const pagesExtracted = (cleaned.match(/\f/g) || []).length + 1;
  console.log(`[PDF] pages extracted: ${pagesExtracted} | readable characters: ${cleaned.length}`);

  return cleaned.trim();
};

module.exports = {
  extractTextFromPDF,
  extractDetailedPDF,
};