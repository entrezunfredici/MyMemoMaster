const userService = require('../services/User.service');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.findAll = async (req, res) => {
  try {
    const users = await userService.findAll();
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la récupération des utilisateurs." });
  }
};

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
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userService.create({ username, email, password: hashedPassword });
    res.status(201).send(newUser);
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de l'inscription." });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userService.findByUsername(username);

    if (!user) return res.status(404).send({ message: "Utilisateur introuvable." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send({ message: "Mot de passe incorrect." });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).send({ token });
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la connexion." });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.body;
    const newPassword = await bcrypt.hash(req.body.newPassword, 10);
    const success = await userService.updatePassword(id, newPassword);

    if (!success) return res.status(404).send({ message: "Utilisateur non trouvé." });
    res.status(200).send({ message: "Mot de passe modifié avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la modification du mot de passe." });
  }
};

exports.addRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const success = await userService.addRole(userId, roleId);
    res.status(200).send({ message: "Rôle ajouté avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de l'ajout du rôle." });
  }
};

exports.removeRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const success = await userService.removeRole(userId, roleId);
    res.status(200).send({ message: "Rôle supprimé avec succès." });
  } catch (error) {
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
    res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur." });
  }
};
