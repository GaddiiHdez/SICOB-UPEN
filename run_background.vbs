Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Admin\Documents\antigravity\GDI UPEN"
WshShell.Run "npm run dev", 0, False
