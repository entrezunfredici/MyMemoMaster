"""K8sDeployer — déploiement HTTPS sur Kubernetes via kubectl + helm."""

import os
import subprocess
import tempfile
from pathlib import Path

from .display import bold, green, step, ok, warn, fail, yellow

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class K8sDeployer:
    def __init__(self, config: dict):
        self.cfg       = config
        self.namespace = "mymemomaster"
        self.k8s_dir   = PROJECT_ROOT / "k8s"

    # ── Outils locaux ─────────────────────────────────────────────────────────

    @staticmethod
    def check_tools():
        """Vérifie que kubectl et helm sont disponibles dans le PATH."""
        for tool in ("kubectl", "helm"):
            try:
                subprocess.run([tool, "version", "--client"],
                               check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                fail(f"'{tool}' est requis mais introuvable dans le PATH.")

    @staticmethod
    def list_contexts() -> list[str]:
        """Retourne la liste des contextes kubectl disponibles."""
        try:
            result = subprocess.run(
                ["kubectl", "config", "get-contexts", "-o", "name"],
                check=True, text=True, capture_output=True,
            )
            ctxs = [c for c in result.stdout.strip().splitlines() if c]
            return ctxs if ctxs else ["(aucun contexte)"]
        except Exception:
            return ["(kubectl introuvable)"]

    # ── kubectl / helm ────────────────────────────────────────────────────────

    def _base_cmd(self, tool: str) -> list[str]:
        cmd = [tool]
        if ctx := self.cfg.get("context"):
            flag = "--context" if tool == "kubectl" else "--kube-context"
            cmd += [flag, ctx]
        return cmd

    def kubectl(self, args: list[str], check: bool = True,
                capture: bool = False) -> str:
        cmd = self._base_cmd("kubectl") + args
        print(f"    $ {' '.join(cmd)}")
        result = subprocess.run(cmd, check=check, text=True, capture_output=capture)
        return result.stdout if capture else ""

    def helm(self, args: list[str], check: bool = True):
        cmd = self._base_cmd("helm") + args
        print(f"    $ {' '.join(cmd)}")
        subprocess.run(cmd, check=check)

    def _helm_installed(self, release: str, namespace: str) -> bool:
        result = subprocess.run(
            ["helm", "status", release, "-n", namespace],
            check=False, capture_output=True,
        )
        return result.returncode == 0

    # ── Manifests ─────────────────────────────────────────────────────────────

    def apply_manifest(self, template: Path, subs: dict, namespace: str = None):
        """Applique un manifest YAML en substituant des marqueurs texte."""
        content = template.read_text(encoding="utf-8")
        for key, val in subs.items():
            content = content.replace(key, val)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml",
                                         delete=False, encoding="utf-8") as fh:
            fh.write(content)
            tmp = fh.name
        try:
            args = ["apply", "-f", tmp]
            if namespace:
                args += ["-n", namespace]
            self.kubectl(args)
        finally:
            os.unlink(tmp)

    # ── Déploiement ───────────────────────────────────────────────────────────

    def deploy(self):
        self._apply_namespace()
        self._install_cert_manager()
        self._install_traefik()
        self._apply_cluster_issuer()
        self._apply_middlewares()
        self._apply_ingress()
        self._print_summary()

    def _apply_namespace(self):
        step("Namespace mymemomaster")
        self.kubectl(["apply", "-f", str(self.k8s_dir / "namespace.yml")])

    def _install_cert_manager(self):
        version = self.cfg.get("cert_manager_version", "v1.14.5")
        step(f"cert-manager {version} (Helm)")
        self.helm(["repo", "add", "jetstack",
                   "https://charts.jetstack.io", "--force-update"])
        self.helm(["repo", "update"])
        cmd = "upgrade" if self._helm_installed("cert-manager", "cert-manager") else "install"
        self.helm([
            cmd, "cert-manager", "jetstack/cert-manager",
            "--namespace", "cert-manager", "--create-namespace",
            "--version", version,
            "--set", "crds.enabled=true",
        ])
        self.kubectl(["rollout", "status", "deployment/cert-manager",
                      "-n", "cert-manager", "--timeout=120s"])
        self.kubectl(["rollout", "status", "deployment/cert-manager-webhook",
                      "-n", "cert-manager", "--timeout=120s"])
        ok("cert-manager prêt.")

    def _install_traefik(self):
        step("Traefik ingress controller (Helm)")
        self.helm(["repo", "add", "traefik",
                   "https://traefik.github.io/charts", "--force-update"])
        self.helm(["repo", "update"])
        cmd = "upgrade" if self._helm_installed("traefik", "traefik") else "install"
        self.helm([
            cmd, "traefik", "traefik/traefik",
            "--namespace", "traefik", "--create-namespace",
            "-f", str(self.k8s_dir / "traefik" / "values.yml"),
        ])
        self.kubectl(["rollout", "status", "deployment/traefik",
                      "-n", "traefik", "--timeout=120s"])
        ok("Traefik prêt.")

    def _apply_cluster_issuer(self):
        step("ClusterIssuer Let's Encrypt")
        self.apply_manifest(
            self.k8s_dir / "cert-manager" / "cluster-issuer.yml",
            {"LETSENCRYPT_EMAIL": self.cfg["email"]},
        )

    def _apply_middlewares(self):
        step("Middlewares HSTS + redirect HTTP→HTTPS")
        self.kubectl(["apply", "-f",
                      str(self.k8s_dir / "traefik" / "middleware-hsts.yml")])

    def _apply_ingress(self):
        step("Ingress API + Frontend")
        issuer = ("letsencrypt-staging" if self.cfg.get("use_staging")
                  else "letsencrypt-prod")
        self.apply_manifest(
            self.k8s_dir / "app" / "ingress.yml",
            {
                "api.yourdomain.com": self.cfg["api_domain"],
                "app.yourdomain.com": self.cfg["front_domain"],
                "letsencrypt-prod":   issuer,
            },
            namespace=self.namespace,
        )

    def _print_summary(self):
        cfg    = self.cfg
        lb_ip  = self.kubectl(
            ["get", "svc", "traefik", "-n", "traefik",
             "-o", "jsonpath={.status.loadBalancer.ingress[0].ip}"],
            check=False, capture=True,
        ).strip() or "(en attente...)"
        issuer = "staging (test)" if cfg.get("use_staging") else "prod"

        print(f"""
{green('══════════════════════════════════════════════════════')}
  Déploiement k8s terminé
{green('══════════════════════════════════════════════════════')}

  LoadBalancer IP : {bold(lb_ip)}
  API             : https://{cfg['api_domain']}
  Frontend        : https://{cfg['front_domain']}
  Issuer          : {issuer}

  Vérifier les certificats :
    kubectl get certificate -n {self.namespace}
    kubectl describe certificate mmm-api-tls -n {self.namespace}

  Logs cert-manager (si problème) :
    kubectl logs -n cert-manager -l app=cert-manager --tail=50
""")
        if cfg.get("use_staging"):
            warn("STAGING utilisé — certificats non reconnus par les navigateurs.")
            warn("Repasser en prod dans k8s/app/ingress.yml quand les tests passent.")
