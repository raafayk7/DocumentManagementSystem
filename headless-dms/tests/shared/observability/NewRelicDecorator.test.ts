import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { NewRelicDecorator } from '../../../src/shared/observability/NewRelicDecorator.js';

describe('NewRelicDecorator', () => {
  let consoleLogStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub console methods to prevent output during tests
    consoleLogStub = sinon.stub(console, 'log');
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    // Restore stubs
    consoleLogStub.restore();
    consoleWarnStub.restore();
  });

  describe('wrapFunction', () => {
    it('should wrap function successfully', async () => {
      const testFunction = async (x: number, y: number): Promise<number> => {
        return x + y;
      };

      const wrappedFunction = NewRelicDecorator.wrapFunction(
        'TestOperation',
        testFunction
      );

      const result = await wrappedFunction(5, 3);
      expect(result).to.equal(8);
    });

    it('should handle function errors', async () => {
      const errorFunction = async (): Promise<never> => {
        throw new Error('Test error');
      };

      const wrappedFunction = NewRelicDecorator.wrapFunction(
        'ErrorOperation',
        errorFunction
      );

      try {
        await wrappedFunction();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Test error');
      }
    });
  });

  describe('instrument', () => {
    it('should have instrument method available', () => {
      expect(NewRelicDecorator.instrument).to.be.a('function');
    });
  });
});
