# ==============================================================================
# SCRIPT COLECTOR DE ESPECIFICACIONES TECNICAS - SICOB
# Universidad Politecnica del Estado de Nayarit
# ==============================================================================
# Este script recopila de forma segura y automatizada la informacion de hardware
# y sistema operativo de esta computadora para autocompletar su registro en SICOB.
#
# INSTRUCCIONES:
# 1. Ejecuta este script en la computadora que deseas registrar.
# 2. Generara un archivo llamado "sicob_specs_[SERIE].json" en tu Escritorio.
# 3. Sube el archivo JSON en el formulario de registro de SICOB para autocompletar la ficha.
# ==============================================================================

# ==============================================================================
# CONFIGURACION DE AUTO-REGISTRO EN RED (USB Colectora)
# ==============================================================================
# Si deseas que el script envie directamente la informacion a la base de datos
# de SICOB por red local, configura la IP/URL de tu servidor y el token.
$SERVER_URL = "http://localhost:3000"   # Cambia por la direccion real de tu servidor (ej. "http://192.168.1.50:3000")
$API_TOKEN  = "UPEN_COLECTOR_SECRET_2026" # Debe coincidir con la clave del servidor
# ==============================================================================

# Cambiar codificacion para caracteres especiales
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=============================================" -ForegroundColor Green
Write-Host "      COLECTOR DE ESPECIFICACIONES SICOB     " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Analizando hardware del equipo, por favor espera..." -ForegroundColor Cyan

# 1. Obtener fabricante (marca) y modelo
$sysInfo = Get-CimInstance Win32_ComputerSystem
$marca = if ($sysInfo -and $sysInfo.Manufacturer) { $sysInfo.Manufacturer.Trim() } else { "Desconocido" }
$modelo = if ($sysInfo -and $sysInfo.Model) { $sysInfo.Model.Trim() } else { "Desconocido" }

# 2. Obtener numero de serie del BIOS
$biosInfo = Get-CimInstance Win32_BIOS
$serial = if ($biosInfo -and $biosInfo.SerialNumber) { $biosInfo.SerialNumber.Trim() } else { "S/N" }

# 3. Obtener Procesador
$cpuInfo = Get-CimInstance Win32_Processor
$cpu = if ($cpuInfo -and $cpuInfo.Name) { $cpuInfo.Name.Trim() } else { "Procesador Desconocido" }

# 4. Obtener Memoria RAM en GB (redondeado)
$ram = "N/A"
if ($sysInfo -and $sysInfo.TotalPhysicalMemory) {
    $ramBytes = $sysInfo.TotalPhysicalMemory
    $ramGB = [Math]::Round($ramBytes / 1GB)
    $ram = "$ramGB GB"
}

# 5. Obtener almacenamiento (Discos duros y SSDs internos)
$disks = @()
$physicalDisks = $null
try {
    $physicalDisks = Get-CimInstance -Namespace root/Microsoft/Windows/Storage -ClassName MSFT_PhysicalDisk -ErrorAction SilentlyContinue
} catch {}

$diskInfo = Get-CimInstance Win32_DiskDrive
if ($diskInfo) {
    foreach ($disk in $diskInfo) {
        # Ignorar unidades USB o extraibles (almacenamiento externo)
        $isExternal = $false
        if ($disk.InterfaceType -eq "USB" -or $disk.MediaType -like "*Removable*") {
            $isExternal = $true
        }
        if ($physicalDisks) {
            $pDisk = $physicalDisks | Where-Object { [string]$_.DeviceId -eq [string]$disk.Index }
            if ($pDisk -and $pDisk.BusType -eq 7) {
                $isExternal = $true
            }
        }
        
        # Omitir si es almacenamiento externo, a menos que sea el unico disco del sistema
        if ($isExternal -and $diskInfo.Count -gt 1) {
            continue
        }
        
        if ($disk.Size) {
            $sizeGB = [Math]::Round($disk.Size / 1GB)
            $mediaType = "HDD"
            $classified = $false
            
            # 1. Intentar clasificacion exacta usando MSFT_PhysicalDisk (Win 8+)
            if ($physicalDisks) {
                $pDisk = $physicalDisks | Where-Object { [string]$_.DeviceId -eq [string]$disk.Index }
                if ($pDisk) {
                    if ($pDisk.MediaType -eq 4) {
                        if ($pDisk.BusType -eq 17) {
                            $mediaType = "SSD NVMe"
                        } else {
                            $mediaType = "SSD"
                        }
                        $classified = $true
                    } elseif ($pDisk.MediaType -eq 3) {
                        $mediaType = "HDD"
                        $classified = $true
                    }
                }
            }
            
            # 2. Si no esta disponible o no se clasifico, usar heuristicas del modelo/PNP
            if (-not $classified) {
                $modelLower = if ($disk.Model) { $disk.Model.ToLower() } else { "" }
                $pnpLower = if ($disk.PNPDeviceID) { $disk.PNPDeviceID.ToLower() } else { "" }
                if ($modelLower -like "*nvme*" -or $pnpLower -like "*nvme*") {
                    $mediaType = "SSD NVMe"
                } elseif ($modelLower -like "*ssd*" -or $pnpLower -like "*ssd*" -or $disk.MediaType -like "*SSD*") {
                    $mediaType = "SSD"
                }
            }
            
            $disks += "$sizeGB GB $mediaType"
        }
    }
}
$almacenamiento = if ($disks.Count -gt 0) { $disks -join " + " } else { "Desconocido" }

# 6. Obtener Sistema Operativo
$osInfo = Get-CimInstance Win32_OperatingSystem
$so = if ($osInfo -and $osInfo.Caption) { $osInfo.Caption.Trim() } else { "Sistema Operativo Desconocido" }

# Sugerir categoria
$categoria = "Computo"
if ($modelo -and ($modelo -like "*Book*" -or $modelo -like "*Laptop*" -or $modelo -like "*Notebook*" -or ($sysInfo -and $sysInfo.PCSystemType -eq 2))) {
    $categoria = "Laptops"
}

# 7. Estructurar el objeto JSON
$specs = [ordered]@{
    "procesador"        = $cpu
    "ram"               = $ram
    "almacenamiento"    = $almacenamiento
    "sistema_operativo" = $so
}

$output = [ordered]@{
    "numero_serie"       = $serial
    "marca"              = $marca
    "modelo"             = $modelo
    "categoria_sugerida" = $categoria
    "descripcion"        = "Computadora marca $marca modelo $modelo, con procesador $cpu, $ram de RAM y SO $so. Registrada mediante agente colector."
    "especificaciones"   = $specs
}

# 8. Guardar JSON y/o enviar al Servidor por red
$jsonString = ConvertTo-Json $output -Depth 4

$submittedSuccessfully = $false
$assignedCode = ""
$errorMsg = ""

if ($SERVER_URL) {
    Write-Host "`nIntentando registrar el equipo directamente en el servidor SICOB ($SERVER_URL)..." -ForegroundColor Cyan
    
    $headers = @{
        "x-colector-token" = $API_TOKEN
        "Content-Type" = "application/json"
    }
    
    $uri = "$SERVER_URL/api/bienes/auto-registrar"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $jsonString -Headers $headers -TimeoutSec 10
        if ($response -and $response.bien) {
            $submittedSuccessfully = $true
            $assignedCode = $response.bien.codigo_inventario
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.InnerException) {
            $errorMsg += " | " + $_.Exception.InnerException.Message
        }
    }
}

if ($submittedSuccessfully) {
    Write-Host "`n[OK] Equipo registrado automaticamente en el servidor de forma exitosa!" -ForegroundColor Green
    Write-Host "Codigo de inventario asignado:" -ForegroundColor Green
    Write-Host " -> $assignedCode" -ForegroundColor Yellow
    Write-Host "`nEl equipo quedo guardado en estado 'En reserva' para su posterior clasificacion." -ForegroundColor Cyan
} else {
    if ($SERVER_URL) {
        Write-Host "`n[ADVERTENCIA] No se pudo conectar con el servidor para el auto-registro." -ForegroundColor Yellow
        Write-Host "Detalle: $errorMsg" -ForegroundColor DarkYellow
        Write-Host "Procediendo con la generacion del archivo local de respaldo..." -ForegroundColor Gray
    }
    
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $cleanSerial = $serial -replace '[^a-zA-Z0-9-]', ''
    $fileName = "sicob_specs_$cleanSerial.json"
    $filePath = Join-Path $desktopPath $fileName

    try {
        [System.IO.File]::WriteAllText($filePath, $jsonString, [System.Text.Encoding]::UTF8)
        Write-Host "`n[OK] Analisis completado con exito." -ForegroundColor Green
        Write-Host "El archivo se guardo en tu Escritorio como:" -ForegroundColor Green
        Write-Host " -> $fileName" -ForegroundColor Yellow
        Write-Host "`nCarga este archivo en SICOB para autocompletar la informacion del equipo." -ForegroundColor Cyan
    } catch {
        Write-Host "`n[ERROR] No se pudo guardar el archivo JSON de respaldo en el Escritorio." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "=============================================" -ForegroundColor Green
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
try {
    $null = [Console]::ReadKey($true)
} catch {
    # En entornos no interactivos o con entrada redireccionada, simplemente esperamos 2 segundos antes de cerrar
    Start-Sleep -Seconds 2
}
