const userService = require('../services/User.service');
const jwt = require('jsonwebtoken');

exports.findOne = async (req, res) => {
  try {
    const user = await userService.findOne(req.params.id);
    if (!user) return res.status(404).send({ message: "Utilisateur introuvable." });
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur." });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, password, email } = req.body;
    const user = await userService.create({ name, email, password });
    res.status(201).send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de l'inscription." });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.body;
    const updatedUser = await userService.update(id, req.body);
    res.status(200).send(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de la mise à jour de l'utilisateur." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userService.findByEmail(email);

    if (!user) return res.status(404).send({ message: "Utilisateur introuvable." });

    const isPasswordValid = await userService.verifyPassword(user.userId, password);
    if (!isPasswordValid) return res.status(401).send({ message: "Mot de passe incorrect." });

    const token = jwt.sign(
      { id: user.userId, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await userService.updateLoginDate(user.userId);

    res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de la connexion." });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.body;

    await userService.setPassword(id, req.body.newPassword);

    if (!success) return res.status(404).send({ message: "Utilisateur non trouvé." });
    res.status(200).send({ message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de la modification du mot de passe." });
  }
};

exports.addRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const success = await userService.addRole(userId, roleId);
    res.status(200).send({ message: "Rôle ajouté avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de l'ajout du rôle." });
  }
};

exports.removeRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const success = await userService.removeRole(userId, roleId);
    res.status(200).send({ message: "Rôle supprimé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de la suppression du rôle." });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id, requesterId } = req.body;
    const success = await userService.deleteUser(id, requesterId);
    if (!success) return res.status(403).send({ message: "Opération non autorisée." });
    res.status(200).send({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur." });
  }
};
