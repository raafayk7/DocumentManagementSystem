export interface IHttpServer {
  start(port: number, host?: string): Promise<void>
  stop(): Promise<void>
  registerRoute(method: string, path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void
  registerMiddleware(middleware: any): void
  getInstance(): any // Returns the underlying framework instance
  logRoutes(): void // Log all registered routes
}

export interface IHttpRequest {
  body: any
  params: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
  method: string
  url: string
  user?: any // For authenticated requests
}

export interface IHttpResponse {
  status(code: number): IHttpResponse
  send(data: any): void
  header(name: string, value: string): IHttpResponse
  code(statusCode: number): IHttpResponse
} 