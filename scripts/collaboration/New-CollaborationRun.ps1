[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Objective,

    [Parameter(Mandatory = $true)]
    [ValidateCount(1, 20)]
    [string[]]$AcceptanceCriteria,

    [string]$BaseRef = 'HEAD',

    [ValidateRange(1, 3)]
    [int]$MaxIterations = 3
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$worktreeRelativePath = ".worktrees/$RunId"
$worktreePath = Join-Path $repoRoot (Join-Path '.worktrees' $RunId)
$runPath = Join-Path $repoRoot (Join-Path 'artifacts' $RunId)
$branch = "collab/$RunId"

function Invoke-GitIn {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string[]]$GitArguments
    )

    $allArguments = @('-c', "safe.directory=$repoRoot", '-c', "safe.directory=$Directory", '-C', $Directory) + $GitArguments
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & git @allArguments 2>&1
    $ErrorActionPreference = $oldEAP
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArguments -join ' ') failed (exit $LASTEXITCODE): $($output -join "`n")"
    }
    return $output
}

function Invoke-RepoGit {
    param([Parameter(Mandatory = $true)][string[]]$GitArguments)

    return Invoke-GitIn -Directory $repoRoot -GitArguments $GitArguments
}

function Invoke-WorktreeGit {
    param([Parameter(Mandatory = $true)][string[]]$GitArguments)

    return Invoke-GitIn -Directory $worktreePath -GitArguments $GitArguments
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) {
    throw "Not a Git worktree: $repoRoot"
}

$status = Invoke-RepoGit -GitArguments @('status', '--porcelain', '--untracked-files=all')
if (-not [string]::IsNullOrWhiteSpace(($status -join "`n"))) {
    throw "Working tree is not clean. No files were stashed, copied, reset, or discarded. Commit or otherwise preserve the current changes before creating a run."
}

$baseResult = Invoke-RepoGit -GitArguments @('rev-parse', '--verify', '--end-of-options', "$BaseRef^{commit}")
$baseSha = ($baseResult | Select-Object -Last 1).Trim()
if (-not $baseSha) { throw "Could not resolve BaseRef '$BaseRef' to a commit." }

$branchResult = Invoke-RepoGit -GitArguments @('branch', '--list', $branch)
if (-not [string]::IsNullOrWhiteSpace(($branchResult -join "`n"))) {
    throw "Branch already exists: $branch"
}
if (Test-Path -LiteralPath $worktreePath) { throw "Worktree path already exists: $worktreePath" }
if (Test-Path -LiteralPath $runPath) { throw "Artifact run path already exists: $runPath" }

$null = New-Item -ItemType Directory -Path (Split-Path -Parent $worktreePath) -Force
Invoke-RepoGit -GitArguments @('worktree', 'add', '-b', $branch, $worktreePath, $baseSha) | Out-Null

# Once the isolated worktree exists, preserve it if manifest creation fails; never auto-reset or delete it.
# The manifest is written inside the new worktree and committed on the run branch, so the Maker sees it
# immediately and the primary worktree stays clean (an untracked file in the primary worktree would never
# reach the isolated worktree). base_sha stays the commit the branch was created from, not the manifest commit.
$workRunPath = Join-Path $worktreePath (Join-Path 'artifacts' $RunId)
if (Test-Path -LiteralPath $workRunPath) {
    throw "Run artifacts already exist at the base commit: $workRunPath. The worktree was preserved; choose a different run ID."
}
$iterationPath = Join-Path $workRunPath 'iteration-01'
$null = New-Item -ItemType Directory -Path $iterationPath -Force
$manifest = [ordered]@{
    schema_version = 1
    run_id = $RunId
    created_at = [DateTimeOffset]::UtcNow.ToString('o')
    objective = $Objective
    acceptance_criteria = @($AcceptanceCriteria)
    base_sha = $baseSha
    target_sha = $null
    branch = $branch
    worktree_path = $worktreeRelativePath
    max_iterations = $MaxIterations
    status = 'in_progress'
}
$tempManifest = Join-Path $workRunPath '.run.json.tmp'
$manifestPath = Join-Path $workRunPath 'run.json'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $tempManifest -Encoding utf8
Move-Item -LiteralPath $tempManifest -Destination $manifestPath

@"
# Iteration 01

Target SHA is recorded by Maker after implementation. Reviewer and Orchestrator must use that same SHA.
Write sanitized results to `review.json` and `test.json` using `artifacts/schemas/`.
Do not put raw logs, credentials, or personal data in shared result files.
"@ | Set-Content -LiteralPath (Join-Path $iterationPath 'README.md') -Encoding utf8

try {
    Invoke-WorktreeGit -GitArguments @('add', '--', "artifacts/$RunId") | Out-Null
    Invoke-WorktreeGit -GitArguments @('commit', '--only', '-m', "chore(collab): add $RunId run manifest", '--', "artifacts/$RunId") | Out-Null
} catch {
    throw "Worktree and manifest were created but the manifest commit failed; the worktree was preserved at $worktreePath. Commit artifacts/$RunId there manually. $($_.Exception.Message)"
}

Write-Output "Created isolated worktree: $worktreePath"
Write-Output "Created run manifest (committed on $branch): $manifestPath"
Write-Output "Branch: $branch"
