[CmdletBinding()]
param(
    # Tool-specific skill folders to keep in sync with the single source .agents/skills.
    # Add a folder here only after that tool's project-skill path has been confirmed.
    # Google Antigravity reads .agents/skills directly, so it needs no copy (skill-support-check, 2026-11-18).
    [string[]]$Targets = @('.claude/skills'),

    # Only compare; exit 1 when any copy differs from the source.
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$sourceRoot = Join-Path $repoRoot '.agents/skills'
$skills = Get-ChildItem -LiteralPath $sourceRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }
$drift = @()

foreach ($target in $Targets) {
    $targetRoot = Join-Path $repoRoot $target
    foreach ($skill in $skills) {
        $destDir = Join-Path $targetRoot $skill.Name
        Get-ChildItem -LiteralPath $skill.FullName -File -Recurse | ForEach-Object {
            $relative = $_.FullName.Substring($skill.FullName.Length).TrimStart('\', '/')
            $dest = Join-Path $destDir $relative
            $same = (Test-Path -LiteralPath $dest) -and ((Get-FileHash -LiteralPath $dest).Hash -eq (Get-FileHash -LiteralPath $_.FullName).Hash)
            if (-not $same) {
                if ($Check) {
                    $drift += "$target/$($skill.Name)/$relative"
                } else {
                    $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest)
                    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
                    Write-Output "synced $target/$($skill.Name)/$relative"
                }
            }
        }
    }
    # Copies whose source skill no longer exists.
    if (Test-Path -LiteralPath $targetRoot) {
        Get-ChildItem -LiteralPath $targetRoot -Directory | Where-Object { $skills.Name -notcontains $_.Name } | ForEach-Object {
            if ($Check) {
                $drift += "$target/$($_.Name) (no source)"
            } else {
                Write-Warning "Not removed automatically (no source in .agents/skills): $target/$($_.Name)"
            }
        }
    }
}

if ($Check) {
    if ($drift.Count -gt 0) {
        Write-Output 'Skill copies differ from .agents/skills:'
        $drift | ForEach-Object { Write-Output "  $_" }
        exit 1
    }
    Write-Output 'All skill copies match .agents/skills.'
}
