/**
 * DOCUMIND-AI Storage Service
 * Abstracted storage provider supporting:
 *  1. Supabase Storage (Production recommendation - S3-compatible REST API)
 *  2. Local disk (Development fallback - backend/uploads)
 *
 * Preserves local developer workflow when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not provided.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

// Ensure local directories exist for development
const ensureLocalDirs = () => {
  const dirs = [
    UPLOADS_ROOT,
    path.join(UPLOADS_ROOT, 'users'),
    path.join(UPLOADS_ROOT, 'avatars'),
    path.join(UPLOADS_ROOT, 'exports'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      try {
        fs.mkdirSync(d, { recursive: true });
      } catch (_) {}
    }
  }
};
ensureLocalDirs();

const getStorageProvider = () => {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)) {
    return 'supabase';
  }
  return 'local';
};

/**
 * Uploads a file buffer or stream to the active storage provider.
 * @param {Buffer|fs.ReadStream} fileBuffer - File data
 * @param {Object} options
 * @param {string} options.filename - Original filename
 * @param {string} options.mimeType - MIME type
 * @param {string} options.userId - Uploading user ID
 * @param {string} [options.folder='documents'] - Folder category ('documents', 'avatars', 'exports')
 * @returns {Promise<{ storageProvider: string, storageKey: string, filePath: string, publicUrl: string, signedUrl?: string }>}
 */
const uploadFile = async (fileBuffer, { filename, mimeType, userId, folder = 'documents' }) => {
  const provider = getStorageProvider();
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const storageKey = `${folder}/${userId || 'general'}/${uniqueId}-${safeFilename}`;

  if (provider === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'documind-storage';

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storageKey}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': mimeType || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Supabase Storage upload failed (${response.status}): ${errText}`);
    }

    // Generate signed URL (expires in 24 hours by default for security)
    const signedUrl = await getSignedUrl(storageKey, 86400);

    return {
      storageProvider: 'supabase',
      storageKey,
      bucket,
      filePath: storageKey,
      publicUrl: signedUrl,
      signedUrl,
    };
  }

  // Fallback: Local disk storage
  const userDir = folder === 'avatars' 
    ? path.join(UPLOADS_ROOT, 'avatars')
    : path.join(UPLOADS_ROOT, 'users', String(userId || 'anonymous'));
    
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const diskFilename = `${folder}-${uniqueId}-${safeFilename}`;
  const localFilePath = path.join(userDir, diskFilename);

  if (Buffer.isBuffer(fileBuffer)) {
    fs.writeFileSync(localFilePath, fileBuffer);
  } else if (fileBuffer && typeof fileBuffer.pipe === 'function') {
    const writeStream = fs.createWriteStream(localFilePath);
    await new Promise((resolve, reject) => {
      fileBuffer.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  const relativeUrl = folder === 'avatars'
    ? `/uploads/avatars/${diskFilename}`
    : `/uploads/users/${userId || 'anonymous'}/${diskFilename}`;

  return {
    storageProvider: 'local',
    storageKey,
    filePath: localFilePath,
    publicUrl: relativeUrl,
    signedUrl: relativeUrl,
  };
};

/**
 * Generates a signed URL for secure, time-limited document access.
 * @param {string} storageKey
 * @param {number} expiresIn - Expiry in seconds (default: 3600 = 1 hour)
 */
const getSignedUrl = async (storageKey, expiresIn = 3600) => {
  const provider = getStorageProvider();
  if (provider === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'documind-storage';

    const signEndpoint = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${storageKey}`;
    try {
      const res = await fetch(signEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      });
      if (res.ok) {
        const data = await res.json();
        return `${supabaseUrl}/storage/v1${data.signedURL}`;
      }
    } catch (err) {
      console.warn(`[STORAGE] Error signing Supabase URL for ${storageKey}: ${err.message}`);
    }
  }

  // Local fallback
  return storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
};

/**
 * Retrieves a file as a Buffer. If remote (Supabase), fetches over HTTPS.
 * If local, reads from filesystem.
 */
const getFileBuffer = async (filePathOrKey) => {
  const provider = getStorageProvider();

  // If local file exists, read it
  if (fs.existsSync(filePathOrKey)) {
    return fs.readFileSync(filePathOrKey);
  }

  // Check if it's relative to uploads
  const localCandidate = path.join(UPLOADS_ROOT, filePathOrKey);
  if (fs.existsSync(localCandidate)) {
    return fs.readFileSync(localCandidate);
  }

  // Fetch from Supabase if configured
  if (provider === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'documind-storage';

    const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePathOrKey}`;
    const res = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file from Supabase Storage (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error(`File not found: ${filePathOrKey}`);
};

/**
 * Deletes a file from storage.
 */
const deleteFile = async (filePathOrKey) => {
  const provider = getStorageProvider();
  if (provider === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'documind-storage';

    const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePathOrKey}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    }).catch(() => {});
    return true;
  }

  // Local file unlink
  if (filePathOrKey && fs.existsSync(filePathOrKey)) {
    try {
      fs.unlinkSync(filePathOrKey);
      return true;
    } catch (_) {}
  }
  return false;
};

module.exports = {
  uploadFile,
  getSignedUrl,
  getFileBuffer,
  deleteFile,
  getStorageProvider,
};
