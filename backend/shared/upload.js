const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ValidationError } = require('./errors');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.csv', '.txt', '.md', '.rtf', '.log', '.eml',
  '.zip', '.7z',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const random = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new ValidationError([{
        field: 'file',
        message: `File type '${ext || 'unknown'}' not allowed. Allowed: PDF, images, Office docs, CSV, TXT, logs, email, archives`,
      }]));
    }
    cb(null, true);
  },
});

function deleteUploadedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  const fullPath = path.join(UPLOADS_DIR, path.basename(filePath));
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    /* best-effort cleanup */
  }
}

module.exports = { upload, UPLOADS_DIR, MAX_FILE_SIZE, deleteUploadedFile };
