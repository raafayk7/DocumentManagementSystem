// Simple import test
import 'reflect-metadata';
console.log('🔍 Debug: Starting simple import test...');

try {
  console.log('🔍 Debug: About to import User...');
  const { User } = await import('../../../src/domain/entities/User.js');
  console.log('🔍 Debug: User imported successfully:', typeof User);
  console.log('🔍 Debug: User class name:', User.name);
  console.log('🔍 Debug: User has create method:', typeof User.create);
} catch (error) {
  console.log('❌ Import failed:', error);
}

console.log('🔍 Debug: Simple import test complete'); 