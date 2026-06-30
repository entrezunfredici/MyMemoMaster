# =============================================================================
#  helm-migrate.ps1 — Adoption des ressources existantes par Helm
#
#  A exécuter UNE SEULE FOIS avant le premier déploiement via helm upgrade.
#  Sans cette étape, Helm refusera de gérer des ressources déjà présentes.
#
#  Prérequis : kubectl configuré sur le bon cluster (kubeconfig actif).
#
#  Usage :
#    .\k8s\helm-migrate.ps1 preprod
#    .\k8s\helm-migrate.ps1 prod
# =============================================================================

param(
    [Parameter(Mandatory)]
    [ValidateSet("preprod", "prod")]
    [string]$Env
)

if ($Env -eq "preprod") {
    $release = "mmm-preprod"
    $ns      = "mymemomaster-preprod"
} else {
    $release = "mmm-prod"
    $ns      = "mymemomaster"
}

function Annotate-Resource($kind, $name) {
    $exists = kubectl get $kind $name -n $ns 2>$null
    if ($LASTEXITCODE -eq 0) {
        kubectl annotate $kind $name -n $ns `
            "meta.helm.sh/release-name=$release" `
            "meta.helm.sh/release-namespace=$ns" `
            --overwrite | Out-Null
        kubectl label $kind $name -n $ns `
            "app.kubernetes.io/managed-by=Helm" `
            --overwrite | Out-Null
        Write-Host "  [OK] $kind/$name" -ForegroundColor Green
    } else {
        Write-Host "  [-] $kind/$name introuvable — ignoré" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Migration vers Helm — release: $release  namespace: $ns" -ForegroundColor Green
Write-Host ""

$components = @("postgres", "redis", "api", "front")
if ($Env -eq "preprod") { $components += "pgadmin" }

foreach ($comp in $components) {
    $name = "$release-$comp"
    # Tente StatefulSet d'abord, sinon Deployment
    $ss = kubectl get statefulset $name -n $ns 2>$null
    if ($LASTEXITCODE -eq 0) {
        Annotate-Resource "statefulset" $name
    } else {
        Annotate-Resource "deployment" $name
    }
    Annotate-Resource "service" $name
    # Ingress — ignoré silencieusement s'il n'existe pas
    $ing = kubectl get ingress $name -n $ns 2>$null
    if ($LASTEXITCODE -eq 0) {
        Annotate-Resource "ingress" $name
    }
}

Annotate-Resource "configmap" "$release-config"

Write-Host ""
Write-Host "Migration terminée. Lance maintenant le premier déploiement Helm :" -ForegroundColor Green
Write-Host ""
if ($Env -eq "preprod") {
    Write-Host "  helm upgrade --install $release ./helm ``"
    Write-Host "    -f helm/values-preprod.yaml ``"
    Write-Host "    -n $ns ``"
    Write-Host "    --set rolloutTimestamp=`$(Get-Date -UFormat %s) ``"
    Write-Host "    --atomic --timeout 3m"
} else {
    Write-Host "  helm upgrade --install $release ./helm ``"
    Write-Host "    -f helm/values-prod.yaml ``"
    Write-Host "    -n $ns ``"
    Write-Host "    --set rolloutTimestamp=`$(Get-Date -UFormat %s) ``"
    Write-Host "    --atomic --timeout 5m"
}
Write-Host ""
