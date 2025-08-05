# send-sigterm.ps1
param(
    [string]$ProcessName = "node"
)

# Find the process
$processes = Get-Process | Where-Object {$_.ProcessName -eq $ProcessName}

if ($processes.Count -eq 0) {
    Write-Host "No $ProcessName processes found"
    exit 1
}

foreach ($process in $processes) {
    Write-Host "Found process: $($process.ProcessName) (PID: $($process.Id))"
    
    try {
        # Try to send SIGTERM using .NET
        $process.CloseMainWindow()
        Write-Host "Sent close signal to process $($process.Id)"
        
        # Wait a bit for graceful shutdown
        Start-Sleep -Seconds 2
        
        # Check if process is still running
        if (!$process.HasExited) {
            Write-Host "Process still running, forcing termination..."
            $process.Kill()
        }
        
        Write-Host "Process $($process.Id) terminated"
    }
    catch {
        Write-Host "Error terminating process $($process.Id): $($_.Exception.Message)"
    }
} 