const path = require("path");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3Client, bucket } = require("../config/storage.config");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Type de fichier non autorisé. Types acceptés : ${ALLOWED_MIME_TYPES.join(", ")}`
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `uploads/${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
