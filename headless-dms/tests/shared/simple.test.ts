import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Simple Shared Test', () => {
  it('should work with basic Mocha + Chai setup', () => {
    expect(1 + 1).to.equal(2);
  });

  it('should handle basic assertions', () => {
    const testString = 'hello world';
    expect(testString).to.be.a('string');
    expect(testString).to.include('hello');
  });
});
