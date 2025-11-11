const path = require("path");
const DiagrammeService = require("../services/Diagramme.service.js");

  exports.findAll = async (req, res) => {
    try {
      const responses = await DiagrammeService.findAll();
      res.status(200).json(responses);
    } catch (error) {
      res.status(500).send({
        message:
          error.message || "Une erreur s'est produite lors de la récupération des réponses",
      });
    }
  };

  exports.findOne = async (req, res) => {
    try {
      const response = await DiagrammeService.findOne(req.params.id);
      if (!response) {
        res.status(404).send({
          message: `Réponse introuvable pour l'identifiant ${req.params.id}.`,
        });
      }else{
        res.status(200).send(response);
      }
    } catch (error) {
      res.status(500).send({
        message: `Erreur lors de la récupération du diagramme avec l'identifiant ${req.params.id}.`,
        error: error.message
      });
    }
  };

exports.create = async (req, res) => {
  try {
    // Extraire les bonnes données du corps de la requête
    const { mmName, mindMapJson, userId, idSubject } = req.body;

    // Vérifier que tous les champs requis sont présents
    if (!mmName || !mindMapJson || !userId || !idSubject) {
      return res.status(400).json({ message: "Tous les champs (mmName, mindMapJson, userId, idSubject) sont requis."+mmName+ mindMapJson+ userId+ idSubject });
    }

    // Insérer les données dans la base de données
    const data = await DiagrammeService.create({ mmName, mindMapJson, userId, idSubject });

    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur lors de la création du diagramme :", error);
    res.status(500).json({
      message: "Une erreur s'est produite lors de la création du diagramme.",
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    // Vérifier que l'ID de la requête est valide
    const { id } = req.params;
    const { mmName, mindMapJson, userId } = req.body;

    // Vérification des champs nécessaires
    if (!mmName || !mindMapJson || !userId) {
      return res.status(400).json({ message: "Tous les champs (mmName, mindMapJson, userId) sont requis." });
    }

    // Appeler le service pour mettre à jour les données
    const updatedDiagramme = await DiagrammeService.update(id, {
      mmName,
      mindMapJson,
      userId
    });

    // Si le diagramme n'a pas été trouvé et mis à jour, retourner une erreur
    if (!updatedDiagramme) {
      return res.status(404).json({
        message: `Diagramme avec l'ID ${id} non trouvé ou déjà mis à jour.`
      });
    }

    // Retourner le diagramme mis à jour
    res.status(200).json(updatedDiagramme);
  } catch (error) {
    console.error("Erreur lors de la modification du diagramme :", error);
    res.status(500).json({
      message: "Une erreur s'est produite lors de la modification du diagramme.",
      error: error.message
    });
  }
};


exports.delete = async (req, res) => {
  try {
    // Extraire l'ID du diagramme à supprimer
    const { id } = req.params;

    // Vérifier si le diagramme existe avant de tenter de le supprimer
    const diagramme = await DiagrammeService.findById(id);

    // Si le diagramme n'existe pas, renvoyer une erreur 404
    if (!diagramme) {
      return res.status(404).json({
        message: `Diagramme avec l'ID ${id} non trouvé.`
      });
    }

    // Appeler la méthode delete du service pour supprimer le diagramme
    await DiagrammeService.delete(id);

    // Répondre avec un code 204 pour indiquer que la suppression a réussi
    res.status(204).send();
  } catch (error) {
    console.error("Erreur lors de la suppression du diagramme :", error);
    res.status(500).json({
      message: "Une erreur s'est produite lors de la suppression du diagramme.",
      error: error.message
    });
  }
};

exports.uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Aucune image n'a été envoyée.",
      });
    }

    const relativePath = path.join("uploads", "mindmaps", req.file.filename).replace(/\\/g, "/");
    const baseUrl = process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/${relativePath}`;

    return res.status(201).json({
      message: "Image téléchargée avec succès.",
      url,
      path: `/${relativePath}`,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Erreur lors de l'upload de l'image de carte mentale :", error);
    return res.status(500).json({
      message: "Une erreur s'est produite lors de l'upload de l'image.",
      error: error.message,
    });
  }
};
