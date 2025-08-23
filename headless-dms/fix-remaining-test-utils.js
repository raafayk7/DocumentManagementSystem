const fs = require('fs');

// Fix the UUID test file
const uuidTestFile = 'tests/domain/value-objects/uuid.value-object.test.ts';
console.log(`Fixing ${uuidTestFile}...`);

let content = fs.readFileSync(uuidTestFile, 'utf8');

// Replace AppResultTestUtils.expectOk with HexappResultTestUtils.expectOk for hexapp Result types
content = content.replace(/AppResultTestUtils\.expectOk/g, 'HexappResultTestUtils.expectOk');

// Replace AppResultTestUtils.expectErr with HexappResultTestUtils.expectErr for hexapp Result types
content = content.replace(/AppResultTestUtils\.expectErr/g, 'HexappResultTestUtils.expectErr');

fs.writeFileSync(uuidTestFile, content, 'utf8');
console.log(`Fixed ${uuidTestFile}`);

console.log('Done!');
