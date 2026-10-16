# HTTPS Setup — MyMemoMaster

> Ce document décrit comment mettre en place HTTPS (Let's Encrypt + HSTS + redirect HTTP→HTTPS)
> sur deux environnements : **VPS Docker** et **Kubernetes**.

---

## Vue d'ensemble

| | VPS Docker | Kubernetes |
|-|-----------|------------|
| Reverse proxy | Traefik v3 (Docker Compose) | Traefik (Helm) |
| Certificats TLS | Let's Encrypt via Traefik ACME | Let's Encrypt via cert-manager |
| HSTS | Labels Docker Compose | Middleware Traefik CRD |
| Redirect HTTP→HTTPS | Labels Docker Compose | Middleware Traefik CRD + Ingress HTTP |
| Automatisation | `scripts/setup-traefik.sh` | `k8s/setup.sh` |
| Config HTTPS app | `docker-compose.yml` (racine, profil `test`) | `k8s/app/ingress.yml` |

---

## VPS Docker

### Architecture

```
Internet
  │
  ├── :80  → Traefik → redirect 301 → :443  (pour tous les domaines)
  └── :443 → Traefik → TLS termination (cert Let's Encrypt)
               ├── api.domain.com  → container API  :3000
               └── app.domain.com  → container Front :80
```

Traefik est un conteneur Docker dédié qui tourne **indépendamment** du compose applicatif. Il partage le réseau Docker `traefik_proxy` avec les conteneurs de l'app.

### Installation (one-shot)

```bash
# Sur le VPS, depuis le répertoire du projet cloné :
bash scripts/setup-traefik.sh --email your@email.com
```

Le script :
1. Crée le réseau Docker `traefik_proxy`
2. Génère `/opt/traefik/docker-compose.yml` + `.env`
3. Démarre Traefik (image `traefik:v3.0`)
4. Vérifie que le conteneur est `healthy`

#### Options

```bash
bash scripts/setup-traefik.sh \
  --email  your@email.com \     # (obligatoire) email Let's Encrypt
  --dir    /opt/traefik \       # répertoire d'installation (défaut: /opt/traefik)
  --log    INFO                 # niveau de log Traefik (DEBUG/INFO/WARN/ERROR)
```

#### Variables d'environnement alternatives

```bash
LETSENCRYPT_EMAIL=your@email.com \
TRAEFIK_LOG_LEVEL=INFO \
bash scripts/setup-traefik.sh
```

### Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `traefik/docker-compose.yml` | Compose Traefik (copié sur le VPS par le script) |
| `traefik/.env.example` | Template de config Traefik |
| `docker-compose.yml` (racine, profil `test`) | Compose applicatif (HSTS + redirect via labels) |

### Comment les certificats sont générés

1. Premier accès HTTP sur `api.domain.com` → Traefik reçoit la requête
2. Traefik détecte la règle `tls.certresolver=letsencrypt` pour ce domaine
3. Let's Encrypt envoie un challenge HTTP-01 sur `/.well-known/acme-challenge/`
4. Traefik répond au challenge (sans redirect car il intercepte avant)
5. Let's Encrypt délivre le certificat → stocké dans le volume `traefik_letsencrypt`
6. Renouvellement automatique 30 jours avant expiration

### Vérification

```bash
# Status Traefik
docker ps | grep traefik
docker logs traefik --tail=50

# Certificats (dans le volume)
docker exec traefik cat /letsencrypt/acme.json | python3 -m json.tool | grep '"domain"'

# Tester le redirect HTTP → HTTPS
curl -I http://api.domain.com
# Attendu : HTTP/1.1 301 Moved Permanently + Location: https://...

# Tester HSTS
curl -I https://api.domain.com
# Attendu : Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Dashboard Traefik (optionnel)

```bash
# 1. Générer le hash bcrypt du mot de passe
echo $(htpasswd -nB admin) | sed -e s/\\$/\\$\\$/g
# Copier le résultat dans TRAEFIK_DASHBOARD_AUTH

# 2. Éditer /opt/traefik/.env
TRAEFIK_DASHBOARD=true
TRAEFIK_DASHBOARD_DOMAIN=traefik.yourdomain.com
TRAEFIK_DASHBOARD_AUTH=admin:$$2y$$...

# 3. Redémarrer Traefik
cd /opt/traefik && docker compose --env-file .env up -d
```

### Prérequis côté serveur

- Docker 24+ et Docker Compose v2
- Ports **80** et **443** libres (aucun Apache/nginx sur ces ports)
- DNS configurés : tous les domaines (API, front, pgadmin) → IP du VPS **avant** de lancer

---

## Kubernetes

### Architecture

```
Internet
  │
  ├── :80  → Traefik ingress → Middleware https-redirect → 301 → :443
  └── :443 → Traefik ingress → TLS termination (cert géré par cert-manager)
               ├── api.domain.com  → Service mmm-api  :3000
               └── app.domain.com  → Service mmm-front :80
```

cert-manager tourne comme un opérateur k8s et renouvelle les certificats automatiquement.

### Installation (one-shot)

```bash
bash k8s/setup.sh \
  --email        your@email.com \
  --api-domain   api.yourdomain.com \
  --front-domain app.yourdomain.com
```

Le script installe dans cet ordre :
1. **Namespace** `mymemomaster`
2. **cert-manager** via Helm (namespace `cert-manager`)
3. **Traefik** ingress controller via Helm (namespace `traefik`)
4. **ClusterIssuer** staging + prod (Let's Encrypt)
5. **Middlewares** HSTS + redirect HTTP→HTTPS (CRDs Traefik)
6. **Ingress** API + Frontend avec TLS et annotations cert-manager

### Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `k8s/namespace.yml` | Namespace `mymemomaster` |
| `k8s/cert-manager/cluster-issuer.yml` | ClusterIssuer Let's Encrypt (staging + prod) |
| `k8s/traefik/values.yml` | Helm values Traefik ingress |
| `k8s/traefik/middleware-hsts.yml` | Middlewares HSTS + redirect (CRDs Traefik) |
| `k8s/app/ingress.yml` | Ingress API + Frontend avec TLS |
| `k8s/setup.sh` | Script d'installation complet |

### Tester avec le staging Let's Encrypt d'abord

Le staging Let's Encrypt ne délivre pas de "vrais" certificats (non reconnus par les navigateurs) mais ne bloque pas si le rate limit est atteint. Toujours tester avec le staging :

```bash
# Dans k8s/app/ingress.yml, changer :
cert-manager.io/cluster-issuer: letsencrypt-staging   # ← staging pour test

# Puis appliquer et vérifier
kubectl apply -f k8s/app/ingress.yml -n mymemomaster
kubectl describe certificate mmm-api-tls -n mymemomaster
# Chercher : "Certificate issued successfully"

# Une fois validé, passer en prod :
cert-manager.io/cluster-issuer: letsencrypt-prod
kubectl apply -f k8s/app/ingress.yml -n mymemomaster
```

### Vérification

```bash
# Ingress et LoadBalancer
kubectl get ingress -n mymemomaster
kubectl get svc traefik -n traefik   # noter l'EXTERNAL-IP

# Certificats
kubectl get certificate -n mymemomaster
kubectl describe certificate mmm-api-tls -n mymemomaster

# Logs cert-manager
kubectl logs -n cert-manager -l app=cert-manager --tail=50

# Logs Traefik
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=50

# Tester redirect + HSTS
curl -I http://api.yourdomain.com
curl -I https://api.yourdomain.com
```

### Mise à jour des domaines

Les domaines sont injectés par `k8s/setup.sh` via `sed`. Pour appliquer manuellement :

```bash
# Remplacer les domaines dans ingress.yml et appliquer
sed "s/api\.yourdomain\.com/api.domain.com/g; s/app\.yourdomain\.com/app.domain.com/g" \
  k8s/app/ingress.yml | kubectl apply -f - -n mymemomaster
```

### Prérequis

- `kubectl` configuré sur le cluster cible
- `helm` v3
- Cluster k8s avec support LoadBalancer (cloud provider ou MetalLB en bare-metal)
- DNS configurés vers l'IP du LoadBalancer Traefik **après** installation

---

## Comparaison des approches

| Aspect | VPS Docker | Kubernetes |
|--------|-----------|------------|
| Complexité | Faible — un compose, un script | Plus élevée — cert-manager + Traefik Helm |
| Renouvellement certs | Automatique (Traefik ACME) | Automatique (cert-manager) |
| Scalabilité | Mono-instance | Multi-pods, horizontal |
| Coût infra | VPS simple (5-20€/mois) | Cluster k8s (plus cher) |
| Adapté pour | MVP, preprod, prod simple | Prod haute dispo, multi-services |
| État de MyMemoMaster | **Utilisé** (deploy CD actif) | Prévu (k8s/ pas encore déployé) |
