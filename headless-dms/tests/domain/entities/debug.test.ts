// Simple debug test
console.log('🔍 Debug: Test file is being executed');

async function debugTest() {
  console.log('🔍 Debug: Inside debugTest function');
  return 'success';
}

console.log('🔍 Debug: About to call debugTest');
debugTest().then(result => {
  console.log('🔍 Debug: debugTest result:', result);
}).catch(error => {
  console.log('🔍 Debug: debugTest error:', error);
});

console.log('🔍 Debug: Test file execution complete'); 