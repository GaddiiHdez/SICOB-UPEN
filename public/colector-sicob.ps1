# ==============================================================================
# SCRIPT COLECTOR DE ESPECIFICACIONES TÉCNICAS - SICOB
# Universidad Politécnica del Estado de Nayarit
# ==============================================================================
# Este script recopila de forma segura y automatizada la información de hardware
# y sistema operativo de esta computadora para autocompletar su registro en SICOB.
#
# INSTRUCCIONES:
# 1. Ejecuta este script en la computadora que deseas registrar.
# 2. Generará un archivo llamado "sicob_specs_[SERIE].json" en tu Escritorio.
# 3. Sube el archivo JSON en el formulario de registro de SICOB para autocompletar la ficha.
# ==============================================================================

# Cambiar codificación para caracteres especiales
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=============================================" -ForegroundColor Green
Write-Host "      COLECTOR DE ESPECIFICACIONES SICOB     " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Analizando hardware del equipo, por favor espera..." -ForegroundColor Cyan

# 1. Obtener fabricante (marca) y modelo
$sysInfo = Get-CimInstance Win32_ComputerSystem
$marca = $sysInfo.Manufacturer.Trim()
$modelo = $sysInfo.Model.Trim()

# 2. Obtener número de serie del BIOS
$biosInfo = Get-CimInstance Win32_BIOS
$serial = $biosInfo.SerialNumber.Trim()

# 3. Obtener Procesador
$cpuInfo = Get-CimInstance Win32_Processor
$cpu = $cpuInfo.Name.Trim()

# 4. Obtener Memoria RAM en GB (redondeado)
$ramBytes = $sysInfo.TotalPhysicalMemory
$ramGB = [Math]::Round($ramBytes / 1GB)
$ram = "$ramGB GB"

# 5. Obtener almacenamiento (Discos duros y SSDs)
$diskInfo = Get-CimInstance Win32_DiskDrive
$disks = @()
foreach ($disk in $diskInfo) {
    $sizeGB = [Math]::Round($disk.Size / 1GB)
    $mediaType = "HDD"
    if ($disk.MediaType -like "*SSD*" -or $disk.Model -like "*SSD*" -or $disk.InterfaceType -eq "NVMe") {
        $mediaType = "SSD"
    }
    $disks += "$sizeGB GB $mediaType"
}
$almacenamiento = $disks -join " + "

# 6. Obtener Sistema Operativo
$osInfo = Get-CimInstance Win32_OperatingSystem
$so = $osInfo.Caption.Trim()

# Sugerir categoría
$categoria = "Cómputo"
if ($modelo -like "*Book*" -or $modelo -like "*Laptop*" -or $modelo -like "*Notebook*" -or $sysInfo.PCSystemType -eq 2) {
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

# 8. Exportar a JSON en el Escritorio
$desktopPath = [Environment]::GetFolderPath("Desktop")
$cleanSerial = $serial -replace '[^a-zA-Z0-9-]', ''
$fileName = "sicob_specs_$cleanSerial.json"
$filePath = Join-Path $desktopPath $fileName

$jsonString = ConvertTo-Json $output -Depth 4
[System.IO.File]::WriteAllText($filePath, $jsonString, [System.Text.Encoding]::UTF8)

Write-Host "`n✓ Análisis completado con éxito." -ForegroundColor Green
Write-Host "El archivo se guardó en tu Escritorio como:" -ForegroundColor Green
Write-Host " -> $fileName" -ForegroundColor Yellow
Write-Host "`nCarga este archivo en SICOB para autocompletar la información del equipo." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = [Console]::ReadKey($true)
