"""
make_jwt_secret.py — Génère une clé secrète JWT pour HS256/384/512.

Usage:
  python make_jwt_secret.py                # 256 bits, affiche la clé
  python make_jwt_secret.py --bits 512     # 512 bits
  python make_jwt_secret.py --env-file .env --env-name AUTH_JWT_SECRET
"""
import argparse
import base64
import secrets
from datetime import datetime

def gen_secret(bits: int = 256) -> dict:
    if bits not in (256, 384, 512):
        raise ValueError("bits doit être parmi {256, 384, 512}.")
    nbytes = bits // 8
    key_bytes = secrets.token_bytes(nbytes)
    # base64url sans padding (standard JWT)
    b64url = base64.urlsafe_b64encode(key_bytes).rstrip(b'=').decode('ascii')
    hexkey = key_bytes.hex()
    return {"bits": bits, "b64url": b64url, "hex": hexkey}

def main():
    ap = argparse.ArgumentParser(description="Générateur de clé secrète JWT (HS256/384/512).")
    ap.add_argument("--bits", type=int, default=256, help="Taille en bits (256, 384, 512). Défaut: 256")
    ap.add_argument("--env-file", type=str, help="Chemin d'un fichier .env à remplir (append).")
    ap.add_argument("--env-name", type=str, default="AUTH_JWT_SECRET", help="Nom de la variable .env. Défaut: AUTH_JWT_SECRET")
    args = ap.parse_args()

    secret = gen_secret(args.bits)
    print(f"[{datetime.utcnow().isoformat()}Z] Clé {secret['bits']} bits générée ✅")
    print("→ Base64URL (recommandé à coller dans .env) :")
    print(secret["b64url"])
    print("\n→ Hex (optionnel) :")
    print(secret["hex"])

    if args.env_file:
        line = f"{args.env_name}={secret['b64url']}\n"
        with open(args.env_file, "a", encoding="utf-8") as f:
            f.write(line)
        print(f"\nAjouté à {args.env_file} : {args.env_name}=<secret>")

if __name__ == "__main__":
    main()