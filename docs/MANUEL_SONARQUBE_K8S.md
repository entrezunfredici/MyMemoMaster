# Manuel de déploiement — SonarQube auto-hébergé (Kubernetes)

> **Périmètre** : instance SonarQube Community Build déployée sur le cluster Infomaniak `pck-dkoyol2`, namespace dédié `sonarqube`, chart [helm-sonarqube/](../helm-sonarqube/).
> **Non exposée sur Internet** : accès par `kubectl port-forward` uniquement.
> Analyse déclenchée par le job `sonarqube` de [.github/workflows/ci.yml](../.github/workflows/ci.yml).
> Pour le déploiement applicatif, voir [MANUEL_DEPLOIEMENT_KUBERNETES.md](MANUEL_DEPLOIEMENT_KUBERNETES.md).

---

## 1. Ce qui est déployé

| Composant | Type K8s | Notes |
|---|---|---|
| SonarQube | StatefulSet + 2 PVC (10 Gi data, 2 Gi extensions) | 1 réplique — contrainte de l'édition Community |
| PostgreSQL | StatefulSet + PVC (5 Gi) | Instance **dédiée**, distincte de celle de l'application |
| Services | 2 ClusterIP (`sonarqube:9000`, `sonarqube-postgres:5432`) | **Aucun Ingress** |
| Placement | `nodeSelector` + `tolerations` | Nœud dédié à l'outillage — voir §1 bis |

Chart **séparé** du chart applicatif `helm/` : SonarQube est un outil d'usine logicielle, pas un composant de MyMemoMaster. Le mélanger au chart de l'application le placerait sous le `ResourceQuota` de la preprod (6 Gi de limites, déjà calé au plus juste) et lierait son cycle de vie aux déploiements applicatifs.

Empreinte : **2 Gi de requests / 4 Gi de limites** pour SonarQube, plus 128 Mi / 512 Mi pour sa base. Mesure du 2026-08-28 : les trois nœuds du cluster ne réservaient que 13 à 24 % de leur mémoire allouable (5,6 Gi par nœud), l'instance tient sans pression.

---

## 1 bis. Placement : un nœud dédié à l'outillage

SonarQube réserve 2 Gi et peut en consommer 4 sur un nœud qui n'en alloue que 5,5. C'est le seul voisin réellement bruyant du cluster — la preprod, elle, est déjà tenue par son `ResourceQuota` et par la PriorityClass `mmm-preprod` qui la fait céder à la production. On isole donc **l'outillage**, pas les environnements.

```sh
bash k8s/node-topology.sh <nom-du-nœud> --dry-run   # vérifie et montre
bash k8s/node-topology.sh <nom-du-nœud>             # applique
bash k8s/node-topology.sh <nom-du-nœud> --revert    # annule
```

Le script pose deux choses, qui vont par paire :

| | Effet |
|---|---|
| label `workload=tooling` | le `nodeSelector` du chart y **oblige** SonarQube |
| taint `workload=tooling:NoSchedule` | **exclut** tout le reste du nœud |

L'un sans l'autre ne suffit pas : la toleration seule laisserait SonarQube atterrir n'importe où, le taint seul l'empêcherait d'entrer sur le nœud qu'on lui destine.

### Trois points à ne pas perdre de vue

**Un seul nœud est tainté, jamais les trois.** `ingress-nginx`, `cert-manager`, `coredns` et `metrics-server` sont des Deployments **sans toleration**. Tainter les trois nœuds les enfermerait tous sur le seul nœud qui les tolère — et comme le Service ingress est en `externalTrafficPolicy: Local`, le LoadBalancer Octavia ne route que vers les nœuds portant un pod ingress : **tout le trafic de production entrerait alors par le nœud d'outillage**. Le script refuse d'ailleurs de tourner sur un cluster de moins de 3 nœuds.

**La production n'est pas épinglée, et c'est volontaire.** `values-prod.yaml` déclare `api: 2, front: 2`, et [helm/templates/deployment-api.yaml](../helm/templates/deployment-api.yaml) porte déjà un `topologySpreadConstraints` (`maxSkew: 1` sur `kubernetes.io/hostname`) qui répartit les replicas sur des nœuds distincts. Les clouer sur un nœud unique annulerait cette redondance **et** bloquerait tout `kubectl drain` : le PDB `minAvailable: 1` de [helm/templates/pdb.yaml](../helm/templates/pdb.yaml) interdirait d'évincer le dernier pod, sans nœud de repli où le reprogrammer. À 3 nœuds, on peut avoir « prod isolée » **ou** « prod redondante », pas les deux — un 4ᵉ worker (12,15 €/mois) est la seule façon d'avoir les deux.

**`NoSchedule` n'expulse rien.** Les pods déjà en cours sur le nœud y restent ; ils migreront à leur prochain rollout. Aucune coupure au moment où l'on pose le taint.

### Vérifier

```sh
kubectl get nodes -L workload
kubectl -n sonarqube get pod -o wide   # doit être sur le nœud labellisé
```

Si SonarQube reste **`Pending`** avec `node(s) didn't match Pod's node affinity/selector` : aucun nœud ne porte le label. Soit lancer le script, soit vider `nodeSelector` et `tolerations` dans [helm-sonarqube/values.yaml](../helm-sonarqube/values.yaml) pour revenir à un placement libre.

---

## 2. Prérequis

1. `kubectl` (aligné sur la version du cluster, **v1.36.3**) et Helm ≥ 3.16.
2. Kubeconfig du cluster — voir [MANUEL_DEPLOIEMENT_KUBERNETES.md §2](MANUEL_DEPLOIEMENT_KUBERNETES.md).
3. Aucun DNS ni certificat à créer : pas d'Ingress.

---

## 3. Premier déploiement

### 3.1 Créer le Secret (une seule fois)

Même convention que le chart applicatif : le Secret est créé **à la main**, jamais committé.

```sh
cp helm-sonarqube/secrets.env.example helm-sonarqube/secrets.env
# renseigner PG_PASS avec un mot de passe fort, puis :

kubectl create namespace sonarqube
kubectl -n sonarqube create secret generic sonarqube-secrets \
  --from-env-file=helm-sonarqube/secrets.env
```

> ⚠️ `PG_PASS` est lu par PostgreSQL **au premier démarrage seulement** (`initdb`). Le modifier ensuite ne change pas le mot de passe dans la base et casse la connexion JDBC : il faut alors le changer aussi côté PostgreSQL (`ALTER USER sonar PASSWORD '…'`).

### 3.2 Déployer

```sh
helm upgrade --install sonarqube ./helm-sonarqube \
  -n sonarqube --create-namespace \
  --atomic --timeout 10m
```

`--timeout 10m` et non 5 min comme pour l'application : le premier démarrage migre le schéma de base **et** construit l'index Elasticsearch. Compter 3 à 5 minutes.

### 3.3 Suivre le démarrage

```sh
kubectl -n sonarqube get pods -w
kubectl -n sonarqube logs -f sonarqube-0
```

Le pod est prêt quand `/api/system/status` renvoie `UP` (voir §5).

---

## 4. Accès à l'interface

```sh
kubectl -n sonarqube port-forward svc/sonarqube 9000:9000
```

Puis <http://localhost:9000>.

**Au tout premier accès, faire immédiatement ces trois choses :**

1. Se connecter avec `admin` / `admin` et **changer le mot de passe** (SonarQube l'impose).
2. Créer le projet avec la clé **exacte** `entrezunfredici_MyMemoMaster` (celle de [sonar-project.properties](../sonar-project.properties)) — sinon l'analyse CI créera un second projet vide.
3. Générer un token *Global Analysis* (**Administration → Security → Users → Tokens**) et le poser dans le secret GitHub `SONAR_TOKEN` (voir §6).

---

## 5. Vérifications utiles

```sh
# État interne de SonarQube (nécessite le port-forward ouvert)
curl -s http://localhost:9000/api/system/status
# → {"status":"UP"} quand l'instance est réellement prête

# Volumes provisionnés
kubectl -n sonarqube get pvc

# Le sysctl a-t-il bien été appliqué au nœud ?
kubectl -n sonarqube logs sonarqube-0 -c init-sysctl
```

---

## 6. Bascule de la CI

Le job `sonarqube` de la CI ne peut pas attaquer l'instance directement : elle est en ClusterIP, donc invisible depuis un runner GitHub. Le runner ouvre un `kubectl port-forward` vers l'**API Kubernetes** (elle, publique et authentifiée par kubeconfig) et pointe le scanner sur `127.0.0.1:9000`.

Deux secrets GitHub à renseigner (**Settings → Secrets and variables → Actions**) :

| Secret | Valeur |
|---|---|
| `SONAR_TOKEN` | Token *Global Analysis* généré dans l'instance (§4.3). **L'ancien token sonarcloud.io ne vaut plus rien.** |
| `KUBECONFIG_SONAR` | Kubeconfig en base64 du cluster. Même contenu que `KUBECONFIG_PREPROD` tant que les deux vivent sur le même cluster : `base64 -w0 k8s/kubeconfig/pck-dkoyol2-kubeconfig` |

Deux points structurants hérités de ce montage :

- **L'analyse reste limitée à `main`.** Ce n'était plus une contrainte de licence sur SonarCloud, c'en est une ici : l'analyse multi-branches est absente de l'édition Community.
- **Une CI sur `main` dépend désormais de la disponibilité du cluster.** Si l'instance est arrêtée, le job échoue au lieu d'être simplement sauté. C'est la contrepartie directe de l'auto-hébergement, et c'est exactement ce qui avait motivé le passage à SonarCloud en juillet 2026 (voir [.agents/DECISIONS.md](../.agents/DECISIONS.md)).

---

## 7. Exploitation

### Montée de version

**Une montée de version majeure migre le schéma de base de façon irréversible.** Avant tout changement de `image.tag` :

```sh
# 1. Sauvegarder la base
kubectl -n sonarqube exec sonarqube-postgres-0 -- \
  pg_dump -U sonar sonar > sonar-$(date +%F).sql

# 2. Vérifier le chemin de migration supporté sur
#    https://docs.sonarsource.com/sonarqube-community-build/server-upgrade-and-update/
# 3. Modifier image.tag dans helm-sonarqube/values.yaml, puis helm upgrade
```

Le tag est épinglé (`26.8.0.126808-community`) et jamais flottant (`:latest`, `:community`) précisément pour qu'aucun redémarrage de pod ne déclenche une migration non voulue.

### Arrêt temporaire (économie de ressources)

```sh
kubectl -n sonarqube scale statefulset sonarqube --replicas=0
# Les PVC et les données survivent. Le job CI échouera pendant l'arrêt.
```

### Suppression

```sh
helm uninstall sonarqube -n sonarqube
```

Les PVC ne sont **pas** supprimés par Helm (les `volumeClaimTemplates` d'un StatefulSet survivent), et la classe `csi-cinder-sc-retain` conserve en plus le volume Cinder après suppression du PVC. Choix volontaire : un `uninstall` accidentel ne doit pas effacer l'historique d'analyses. **Contrepartie : les volumes restent facturés** jusqu'à suppression manuelle dans OpenStack.

```sh
kubectl -n sonarqube get pvc          # lister avant de décider
kubectl -n sonarqube delete pvc --all # puis supprimer les volumes côté OpenStack
```

---

## 8. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| Pod `Init:CrashLoopBackOff` sur `init-sysctl` | Une politique Pod Security bloque le conteneur `privileged` | `--set sonarqube.sysctl.enabled=false --set sonarqube.esBootstrapChecksDisable=true` |
| `max virtual memory areas vm.max_map_count [65530] is too low` dans les logs | Le sysctl n'a pas été appliqué | Vérifier `kubectl -n sonarqube logs sonarqube-0 -c init-sysctl` |
| Pod bloqué en `Init:0/2` sur `wait-postgres` | La base ne démarre pas | `kubectl -n sonarqube logs sonarqube-postgres-0` |
| SonarQube redémarre en boucle après un changement de `PG_PASS` | Le mot de passe n'a changé que dans le Secret, pas dans la base | `ALTER USER sonar PASSWORD '…'` dans le pod PostgreSQL |
| Le job CI échoue sur `n'a pas répondu UP en 5 minutes` | Instance arrêtée, ou démarrage plus long que prévu | `kubectl -n sonarqube get pods` |
| L'analyse crée un projet vide dans l'instance | La clé de projet créée dans l'UI ne correspond pas à `sonar.projectKey` | Recréer le projet avec `entrezunfredici_MyMemoMaster` |

---

## 9. Dette connue

- ~~**Couverture de tests à 0 %**~~ — **corrigé le 2026-08-29** (action P0 de [COMPTE_RENDU_METRIQUES.md](COMPTE_RENDU_METRIQUES.md)). La CI produit désormais un `lcov` pour l'API (Jest, natif) et pour le front (`@vitest/coverage-v8`, ajouté), les transmet au job `sonarqube` par artefact, et `sonar.javascript.lcov.reportPaths` les déclare.

  **Piège à connaître si vous touchez à cette chaîne** : Jest et Vitest écrivent des chemins relatifs à **leur** racine (`src/App.vue`), alors que le scanner tourne à la racine du dépôt. L'étape `Normalise coverage paths` de la CI les préfixe. Sans elle, SonarQube ne rattache la couverture à aucun fichier et affiche **0 % sans lever la moindre erreur** — la panne est donc silencieuse et se confond avec « pas de rapport ».
- **Pas de NetworkPolicy.** Le cluster tourne sous Cilium ; en l'état, n'importe quel pod du cluster peut joindre `sonarqube:9000` et `sonarqube-postgres:5432`. Acceptable tant que le cluster n'héberge que ce projet.
- **Pas de sauvegarde automatisée** de la base SonarQube — le `pg_dump` du §7 est manuel.
- **Aucune supervision** : l'instance n'est pas scrapée par le Prometheus du chart applicatif (namespace différent).
