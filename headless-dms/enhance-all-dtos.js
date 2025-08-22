/**
 * Script to systematically enhance all DTO classes with hexapp composition patterns
 * This will add nestWithKey utilities to all response DTOs
 */

import fs from 'fs';
import path from 'path';

const DTOEnhancements = {
  // Add hexapp imports if not present
  addImports: (content) => {
    if (!content.includes('nestWithKey')) {
      const importLine = "import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';";
      const lines = content.split('\n');
      const insertIndex = lines.findIndex(line => line.includes("from '../base/index.js'")) + 1;
      lines.splice(insertIndex, 0, importLine);
      return lines.join('\n');
    }
    return content;
  },

  // Add composition utilities to class
  addCompositionUtils: (content, className) => {
    const classPattern = new RegExp(`export class ${className} extends BaseDto \\{`, 'g');
    const match = classPattern.exec(content);
    
    if (match && !content.includes('// Hexapp composition utilities')) {
      const utilsCode = `
  // Hexapp composition utilities
  private readonly nestData = nestWithKey('data');
  private readonly nestResponse = nestWithKey('response');
`;
      
      const insertPosition = match.index + match[0].length;
      const beforeClass = content.substring(0, insertPosition);
      const afterClass = content.substring(insertPosition);
      
      return beforeClass + utilsCode + afterClass;
    }
    return content;
  },

  // Add nesting methods before toPlain method
  addNestingMethods: (content, className) => {
    const toPlainPattern = /\/\*\*\s*\n\s*\* Convert to plain object for use with existing code\s*\n\s*\*\/\s*\n\s*toPlain\(\)/;
    const match = toPlainPattern.exec(content);
    
    if (match && !content.includes('toNestedResponse()')) {
      const nestingMethods = `
  /**
   * Create nested response using nestWithKey
   */
  toNestedResponse() {
    return this.nestResponse(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey  
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  `;
      
      const insertPosition = match.index;
      const beforeMethods = content.substring(0, insertPosition);
      const afterMethods = content.substring(insertPosition);
      
      return beforeMethods + nestingMethods + afterMethods;
    }
    return content;
  }
};

// DTO files to enhance
const dtoFiles = [
  'headless-dms/src/shared/dto/user/UserResponse.ts',
  'headless-dms/src/shared/dto/document/DocumentResponse.ts',
  'headless-dms/src/shared/dto/common/pagination.dto.ts'
];

// DTO classes to enhance (from grep results)
const userDTOs = [
  'AuthenticateUserResponseDto',
  'ChangeUserPasswordResponseDto', 
  'ChangeUserRoleResponseDto',
  'DeleteUserResponseDto',
  'PaginatedUsersResponseDto',
  'GetUserByIdResponseDto',
  'GetUsersResponseDto',
  'GetUserByEmailResponseDto',
  'GetUsersByRoleResponseDto',
  'ValidateUserCredentialsResponseDto'
];

const documentDTOs = [
  'GetDocumentsResponseDto',
  'GetDocumentByIdResponseDto',
  'DeleteDocumentResponseDto',
  'UploadDocumentResponseDto',
  'DownloadDocumentResponseDto',
  'GenerateDownloadLinkResponseDto',
  'DownloadDocumentByTokenResponseDto',
  'UpdateDocumentNameResponseDto',
  'AddTagsToDocumentResponseDto',
  'RemoveTagsFromDocumentResponseDto',
  'ReplaceTagsinDocumentResponseDto',
  'UpdateDocumentMetadataResponseDto'
];

const paginationDTOs = [
  'PaginationInputDto',
  'PaginationOutputDto'
];

console.log(`Need to enhance ${userDTOs.length} user DTOs + ${documentDTOs.length} document DTOs + ${paginationDTOs.length} pagination DTOs = ${userDTOs.length + documentDTOs.length + paginationDTOs.length} total DTOs`);

// This script shows what needs to be done
// Run manually for each file due to complexity
