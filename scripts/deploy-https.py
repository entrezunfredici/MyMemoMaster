#!/usr/bin/env python3
"""
MyMemoMaster — Déploiement HTTPS interactif
Supporte : VPS Docker (Traefik) et Kubernetes (cert-manager + Traefik ingress)

Dépendances :
    pip install -r scripts/requirements-deploy.txt

Usage :
    python scripts/deploy-https.py

Python 3.9+ requis.
"""

import sys


# ─────────────────────────────────────────────────────────────────────────────
#  Vérification des dépendances Python (avant tout import du package deploy/)
# ─────────────────────────────────────────────────────────────────────────────

def _check_deps():
    missing = []
    for pkg in ("inquirer", "paramiko"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"\n[ERREUR] Dépendances Python manquantes : {', '.join(missing)}")
        print(f"  Installer avec : pip install {' '.join(missing)}\n")
        sys.exit(1)


_check_deps()

import inquirer                          # noqa: E402
from deploy.display import green         # noqa: E402
from deploy.vps import VPSDeployer       # noqa: E402
from deploy.k8s import K8sDeployer       # noqa: E402
from deploy.prompts import (             # noqa: E402
    prompt_vps,
    prompt_k8s,
    confirm_summary,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Point d'entrée
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print(f"""
{green('╔══════════════════════════════════════════════════════╗')}
{green('║')}   MyMemoMaster — Déploiement HTTPS interactif       {green('║')}
{green('╚══════════════════════════════════════════════════════╝')}
""")

    target_ans = inquirer.prompt([
        inquirer.List(
            "target",
            message="Cible de déploiement",
            choices=[
                "VPS Docker  — Traefik + Let's Encrypt",
                "Kubernetes  — cert-manager + Traefik ingress",
            ],
        )
    ])
    if target_ans is None:
        sys.exit(0)

    target = target_ans["target"]
    is_vps = "VPS" in target

    config = prompt_vps() if is_vps else prompt_k8s()

    if not confirm_summary(target, config):
        print("\nAnnulé.\n")
        sys.exit(0)

    try:
        if is_vps:
            deployer = VPSDeployer(config)
            deployer.connect()
            deployer.deploy()
        else:
            K8sDeployer.check_tools()
            K8sDeployer(config).deploy()
    except KeyboardInterrupt:
        print("\n\nInterrompu.\n")
        sys.exit(130)


if __name__ == "__main__":
    main()
