Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Admin\Documents\antigravity\GDI UPEN"
WshShell.Run "npm run start", 0, False
