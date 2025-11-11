const fs = require("fs");
const path = require("path");
const multer = require("multer");

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const uploadsRoot = path.join(__dirname, "..", "public", "uploads", "mindmaps");

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsRoot, { recursive: true });
};

const sanitizeFilename = (filename) => {
  const name = filename.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
  return name.slice(-50) || "image";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadsDir();
      cb(null, uploadsRoot);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeFilename(path.basename(file.originalname, ext));
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error("INVALID_FILE_TYPE");
    error.code = "INVALID_FILE_TYPE";
    return cb(error);
  }
  cb(null, true);
};

const mindmapImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = mindmapImageUpload;
