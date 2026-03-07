param(
    [string]$BaseUrl = 'http://127.0.0.1:8000/backend',
    [switch]$ResetRateLimit,
    [int]$MaxInitFlood = 25,
    [int]$MaxValidationFlood = 30,
    [string]$ReportPath = '.\security-bot-check-report.txt'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Passed = 0
$script:Failed = 0
$script:Results = New-Object System.Collections.Generic.List[string]

function Write-Result {
    param(
        [bool]$Ok,
        [string]$Name,
        [string]$Detail
    )

    $status = if ($Ok) { 'PASS' } else { 'FAIL' }
    $line = "[$status] $Name - $Detail"
    $script:Results.Add($line)

    if ($Ok) {
        $script:Passed++
        Write-Host $line -ForegroundColor Green
    } else {
        $script:Failed++
        Write-Host $line -ForegroundColor Red
    }
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
        [hashtable]$Headers = $null
    )

    try {
        $params = @{ Uri = $Url; Method = $Method }
        if ($null -ne $Body) {
            $params['Body'] = ($Body | ConvertTo-Json -Compress)
            $params['ContentType'] = 'application/json'
        }
        if ($null -ne $Session) { $params['WebSession'] = $Session }
        if ($null -ne $Headers) { $params['Headers'] = $Headers }

        $resp = Invoke-WebRequest @params
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch { $json = [pscustomobject]@{} }

        return [pscustomobject]@{
            Status = [int]$resp.StatusCode
            Json = $json
            Headers = $resp.Headers
        }
    } catch {
        $response = $_.Exception.Response
        if ($null -eq $response) {
            throw
        }

        $status = [int]$response.StatusCode.value__
        $rawBody = ''
        try {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            $rawBody = $reader.ReadToEnd()
        } catch {
            $rawBody = ''
        }

        $json = $null
        try { $json = $rawBody | ConvertFrom-Json } catch { $json = [pscustomobject]@{} }

        return [pscustomobject]@{
            Status = $status
            Json = $json
            Headers = $response.Headers
        }
    }
}

if ($ResetRateLimit) {
    $ratePath = Join-Path $PSScriptRoot 'tmp\rate_limit'
    if (Test-Path $ratePath) {
        Remove-Item -Recurse -Force $ratePath
    }
}

Write-Host "Security tests starting on $BaseUrl" -ForegroundColor Cyan

$ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1) Method protection
$t1 = Invoke-JsonRequest -Method 'GET' -Url "$BaseUrl/InitCaptcha.php"
Write-Result -Ok ($t1.Status -eq 405) -Name 'InitCaptcha method guard' -Detail "status=$($t1.Status)"

# 2) Init flow
$init = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/InitCaptcha.php" -Body @{} -Session $ws
$initOk = (
    $init.Status -eq 200 -and
    $init.Json.success -eq $true -and
    -not [string]::IsNullOrWhiteSpace([string]$init.Json.csrf_token) -and
    -not [string]::IsNullOrWhiteSpace([string]$init.Json.captcha_session_id)
)
Write-Result -Ok $initOk -Name 'InitCaptcha success' -Detail "status=$($init.Status)"

$csrf = [string]$init.Json.csrf_token
$captchaSessionId = [string]$init.Json.captcha_session_id

# 3) CSRF format validation
$t3 = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/ValidateCaptcha.php" -Session $ws -Body @{
    csrf_token = 'bad'
    captcha_session_id = $captchaSessionId
    click_count = 1
}
Write-Result -Ok ($t3.Status -eq 400) -Name 'CSRF format validation' -Detail "status=$($t3.Status)"

# 4) Generate textbox with valid CSRF
$t4 = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/GenerateTextbox.php" -Session $ws -Body @{
    scenarioId = 'supermarket'
    targetWord = 'apple'
    clicksRequired = 3
    csrf_token = $csrf
    captcha_session_id = $captchaSessionId
}
$t4Ok = (
    $t4.Status -eq 200 -and
    $t4.Json.success -eq $true -and
    -not [string]::IsNullOrWhiteSpace([string]$t4.Json.csrf_token)
)
Write-Result -Ok $t4Ok -Name 'GenerateTextbox success' -Detail "status=$($t4.Status)"

# 5) CSRF replay protection (same token reused)
$t5 = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/GenerateTextbox.php" -Session $ws -Body @{
    scenarioId = 'supermarket'
    targetWord = 'apple'
    clicksRequired = 3
    csrf_token = $csrf
    captcha_session_id = $captchaSessionId
}
Write-Result -Ok ($t5.Status -eq 403) -Name 'CSRF replay blocked' -Detail "status=$($t5.Status)"

# 6) Bot flood on InitCaptcha with fresh requests
$initBlockedAt = -1
$initRetryAfter = ''
for ($i = 1; $i -le $MaxInitFlood; $i++) {
    $resp = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/InitCaptcha.php" -Body @{}
    if ($resp.Status -eq 429) {
        $initBlockedAt = $i
        $initRetryAfter = [string]$resp.Headers['Retry-After']
        break
    }
}
$initFloodOk = $initBlockedAt -gt 0
Write-Result -Ok $initFloodOk -Name 'Init flood blocked' -Detail "blocked_at=$initBlockedAt retry_after=$initRetryAfter"

# 7) Bot flood on ValidateCaptcha with fresh requests
$validateBlockedAt = -1
$validateRetryAfter = ''
for ($i = 1; $i -le $MaxValidationFlood; $i++) {
    $resp = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/ValidateCaptcha.php" -Body @{
        csrf_token = ('a' * 64)
        captcha_session_id = ('b' * 32)
        click_count = 1
    }
    if ($resp.Status -eq 429) {
        $validateBlockedAt = $i
        $validateRetryAfter = [string]$resp.Headers['Retry-After']
        break
    }
}
$validateFloodOk = $validateBlockedAt -gt 0
Write-Result -Ok $validateFloodOk -Name 'Validate flood blocked' -Detail "blocked_at=$validateBlockedAt retry_after=$validateRetryAfter"

# 8) X-Forwarded-For spoofing should not bypass limits when proxy headers are untrusted
$spoofBlocked = $false
$spoofResp = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/InitCaptcha.php" -Body @{} -Headers @{ 'X-Forwarded-For' = '203.0.113.99' }
if ($spoofResp.Status -eq 429) {
    $spoofBlocked = $true
}
Write-Result -Ok $spoofBlocked -Name 'XFF spoof bypass blocked' -Detail "status=$($spoofResp.Status)"

$summary = @(
    "",
    '=== SUMMARY ===',
    "Passed: $script:Passed",
    "Failed: $script:Failed",
    "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "BaseUrl: $BaseUrl",
    ''
)

$content = @()
$content += $script:Results
$content += $summary
Set-Content -Path $ReportPath -Value $content -Encoding UTF8

Write-Host "Report: $ReportPath" -ForegroundColor Cyan

if ($script:Failed -gt 0) {
    exit 1
}

exit 0

