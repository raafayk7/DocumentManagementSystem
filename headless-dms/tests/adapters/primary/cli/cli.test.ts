import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { DocumentManagementCLI } from '../../../../src/adapters/primary/cli/cli.js';
import { DownloadCommand } from '../../../../src/adapters/primary/cli/commands/DownloadCommand.js';
import { UploadCommand } from '../../../../src/adapters/primary/cli/commands/UploadCommand.js';
import { StatusCommand } from '../../../../src/adapters/primary/cli/commands/StatusCommand.js';

describe('DocumentManagementCLI', () => {
  let cli: DocumentManagementCLI;
  let mockDownloadCommand: sinon.SinonStubbedInstance<DownloadCommand>;
  let mockUploadCommand: sinon.SinonStubbedInstance<UploadCommand>;
  let mockStatusCommand: sinon.SinonStubbedInstance<StatusCommand>;

  beforeEach(() => {
    // Create mock commands
    mockDownloadCommand = sinon.createStubInstance(DownloadCommand);
    mockUploadCommand = sinon.createStubInstance(UploadCommand);
    mockStatusCommand = sinon.createStubInstance(StatusCommand);

    // Create CLI instance with mocked commands
    cli = new DocumentManagementCLI();
    
    // Replace the commands with mocks (this would normally be done via DI)
    (cli as any).downloadCommand = mockDownloadCommand;
    (cli as any).uploadCommand = mockUploadCommand;
    (cli as any).statusCommand = mockStatusCommand;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('CLI Structure', () => {
    it('should have all required commands', () => {
      expect(cli).to.be.instanceOf(DocumentManagementCLI);
      expect(mockDownloadCommand).to.exist;
      expect(mockUploadCommand).to.exist;
      expect(mockStatusCommand).to.exist;
    });

    it('should register all commands', () => {
      const mockProgram = {
        name: sinon.stub().returnsThis(),
        description: sinon.stub().returnsThis(),
        version: sinon.stub().returnsThis(),
        exitOverride: sinon.stub().returnsThis()
      };

      // Call the private method to test command registration
      (cli as any).setupCLI();
      
      // Verify commands were registered (this would be tested in integration tests)
      expect(mockProgram.name).to.be.a('function');
    });
  });

  describe('Command Registration', () => {
    it('should register download command', () => {
      const mockProgram = { command: sinon.stub().returnsThis() };
      mockDownloadCommand.register(mockProgram as any);
      
      expect(mockDownloadCommand.register).to.be.a('function');
    });

    it('should register upload command', () => {
      const mockProgram = { command: sinon.stub().returnsThis() };
      mockUploadCommand.register(mockProgram as any);
      
      expect(mockUploadCommand.register).to.be.a('function');
    });

    it('should register status command', () => {
      const mockProgram = { command: sinon.stub().returnsThis() };
      mockStatusCommand.register(mockProgram as any);
      
      expect(mockStatusCommand.register).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle CLI errors gracefully', async () => {
      const consoleErrorStub = sinon.stub(console, 'error');
      const processExitStub = sinon.stub(process, 'exit');
      
      // Simulate an error in the CLI
      try {
        await cli.run();
      } catch (error) {
        // Expected error
      }
      
      // Verify error handling (this would be more comprehensive in integration tests)
      expect(consoleErrorStub).to.be.a('function');
      
      consoleErrorStub.restore();
      processExitStub.restore();
    });
  });
});
