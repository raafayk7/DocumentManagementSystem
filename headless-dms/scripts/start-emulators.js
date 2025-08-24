#!/usr/bin/env node

/**
 * Start Emulators Script
 * Starts LocalStack (S3) and Azurite (Azure) emulators for development
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const DOCKER_COMPOSE_FILE = 'docker-compose.emulators.yml';
const ENV_FILE = '.env.emulators';
const LOG_PREFIX = '[Emulator Setup]';

/**
 * Check if Docker is running
 */
function checkDocker() {
  return new Promise((resolve, reject) => {
    const docker = spawn('docker', ['version'], { stdio: 'pipe' });
    
    docker.on('close', (code) => {
      if (code === 0) {
        console.log(`${LOG_PREFIX} ✅ Docker is running`);
        resolve(true);
      } else {
        console.error(`${LOG_PREFIX} ❌ Docker is not running or not accessible`);
        reject(new Error('Docker not accessible'));
      }
    });
    
    docker.on('error', (error) => {
      console.error(`${LOG_PREFIX} ❌ Docker error:`, error.message);
      reject(error);
    });
  });
}

/**
 * Check if Docker Compose is available
 */
function checkDockerCompose() {
  return new Promise((resolve, reject) => {
    const compose = spawn('docker-compose', ['--version'], { stdio: 'pipe' });
    
    compose.on('close', (code) => {
      if (code === 0) {
        console.log(`${LOG_PREFIX} ✅ Docker Compose is available`);
        resolve(true);
      } else {
        console.error(`${LOG_PREFIX} ❌ Docker Compose is not available`);
        reject(new Error('Docker Compose not available'));
      }
    });
    
    compose.on('error', (error) => {
      console.error(`${LOG_PREFIX} ❌ Docker Compose error:`, error.message);
      reject(error);
    });
  });
}

/**
 * Create environment file if it doesn't exist
 */
function setupEnvironment() {
  const envPath = path.join(process.cwd(), ENV_FILE);
  const exampleEnvPath = path.join(process.cwd(), 'env.emulators.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(exampleEnvPath)) {
    console.log(`${LOG_PREFIX} 📝 Creating environment file from example...`);
    fs.copyFileSync(exampleEnvPath, envPath);
    console.log(`${LOG_PREFIX} ✅ Environment file created: ${ENV_FILE}`);
  } else if (fs.existsSync(envPath)) {
    console.log(`${LOG_PREFIX} ✅ Environment file already exists: ${ENV_FILE}`);
  } else {
    console.warn(`${LOG_PREFIX} ⚠️  No environment file found. Please create ${ENV_FILE}`);
  }
}

/**
 * Start emulators using Docker Compose
 */
function startEmulators() {
  return new Promise((resolve, reject) => {
    console.log(`${LOG_PREFIX} 🚀 Starting emulators...`);
    
    const compose = spawn('docker-compose', [
      '-f', DOCKER_COMPOSE_FILE,
      'up',
      '-d',
      '--remove-orphans'
    ], { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    compose.on('close', (code) => {
      if (code === 0) {
        console.log(`${LOG_PREFIX} ✅ Emulators started successfully`);
        resolve(true);
      } else {
        console.error(`${LOG_PREFIX} ❌ Failed to start emulators (exit code: ${code})`);
        reject(new Error(`Docker Compose failed with exit code ${code}`));
      }
    });
    
    compose.on('error', (error) => {
      console.error(`${LOG_PREFIX} ❌ Docker Compose error:`, error.message);
      reject(error);
    });
  });
}

/**
 * Wait for emulators to be ready
 */
function waitForEmulators() {
  return new Promise((resolve) => {
    console.log(`${LOG_PREFIX} ⏳ Waiting for emulators to be ready...`);
    
    // Wait 30 seconds for emulators to start
    setTimeout(() => {
      console.log(`${LOG_PREFIX} ✅ Emulators should be ready now`);
      resolve(true);
    }, 30000);
  });
}

/**
 * Display emulator information
 */
function displayEmulatorInfo() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 EMULATOR SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('📦 LocalStack (S3):');
  console.log('   • Endpoint: http://127.0.0.1:4566');
  console.log('   • Access Key: test');
  console.log('   • Secret Key: test');
  console.log('   • Region: us-east-1');
  console.log('');
  console.log('☁️  Azurite (Azure):');
  console.log('   • Endpoint: http://127.0.0.1:10000');
  console.log('   • Account: devstoreaccount1');
  console.log('   • Key: Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==');
  console.log('');
  console.log('🔧 Environment Variables:');
  console.log('   • USE_EMULATORS=true');
  console.log('   • LOCALSTACK_ENDPOINT=http://127.0.0.1:4566');
  console.log('   • AZURITE_ENDPOINT=http://127.0.0.1:10000');
  console.log('');
  console.log('📋 Useful Commands:');
  console.log('   • View logs: docker-compose -f docker-compose.emulators.yml logs -f');
  console.log('   • Stop emulators: docker-compose -f docker-compose.emulators.yml down');
  console.log('   • Restart: docker-compose -f docker-compose.emulators.yml restart');
  console.log('');
  console.log('🌐 Health Check Endpoints:');
  console.log('   • LocalStack: http://127.0.0.1:4566/health');
  console.log('   • Azurite: http://127.0.0.1:10000/health');
  console.log('');
  console.log('='.repeat(60));
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`${LOG_PREFIX} 🚀 Starting emulator setup...`);
    
    // Check prerequisites
    await checkDocker();
    await checkDockerCompose();
    
    // Setup environment
    setupEnvironment();
    
    // Start emulators
    await startEmulators();
    
    // Wait for emulators to be ready
    await waitForEmulators();
    
    // Display information
    displayEmulatorInfo();
    
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Setup failed:`, error.message);
    console.error(`${LOG_PREFIX} 💡 Make sure Docker is running and Docker Compose is installed`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkDocker,
  checkDockerCompose,
  setupEnvironment,
  startEmulators,
  waitForEmulators,
  displayEmulatorInfo,
};
