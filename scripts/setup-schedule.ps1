# Script de PowerShell para registrar la tarea en el Programador de Tareas de Windows
param(
    [string]$HoraEjecucion = "09:00",
    [switch]$AlIniciarSesion
)

$TaskName = "EdgeRewardsDailyRPA"
$ProjectPath = (Get-Item "$PSScriptRoot\..").FullName
$BatPath = "$ProjectPath\EJECUTAR.bat"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Configuración de Tarea Programada en Windows" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Directorio del proyecto: $ProjectPath"
Write-Host "Archivo a ejecutar:      $BatPath"

if ($AlIniciarSesion) {
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    Write-Host "Disparador: Al iniciar sesión en Windows" -ForegroundColor Green
} else {
    $Trigger = New-ScheduledTaskTrigger -Daily -At $HoraEjecucion
    Write-Host "Disparador: Diario a las $HoraEjecucion" -ForegroundColor Green
}

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatPath`"" -WorkingDirectory $ProjectPath
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Registrar o actualizar la tarea
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings -Description "Automatización diaria de Microsoft Rewards y búsquedas en Edge"

Write-Host "`n✅ ¡Tarea programada '$TaskName' creada exitosamente!" -ForegroundColor Green
Write-Host "Puedes verificarla abriendo 'taskschd.msc' (Programador de tareas)." -ForegroundColor Yellow
