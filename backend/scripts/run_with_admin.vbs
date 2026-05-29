' VBScript to run PowerShell as Administrator
Set objShell = CreateObject("Shell.Application")
objShell.ShellExecute "powershell.exe", "-NoProfile -ExecutionPolicy Bypass -File ""C:\Users\khalo\nids\backend\scripts\schedule_auto_correct.ps1""", , "runas", 1
