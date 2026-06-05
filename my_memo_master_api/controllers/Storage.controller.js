const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucket, publicUrl } = require("../config/storage.config");

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "Aucun fichier envoyé." });
    }
    return res.status(201).send({
      key: req.file.key,
      url: req.file.location || `${publicUrl}/${req.file.key}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: error.message || "Erreur lors de l'upload du fichier." });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ message: "Aucun fichier envoyé." });
    }
    const files = req.files.map((file) => ({
      key: file.key,
      url: file.location || `${publicUrl}/${file.key}`,
      mimetype: file.mimetype,
      size: file.size,
    }));
    return res.status(201).send(files);
  } catch (error) {
    return res
      .status(500)
      .send({ message: error.message || "Erreur lors de l'upload des fichiers." });
  }
};

exports.delete = async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).send({ message: "Paramètre 'key' manquant." });
    }
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: decodeURIComponent(key) })
    );
    return res.status(200).send({ message: "Fichier supprimé avec succès." });
  } catch (error) {
    return res
      .status(500)
      .send({ message: error.message || "Erreur lors de la suppression du fichier." });
  }
};
