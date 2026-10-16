"""Prompts interactifs inquirer — collecte des informations VPS et Kubernetes."""

import sys

import inquirer

from .display import bold, yellow
from .k8s import K8sDeployer


def prompt_vps() -> dict:
    """Collecte les informations nécessaires au déploiement VPS."""
    print(f"\n{bold('── Informations serveur ───────────────────────────────')}")

    conn = inquirer.prompt([
        inquirer.Text("host", message="Adresse IP ou hostname"),
        inquirer.Text("port", message="Port SSH", default="22"),
        inquirer.Text("user", message="Utilisateur SSH", default="root"),
        inquirer.List("auth_method", message="Authentification",
                      choices=["Clé SSH", "Mot de passe"]),
    ])
    if conn is None:
        sys.exit(0)

    if conn["auth_method"] == "Clé SSH":
        auth = inquirer.prompt([
            inquirer.Text("key_path",
                          message="Chemin vers la clé privée",
                          default="~/.ssh/id_rsa"),
            inquirer.Password("key_passphrase",
                              message="Passphrase de la clé (Entrée si aucune)",
                              default=""),
        ])
    else:
        auth = inquirer.prompt([
            inquirer.Password("password", message="Mot de passe SSH"),
        ])
    if auth is None:
        sys.exit(0)

    print(f"\n{bold('── Configuration Traefik ──────────────────────────────')}")

    traefik = inquirer.prompt([
        inquirer.Text("email",
                      message="Email Let's Encrypt (notifications expiration)"),
        inquirer.Text("traefik_dir",
                      message="Répertoire Traefik sur le serveur",
                      default="/opt/traefik"),
        inquirer.List("log_level", message="Niveau de log Traefik",
                      choices=["INFO", "WARN", "ERROR", "DEBUG"],
                      default="INFO"),
        inquirer.Confirm("dashboard",
                         message="Activer le dashboard Traefik ?",
                         default=False),
    ])
    if traefik is None:
        sys.exit(0)

    dashboard_extras = {}
    if traefik.get("dashboard"):
        print(f"\n  {yellow('Générer le hash du mot de passe avec :')}")
        print("  echo $(htpasswd -nB admin) | sed -e s/\\\\$/\\\\$\\\\$/g")
        print("  (ou via Docker : docker run --rm httpd:2.4 htpasswd -nB admin)\n")
        dashboard_extras = inquirer.prompt([
            inquirer.Text("dashboard_domain",
                          message="Domaine du dashboard",
                          default="traefik.yourdomain.com"),
            inquirer.Text("dashboard_auth",
                          message="TRAEFIK_DASHBOARD_AUTH (hash bcrypt)",
                          default=""),
        ]) or {}

    return {**conn, **auth, **traefik, **dashboard_extras}


def prompt_k8s() -> dict:
    """Collecte les informations nécessaires au déploiement Kubernetes."""
    print(f"\n{bold('── Configuration Kubernetes ───────────────────────────')}")

    contexts = K8sDeployer.list_contexts()

    answers = inquirer.prompt([
        inquirer.List("context",
                      message="Contexte kubectl",
                      choices=contexts),
        inquirer.Text("email",
                      message="Email Let's Encrypt"),
        inquirer.Text("api_domain",
                      message="Domaine API   (ex: api.yourdomain.com)"),
        inquirer.Text("front_domain",
                      message="Domaine Front (ex: app.yourdomain.com)"),
        inquirer.Confirm("use_staging",
                         message="Utiliser le staging Let's Encrypt ? (recommandé pour un premier test)",
                         default=True),
        inquirer.Text("cert_manager_version",
                      message="Version cert-manager",
                      default="v1.14.5"),
    ])
    if answers is None:
        sys.exit(0)

    return answers


def confirm_summary(target: str, config: dict) -> bool:
    """Affiche le récapitulatif et demande confirmation avant déploiement."""
    print(f"\n{bold('── Récapitulatif ──────────────────────────────────────')}")

    if "VPS" in target:
        print(f"  Cible       : VPS {config['user']}@{config['host']}:{config['port']}")
        print(f"  Traefik dir : {config.get('traefik_dir', '/opt/traefik')}")
        print(f"  Email ACME  : {config['email']}")
        print(f"  Log level   : {config.get('log_level', 'INFO')}")
        dashboard = config.get("dashboard_domain", "") if config.get("dashboard") else "désactivé"
        print(f"  Dashboard   : {dashboard}")
    else:
        print(f"  Cible       : Kubernetes / contexte '{config['context']}'")
        print(f"  Email ACME  : {config['email']}")
        print(f"  API domain  : {config['api_domain']}")
        print(f"  Front domain: {config['front_domain']}")
        print(f"  Issuer      : {'staging (test)' if config.get('use_staging') else 'prod'}")
        print(f"  cert-manager: {config.get('cert_manager_version', 'v1.14.5')}")

    ans = inquirer.prompt([
        inquirer.Confirm("ok", message="Lancer le déploiement ?", default=True)
    ])
    return bool(ans and ans.get("ok"))
