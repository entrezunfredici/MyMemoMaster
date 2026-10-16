"""VPSDeployer — connexion SSH/SFTP et déploiement Traefik sur VPS Docker."""

import os
import time
from pathlib import Path

import inquirer
import paramiko

from .display import bold, green, step, ok, warn, fail, yellow

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class VPSDeployer:
    def __init__(self, config: dict):
        self.cfg    = config
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # ── Connexion ─────────────────────────────────────────────────────────────

    def connect(self):
        step("Connexion SSH")
        cfg    = self.cfg
        kwargs = {
            "hostname": cfg["host"],
            "port":     int(cfg["port"]),
            "username": cfg["user"],
            "timeout":  15,
        }
        if cfg["auth_method"] == "Clé SSH":
            kwargs["key_filename"] = os.path.expanduser(cfg["key_path"])
            if cfg.get("key_passphrase"):
                kwargs["passphrase"] = cfg["key_passphrase"]
        else:
            kwargs["password"] = cfg["password"]

        try:
            self.client.connect(**kwargs)
            ok(f"Connecté à {cfg['user']}@{cfg['host']}:{cfg['port']}")
        except Exception as exc:
            fail(f"Connexion SSH échouée : {exc}")

    # ── Exécution distante ────────────────────────────────────────────────────

    def run(self, cmd: str, check: bool = True) -> tuple[str, str, int]:
        print(f"    $ {cmd}")
        _, stdout, stderr = self.client.exec_command(cmd)
        out  = stdout.read().decode().strip()
        err  = stderr.read().decode().strip()
        code = stdout.channel.recv_exit_status()
        if out:
            print(f"      {out}")
        if err and code != 0:
            print(f"      {yellow(err)}")
        if check and code != 0:
            fail(f"Commande distante échouée (exit {code}) :\n    {cmd}")
        return out, err, code

    # ── Fichiers distants ─────────────────────────────────────────────────────

    def _sftp(self):
        return self.client.open_sftp()

    def upload_text(self, remote_path: str, content: str):
        parent = str(Path(remote_path).parent)
        self.run(f"mkdir -p {parent}")
        sftp = self._sftp()
        try:
            with sftp.open(remote_path, "w") as fh:
                fh.write(content)
            ok(f"↑ {remote_path}")
        finally:
            sftp.close()

    def upload_local(self, local: Path, remote: str):
        self.upload_text(remote, local.read_text(encoding="utf-8"))

    def remote_exists(self, path: str) -> bool:
        sftp = self._sftp()
        try:
            sftp.stat(path)
            return True
        except FileNotFoundError:
            return False
        finally:
            sftp.close()

    def read_remote(self, path: str) -> str:
        sftp = self._sftp()
        try:
            with sftp.open(path, "r") as fh:
                return fh.read().decode()
        finally:
            sftp.close()

    # ── Déploiement ───────────────────────────────────────────────────────────

    def deploy(self):
        cfg         = self.cfg
        traefik_dir = cfg.get("traefik_dir", "/opt/traefik")
        compose_dst = f"{traefik_dir}/docker-compose.yml"
        env_dst     = f"{traefik_dir}/.env"

        self._ensure_network()
        self._upload_compose(compose_dst)
        self._upload_env(env_dst, cfg)
        self._start_traefik(traefik_dir)
        self._verify()
        self.client.close()
        self._print_summary(cfg, traefik_dir)

    def _ensure_network(self):
        step("Réseau Docker 'traefik_proxy'")
        out, _, _ = self.run(
            "docker network ls --format '{{.Name}}' | grep -c '^traefik_proxy$' || true",
            check=False,
        )
        if out.strip() == "0":
            self.run("docker network create traefik_proxy")
            ok("Réseau créé.")
        else:
            ok("Réseau déjà existant — skip.")

    def _upload_compose(self, dst: str):
        step(f"docker-compose.yml → {dst}")
        local = PROJECT_ROOT / "traefik" / "docker-compose.yml"
        if not local.exists():
            fail(f"Fichier local introuvable : {local}")

        if self.remote_exists(dst):
            warn("Fichier déjà présent sur le serveur.")
            ans = inquirer.prompt([
                inquirer.Confirm("overwrite",
                                 message="Écraser le docker-compose.yml distant ?",
                                 default=True)
            ]) or {}
            if ans.get("overwrite", False):
                self.upload_local(local, dst)
            else:
                ok("Conservé — skip.")
        else:
            self.upload_local(local, dst)

    def _upload_env(self, dst: str, cfg: dict):
        step(f".env → {dst}")
        if self.remote_exists(dst):
            warn(".env déjà présent sur le serveur.")
            print()
            for line in self.read_remote(dst).splitlines():
                key = line.split("=")[0]
                if any(k in key for k in ("PASSWORD", "PASS", "SECRET", "AUTH")):
                    print(f"    {key}=***")
                else:
                    print(f"    {line}")
            print()
            ans = inquirer.prompt([
                inquirer.Confirm("overwrite",
                                 message="Écraser le .env distant ?",
                                 default=False)
            ]) or {}
            if not ans.get("overwrite", False):
                warn(".env conservé — vérifier manuellement si besoin.")
                return

        self.upload_text(dst, self._build_env(cfg))
        self.run(f"chmod 600 {dst}")
        ok(".env créé/mis à jour.")

    def _start_traefik(self, traefik_dir: str):
        step("Démarrage Traefik")
        self.run(f"cd {traefik_dir} && docker compose --env-file .env pull --quiet")
        self.run(f"cd {traefik_dir} && docker compose --env-file .env up -d")

    def _verify(self):
        step("Vérification")
        print("  Attente 8 secondes...")
        time.sleep(8)
        out, _, _ = self.run(
            "docker inspect traefik --format '{{.State.Status}}' 2>/dev/null || echo absent",
            check=False,
        )
        if "running" in out:
            ok("Traefik est démarré et opérationnel.")
        else:
            warn(f"Statut : {out} — vérifier avec : docker logs traefik")

    @staticmethod
    def _build_env(cfg: dict) -> str:
        lines = [
            f"LETSENCRYPT_EMAIL={cfg['email']}",
            f"TRAEFIK_DASHBOARD={'true' if cfg.get('dashboard') else 'false'}",
            f"TRAEFIK_DASHBOARD_DOMAIN={cfg.get('dashboard_domain', 'traefik.localhost')}",
            f"TRAEFIK_DASHBOARD_AUTH={cfg.get('dashboard_auth', 'admin:$$2y$$10$$disabled')}",
            f"TRAEFIK_LOG_LEVEL={cfg.get('log_level', 'INFO')}",
        ]
        return "\n".join(lines) + "\n"

    @staticmethod
    def _print_summary(cfg: dict, traefik_dir: str):
        dashboard_info = (
            "activé sur " + cfg.get("dashboard_domain", "")
            if cfg.get("dashboard") else "désactivé"
        )
        print(f"""
{green('══════════════════════════════════════════════════════')}
  Traefik déployé avec succès sur {cfg['host']}
{green('══════════════════════════════════════════════════════')}

  Répertoire  : {traefik_dir}
  Email ACME  : {cfg['email']}
  Dashboard   : {dashboard_info}

  Prochaine étape — lancer le compose applicatif :
    cd /var/www/html/my_memo_master_prod
    docker compose --env-file .env up -d

  {yellow("Les certificats Let's Encrypt sont générés au premier accès HTTPS.")}
""")
