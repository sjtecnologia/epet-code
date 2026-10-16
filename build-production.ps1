# Script para Build de Producao - e-Pet
# Execute este script para fazer o build para a Google Play Store

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   e-Pet - Build de Producao" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "[ERRO] Execute este script na pasta raiz do projeto." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Verificando ambiente..." -ForegroundColor Yellow
Write-Host ""

try {
    $npmVersion = npm --version
    Write-Host "[OK] NPM instalado: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] NPM nao encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Verificando EAS CLI..." -ForegroundColor Yellow
try {
    $null = npx eas --version
    Write-Host "[OK] EAS CLI disponivel" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] EAS CLI nao encontrado. Sera instalado automaticamente pelo npx." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Passo 1: Verificar Codigo" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Verificando erros de TypeScript..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Existem erros de TypeScript. Corrija antes de continuar." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Codigo sem erros de TypeScript" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Passo 2: Login no EAS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Fazendo login no EAS..." -ForegroundColor Yellow
Write-Host "       Se nao tiver conta, sera solicitado criar." -ForegroundColor Gray
npx eas login

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha no login. Tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Login realizado com sucesso" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Passo 3: Selecionar Tipo de Build" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Escolha o tipo de build:" -ForegroundColor Yellow
Write-Host "  1. Preview (APK - para testes)" -ForegroundColor White
Write-Host "  2. Production (AAB - para Google Play Store) [RECOMENDADO]" -ForegroundColor White
Write-Host ""

$buildType = Read-Host "Digite 1 ou 2"

$profile = "production"
$platform = "android"

if ($buildType -eq "1") {
    $profile = "preview"
    Write-Host "[INFO] Build Preview (APK) selecionado" -ForegroundColor Cyan
} elseif ($buildType -eq "2") {
    $profile = "production"
    Write-Host "[INFO] Build Production (AAB) selecionado" -ForegroundColor Cyan
} else {
    Write-Host "[ERRO] Opcao invalida" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Passo 4: Iniciar Build" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Iniciando build. Isso pode levar 15-30 minutos..." -ForegroundColor Yellow
Write-Host "       Voce pode fechar esta janela, o build continua na nuvem." -ForegroundColor Gray
Write-Host ""

npx eas build --platform $platform --profile $profile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "   [OK] Build concluido com sucesso" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para baixar o arquivo de build:" -ForegroundColor Yellow
    Write-Host "  1. Acesse: https://expo.dev/" -ForegroundColor White
    Write-Host "  2. Faca login com sua conta" -ForegroundColor White
    Write-Host "  3. Va em Builds e baixe o arquivo" -ForegroundColor White
    Write-Host ""
    if ($profile -eq "production") {
        Write-Host "Arquivo gerado: .aab (Android App Bundle)" -ForegroundColor Cyan
        Write-Host "Proximo passo: upload no Google Play Console" -ForegroundColor Cyan
    } else {
        Write-Host "Arquivo gerado: .apk (Android Package)" -ForegroundColor Cyan
        Write-Host "Use este APK para testes em dispositivos" -ForegroundColor Cyan
    }
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERRO] Build falhou. Verifique os erros acima." -ForegroundColor Red
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  - Verifique sua conexao com a internet" -ForegroundColor White
    Write-Host "  - Certifique-se de que fez login no EAS" -ForegroundColor White
    Write-Host "  - Veja os logs detalhados em: https://expo.dev/" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "=====================================" -ForegroundColor Green
Write-Host "   Comandos Uteis" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ver lista de builds:" -ForegroundColor Yellow
Write-Host "  npx eas build:list" -ForegroundColor White
Write-Host ""
Write-Host "Ver detalhes de um build:" -ForegroundColor Yellow
Write-Host "  npx eas build:view [BUILD_ID]" -ForegroundColor White
Write-Host ""
Write-Host "Enviar para Google Play (apos criar na console):" -ForegroundColor Yellow
Write-Host "  npx eas submit --platform android" -ForegroundColor White
Write-Host ""
Write-Host "[OK] Script concluido" -ForegroundColor Green
