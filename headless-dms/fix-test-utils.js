import fs from 'fs';
import path from 'path';

// Files that need fixing
const filesToFix = [
  'tests/domain/value-objects/datetime.value-object.test.ts',
  'tests/domain/value-objects/uuid.value-object.test.ts'
];

filesToFix.forEach(filePath => {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace AppResultTestUtils.expectOk with HexappResultTestUtils.expectOk
  content = content.replace(/AppResultTestUtils\.expectOk/g, 'HexappResultTestUtils.expectOk');
  
  // Replace AppResultTestUtils.expectErr with HexappResultTestUtils.expectErr
  content = content.replace(/AppResultTestUtils\.expectErr/g, 'HexappResultTestUtils.expectErr');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
});

console.log('Done!');
