// send-sigterm.js
import { spawn } from 'child_process';

// Find the process ID
const findProcess = spawn('powershell', [
  '-Command',
  'Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object -ExpandProperty Id'
]);

findProcess.stdout.on('data', (data) => {
  const pid = data.toString().trim();
  if (pid) {
    console.log(`Found Node.js process with PID: ${pid}`);
    console.log('Sending SIGTERM...');
    
    // Send SIGTERM using Node.js
    try {
      process.kill(parseInt(pid), 'SIGTERM');
      console.log('SIGTERM sent successfully!');
    } catch (error) {
      console.error('Error sending SIGTERM:', error.message);
    }
  } else {
    console.log('No Node.js process found');
  }
});

findProcess.stderr.on('data', (data) => {
  console.error('Error finding process:', data.toString());
}); 