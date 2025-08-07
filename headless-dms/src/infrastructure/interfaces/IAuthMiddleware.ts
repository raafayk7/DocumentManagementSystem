import { IHttpRequest, IHttpResponse } from './IHttpServer.js'

export interface IAuthMiddleware {
  authenticate(request: IHttpRequest, response: IHttpResponse): Promise<boolean>
  requireRole(roles: string[]): (request: IHttpRequest, response: IHttpResponse) => Promise<boolean>
}

export interface ITokenService {
  generateToken(payload: any): Promise<string>
  verifyToken(token: string): Promise<any>
  decodeToken(token: string): any
} 