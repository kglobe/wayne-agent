# Installs wayne-agent, a clone of the built-in agents sidebar with a wayne-mode progress line
# under each agent, and puts it in main-wintoast's sidebar. Re-run to update.
$ErrorActionPreference = 'Stop'
$app = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { "$env:USERPROFILE\.config\herdr-app" }
$herdr = "$env:LOCALAPPDATA\Programs\herdr-app\herdr-app.exe"

# A fresh clone of the built-in agents each run, so agents updates carry over.
$dir = "$app\mods\wayne-agent"
if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
& $herdr do mod.clone --name agents --as wayne-agent | Out-Null
if ($LASTEXITCODE) { throw 'mod.clone agents failed' }
Copy-Item "$PSScriptRoot\mods\wayne-agent\*.js" $dir -Force

$main = "$dir\main.js"
$js = [IO.File]::ReadAllText($main)
# Each patch must match exactly once, or the built-in agents changed under us.
$patches = @(
    @('(closeOverlay, props, window, layout \} from "herdr";)', '$1 import { startProgress, progressLine, withProgress } from "./progress.js";'),
    @('(cx\.timer\.every\(30000, \(cx\) => cx\.notify\(\)\);)', '$1 startProgress(this, cx);'),
    @('return h_flex\(\)(\r?\n\s*\.id\(`ag-\$\{a\.address\}`\)\r?\n\s*\.px\(8\)\r?\n\s*\.h\(30\))', 'return withProgress(progressLine(this, t, a, now), h_flex()$1'),
    @('(\.child\(this\.status\(t, a, byPriority && !isPinned\)\));', '$1);')
)
foreach ($p in $patches) {
    $n = [regex]::Matches($js, $p[0]).Count
    if ($n -ne 1) { throw "agents main.js changed: '$($p[0])' matched $n times in $main" }
    $js = [regex]::Replace($js, $p[0], $p[1])
}
[IO.File]::WriteAllText($main, $js)

$layout = "$app\layouts\main-wintoast.json"
if (-not (Test-Path $layout)) { throw "$layout not found: run herdr-notify-win's install.ps1 first" }
function Get-Nodes($node) { $node; foreach ($c in @($node.children)) { if ($null -ne $c) { Get-Nodes $c } } }
# [IO.File] reads and writes UTF-8 (no BOM) in both pwsh and Windows PowerShell 5.1.
$root = [IO.File]::ReadAllText($layout) | ConvertFrom-Json
Get-Nodes $root | Where-Object { $_.content.mod -eq 'agents' } | ForEach-Object { $_.content.mod = 'wayne-agent' }
[IO.File]::WriteAllText($layout, ($root | ConvertTo-Json -Depth 100))

& $herdr check $dir
if ($LASTEXITCODE) { throw 'herdr-app check wayne-agent failed' }
