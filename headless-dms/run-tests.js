// run-tests.js
import { spawn } from 'child_process';

console.log('Running tests with experimental VM modules...');

const child = spawn('node', [
  '--experimental-vm-modules',
  'node_modules/jest/bin/jest.js',
  '--verbose'
], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`Tests finished with code ${code}`);
  process.exit(code);
}); 