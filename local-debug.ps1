<#
.SYNOPSIS
    Локальная отладка проекта LocalTea на Windows.

.DESCRIPTION
    Скрипт для разворачивания проекта локально через Docker Compose.
    Запускает все сервисы, восстанавливает бэкап БД, показывает статус.

.EXAMPLE
    # Полный запуск (все сервисы + восстановление бэкапа)
    .\local-debug.ps1

    # Только инфраструктура (БД + Redis) без приложения
    .\local-debug.ps1 -InfraOnly

    # Перезапуск с чистой БД
    .\local-debug.ps1 -Clean

    # Остановить всё
    .\local-debug.ps1 -Down

    # Показать логи
    .\local-debug.ps1 -Logs

    # Показать логи конкретного сервиса
    .\local-debug.ps1 -Logs -Service backend
#>

param(
    [switch]$InfraOnly,    # Запустить только БД и Redis
    [switch]$Clean,         # Удалить volumes и запустить заново
    [switch]$Down,          # Остановить все контейнеры
    [switch]$Logs,          # Показать логи
    [switch]$NoRestore,     # Не восстанавливать бэкап
    [switch]$RestoreOnly,   # Только восстановить бэкап
    [switch]$Watch,         # Запустить docker compose watch для фронтендов (hot reload)
    [string]$Service = ""   # Конкретный сервис для логов
)

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.local.yml"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($ProjectRoot -eq "") { $ProjectRoot = Get-Location }

# Перейти в корень проекта
Set-Location $ProjectRoot

# ─── Проверка зависимостей ─────────────────────────────────────
function Test-DockerRunning {
    try {
        $null = docker info 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-DockerCompose {
    try {
        $null = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) { return "docker compose" }
    } catch {}
    
    try {
        $null = docker-compose version 2>$null
        if ($LASTEXITCODE -eq 0) { return "docker-compose" }
    } catch {}
    
    Write-Error "Docker Compose не найден. Установите Docker Desktop."
    exit 1
}

# ─── Основные функции ──────────────────────────────────────────

function Invoke-DockerCompose {
    param([string[]]$Args)
    $dc = Get-DockerCompose
    $cmd = "$dc -f $ComposeFile $($Args -join ' ')"
    Write-Host "  > $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Write-Warning "Команда завершилась с кодом $LASTEXITCODE"
    }
}

function Start-Infrastructure {
    Write-Host "`n=== Запуск инфраструктуры (db, redis) ===" -ForegroundColor Cyan
    Invoke-DockerCompose @("up", "-d", "db", "redis")
    
    Write-Host "`nОжидание готовности PostgreSQL..." -ForegroundColor Yellow
    $maxWait = 30
    for ($i = 0; $i -lt $maxWait; $i++) {
        $result = docker compose -f $ComposeFile exec -T db pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PostgreSQL готов!" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    Write-Error "PostgreSQL не запустился за $($maxWait * 2) секунд"
}

function Restore-Backup {
    Write-Host "`n=== Восстановление бэкапа ===" -ForegroundColor Cyan
    
    if (Test-Path "scripts/restore_windows.py") {
        python scripts/restore_windows.py -latest
    } else {
        Write-Warning "Скрипт restore_windows.py не найден"
    }
}

function Start-AllServices {
    Write-Host "`n=== Запуск всех сервисов ===" -ForegroundColor Cyan
    Invoke-DockerCompose @("up", "-d", "--build")
}

function Stop-AllServices {
    Write-Host "`n=== Остановка всех сервисов ===" -ForegroundColor Cyan
    Invoke-DockerCompose @("down")
}

function Stop-CleanAll {
    Write-Host "`n=== Полная очистка (контейнеры + volumes) ===" -ForegroundColor Red
    Invoke-DockerCompose @("down", "-v", "--remove-orphans")
}

function Show-Logs {
    if ($Service) {
        Invoke-DockerCompose @("logs", "-f", "--tail=100", $Service)
    } else {
        Invoke-DockerCompose @("logs", "-f", "--tail=50")
    }
}

function Show-Status {
    Write-Host "`n=== Статус сервисов ===" -ForegroundColor Cyan
    Invoke-DockerCompose @("ps")
    
    Write-Host "`n=== Доступные адреса ===" -ForegroundColor Green
    Write-Host "  Backend API:        http://localhost:8000"
    Write-Host "  Backend API docs:   http://localhost:8000/docs"
    Write-Host "  Admin Backend:      http://localhost:8001"
    Write-Host "  Admin Backend docs: http://localhost:8001/docs"
    Write-Host "  User Frontend:      http://localhost:3000"
    Write-Host "  Admin Frontend:     http://localhost:3001"
    Write-Host "  Honeypot:           http://localhost:8002"
    Write-Host "  PgAdmin:            http://localhost:8003"
    Write-Host "    email: admin@localtea.ru / pass: admin"
    Write-Host "  PostgreSQL:         localhost:5432"
    Write-Host "  Redis:              localhost:6379"
    Write-Host ""
}

# ─── Создание локальных директорий ─────────────────────────────
function Initialize-LocalDirs {
    $dirs = @("uploads", "uploads/products", "uploads/categories", "uploads/blog")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Создана папка: $dir" -ForegroundColor DarkGray
        }
    }
}

# ─── Проверки ──────────────────────────────────────────────────
if (-not (Test-DockerRunning)) {
    Write-Error "Docker не запущен. Запустите Docker Desktop и попробуйте снова."
    exit 1
}

if (-not (Test-Path $ComposeFile)) {
    Write-Error "Файл $ComposeFile не найден. Запустите скрипт из корня проекта."
    exit 1
}

if (-not (Test-Path ".env.local")) {
    Write-Error "Файл .env.local не найден в корне проекта."
    exit 1
}

# ─── Выполнение ────────────────────────────────────────────────

if ($Down) {
    Stop-AllServices
    exit 0
}

if ($Logs) {
    Show-Logs
    exit 0
}

if ($Watch) {
    Write-Host "`n=== Запуск hot reload (docker compose watch) ===" -ForegroundColor Cyan
    Write-Host "  Файлы из user_frontend/src и admin_frontend/src" -ForegroundColor DarkGray
    Write-Host "  будут синхронизироваться в контейнеры при изменении." -ForegroundColor DarkGray
    Write-Host "  Нажмите Ctrl+C для остановки watch." -ForegroundColor Yellow
    Invoke-DockerCompose @("watch", "user_frontend", "admin_frontend")
    exit 0
}

if ($RestoreOnly) {
    Start-Infrastructure
    Restore-Backup
    exit 0
}

if ($Clean) {
    Stop-CleanAll
}

# Создать локальные директории
Initialize-LocalDirs

if ($InfraOnly) {
    Start-Infrastructure
    if (-not $NoRestore) {
        Restore-Backup
    }
    Show-Status
} else {
    Start-Infrastructure
    if (-not $NoRestore) {
        Restore-Backup
    }
    Start-AllServices
    Show-Status
}

Write-Host "Готово! Проект запущен для локальной отладки." -ForegroundColor Green
Write-Host "Для остановки:    .\local-debug.ps1 -Down" -ForegroundColor Yellow
Write-Host "Для логов:        .\local-debug.ps1 -Logs" -ForegroundColor Yellow
Write-Host "Логи сервиса:     .\local-debug.ps1 -Logs -Service backend" -ForegroundColor Yellow
Write-Host "Hot reload фронт: .\local-debug.ps1 -Watch" -ForegroundColor Yellow
