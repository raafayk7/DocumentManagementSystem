// test-signals.js
import { spawn } from 'child_process';

console.log('Testing signal sending on Windows...');

// Find the process ID
const findProcess = spawn('powershell', [
  '-Command',
  'Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object -ExpandProperty Id'
]);

findProcess.stdout.on('data', (data) => {
  const pid = data.toString().trim();
  if (pid) {
    console.log(`Found Node.js process with PID: ${pid}`);
    
    // Test different signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2'];
    
    signals.forEach(signal => {
      try {
        console.log(`Sending ${signal}...`);
        process.kill(parseInt(pid), signal);
        console.log(`✅ ${signal} sent successfully!`);
      } catch (error) {
        console.log(`❌ Error sending ${signal}: ${error.message}`);
      }
    });
    
    // Also test with numeric signal codes
    console.log('\nTesting with numeric signal codes...');
    const signalCodes = [15, 2, 10, 12]; // SIGTERM, SIGINT, SIGUSR1, SIGUSR2
    
    signalCodes.forEach(code => {
      try {
        console.log(`Sending signal code ${code}...`);
        process.kill(parseInt(pid), code);
        console.log(`✅ Signal code ${code} sent successfully!`);
      } catch (error) {
        console.log(`❌ Error sending signal code ${code}: ${error.message}`);
      }
    });
    
  } else {
    console.log('No Node.js process found');
  }
});

findProcess.stderr.on('data', (data) => {
  console.error('Error finding process:', data.toString());
}); 