// simple-test.js
import { UserValidator } from './src/domain/validators/UserValidator.ts';
import { DocumentValidator } from './src/domain/validators/DocumentValidator.ts';

console.log('Running simple tests...\n');

// Test UserValidator
console.log('=== UserValidator Tests ===');

// Test validatePassword
const passwordResult = UserValidator.validatePassword('password123');
console.log('validatePassword("password123"):', passwordResult.isOk() ? 'PASS' : 'FAIL');

const shortPasswordResult = UserValidator.validatePassword('short');
console.log('validatePassword("short"):', shortPasswordResult.isErr() ? 'PASS' : 'FAIL');

// Test validateRole
const roleResult = UserValidator.validateRole('user');
console.log('validateRole("user"):', roleResult.isOk() ? 'PASS' : 'FAIL');

const invalidRoleResult = UserValidator.validateRole('moderator');
console.log('validateRole("moderator"):', invalidRoleResult.isErr() ? 'PASS' : 'FAIL');

console.log('\n=== DocumentValidator Tests ===');

// Test validateName
const nameResult = DocumentValidator.validateName('Test Document');
console.log('validateName("Test Document"):', nameResult.isOk() ? 'PASS' : 'FAIL');

const emptyNameResult = DocumentValidator.validateName('');
console.log('validateName(""):', emptyNameResult.isErr() ? 'PASS' : 'FAIL');

// Test validateFileType
const fileTypeResult = DocumentValidator.validateFileType('text/plain');
console.log('validateFileType("text/plain"):', fileTypeResult.isOk() ? 'PASS' : 'FAIL');

const invalidFileTypeResult = DocumentValidator.validateFileType('application/exe');
console.log('validateFileType("application/exe"):', invalidFileTypeResult.isErr() ? 'PASS' : 'FAIL');

console.log('\nAll tests completed!');

const { User } = require('./dist/domain/entities/User.js');

console.log('Testing User.fromRepository...');

try {
  const userResult = User.fromRepository({
    id: 'user123',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log('User result:', userResult);
  console.log('Is Ok?', userResult.isOk());
  
  if (userResult.isOk()) {
    const user = userResult.unwrap();
    console.log('User created successfully:', user);
    console.log('User instanceof User:', user instanceof User);
  } else {
    console.log('Error creating user:', userResult.unwrapErr());
  }
} catch (error) {
  console.error('Error:', error);
} 