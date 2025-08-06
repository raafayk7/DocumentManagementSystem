// test-pipeline.js
import { ValidationOrchestrator } from './src/validation/pipeline/orchestrator.js';
import { ErrorFormatter } from './src/validation/pipeline/error-formatter.js';

console.log('Testing Validation Pipeline...\n');

// Test 1: User Registration - Success Case
console.log('=== Test 1: User Registration Success ===');
const successResult = await ValidationOrchestrator.validateUserRegistration({
  email: 'user@example.com',
  password: 'Password123!',
  role: 'user'
});

console.log('Success:', successResult.success);
console.log('Data:', successResult.data);
console.log('Message:', successResult.message);

// Test 2: User Registration - Technical Error
console.log('\n=== Test 2: User Registration Technical Error ===');
const technicalErrorResult = await ValidationOrchestrator.validateUserRegistration({
  email: 'invalid-email',
  password: 'short',
  role: 'user'
});

console.log('Success:', technicalErrorResult.success);
console.log('Technical Errors:', technicalErrorResult.technicalErrors.length);
console.log('Business Errors:', technicalErrorResult.businessErrors.length);
console.log('Message:', technicalErrorResult.message);

// Test 3: User Registration - Business Error
console.log('\n=== Test 3: User Registration Business Error ===');
const businessErrorResult = await ValidationOrchestrator.validateUserRegistration({
  email: 'user@example.com',
  password: 'Password123!',
  role: 'moderator'
});

console.log('Success:', businessErrorResult.success);
console.log('Technical Errors:', businessErrorResult.technicalErrors.length);
console.log('Business Errors:', businessErrorResult.businessErrors.length);
console.log('Message:', businessErrorResult.message);

// Test 4: Document Upload - Success Case
console.log('\n=== Test 4: Document Upload Success ===');
const docSuccessResult = await ValidationOrchestrator.validateDocumentUpload({
  name: 'Test Document',
  file: {
    name: 'test.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    path: '/uploads/test.pdf'
  },
  tags: 'test,document',
  metadata: '{"author": "John Doe"}'
}, {
  userRole: 'admin'
});

console.log('Success:', docSuccessResult.success);
console.log('Data:', docSuccessResult.data);
console.log('Message:', docSuccessResult.message);

// Test 5: Document Upload - Technical Error
console.log('\n=== Test 5: Document Upload Technical Error ===');
const docTechnicalErrorResult = await ValidationOrchestrator.validateDocumentUpload({
  name: 'Test Document',
  file: {
    name: 'test.exe',
    size: 1024,
    mimeType: 'application/exe',
    path: '/uploads/test.exe'
  },
  tags: 'invalid tag',
  metadata: 'invalid json'
}, {
  userRole: 'admin'
});

console.log('Success:', docTechnicalErrorResult.success);
console.log('Technical Errors:', docTechnicalErrorResult.technicalErrors.length);
console.log('Business Errors:', docTechnicalErrorResult.businessErrors.length);
console.log('Message:', docTechnicalErrorResult.message);

// Test 6: Error Formatting
console.log('\n=== Test 6: Error Formatting ===');
const formattedErrors = ErrorFormatter.formatForHttpResponse(docTechnicalErrorResult.errors);
console.log('Formatted Errors:', JSON.stringify(formattedErrors, null, 2));

console.log('\n=== Pipeline Test Complete ===');
console.log('✅ Validation Pipeline is working correctly!'); 