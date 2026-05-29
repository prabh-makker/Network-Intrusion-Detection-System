# Schedule NIDS Auto-Correction to run daily at 2 AM
# Run this script with admin privileges

$taskName = "NIDS-Daily-Auto-Correct"
$scriptPath = "C:\Users\khalo\nids\backend\scripts\auto_correct_predictions_direct.py"
$pythonPath = "C:\Users\khalo\AppData\Local\Python\pythoncore-3.14-64\python.exe"

# Create trigger: Daily at 1 PM
$trigger = New-ScheduledTaskTrigger -Daily -At 1:00PM

# Create action: Run Python script
$action = New-ScheduledTaskAction `
    -Execute $pythonPath `
    -Argument $scriptPath `
    -WorkingDirectory "C:\Users\khalo\nids\backend"

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
$task = Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Auto-correct NIDS predictions daily for continuous learning" `
    -RunLevel Highest

Write-Host "Scheduled task created successfully!"
Write-Host "Task: $taskName"
Write-Host "Time: 1:00 PM daily"
Write-Host "Script: $scriptPath"
Write-Host ""
Write-Host "To run the task immediately for testing:"
Write-Host "Start-ScheduledTask -TaskName '$taskName'"
