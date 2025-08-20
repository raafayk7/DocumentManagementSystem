#!/usr/bin/env tsx

import { SeedManager } from './seed-manager.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const seedManager = new SeedManager();

  try {
    switch (command) {
      case 'run':
        console.log('🚀 Running seeds...');
        await seedManager.runSeeds();
        const summary = await seedManager.getSeedSummary();
        console.log('\n📊 Seed Summary:');
        console.log(`👥 Users: ${summary.userCount} (${summary.adminCount} admin)`);
        console.log(`🏷️ Tags: ${summary.tagCount}`);
        console.log(`📄 Documents: ${summary.documentCount}`);
        console.log(`📁 File Types: ${summary.fileTypes.join(', ')}`);
        break;

      case 'reset':
        console.log('🧹 Resetting seeds...');
        await seedManager.resetSeeds();
        break;

      case 'refresh':
        console.log('🔄 Refreshing seeds...');
        await seedManager.refreshSeeds();
        const refreshSummary = await seedManager.getSeedSummary();
        console.log('\n📊 Refresh Summary:');
        console.log(`👥 Users: ${refreshSummary.userCount} (${refreshSummary.adminCount} admin)`);
        console.log(`🏷️ Tags: ${refreshSummary.tagCount}`);
        console.log(`📄 Documents: ${refreshSummary.documentCount}`);
        console.log(`📁 File Types: ${refreshSummary.fileTypes.join(', ')}`);
        break;

      case 'clearAll':
        console.log('⚠️ Clearing ALL data from database...');
        await seedManager.clearAllData();
        break;

      case 'summary':
        const currentSummary = await seedManager.getSeedSummary();
        console.log('\n📊 Current Seed Summary:');
        console.log(`👥 Users: ${currentSummary.userCount} (${currentSummary.adminCount} admin)`);
        console.log(`🏷️ Tags: ${currentSummary.tagCount}`);
        console.log(`📄 Documents: ${currentSummary.documentCount}`);
        console.log(`📁 File Types: ${currentSummary.fileTypes.join(', ')}`);
        break;

      case 'help':
      default:
        console.log(`
🌱 Document Management System - Seed CLI

Usage: tsx seed-cli.ts [command]

Commands:
  run       Generate seed data (default)
  reset     Clear only seed-generated data (preserves manually created data)
  refresh   Clear seed data and regenerate
  clearAll  Clear ALL data from database (⚠️ use with caution!)
  summary   Show current seed data summary
  help      Show this help message

Examples:
  tsx seed-cli.ts run
  tsx seed-cli.ts reset
  tsx seed-cli.ts refresh
  tsx seed-cli.ts clearAll
  tsx seed-cli.ts summary
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Always run the main function
main(); 