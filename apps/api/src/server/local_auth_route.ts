import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { AuthProviderFactory } from "../auth/auth_provider_factory.ts";
import { LocalAuthService } from "../auth/local/local_auth_service.ts";
import { Config } from "../config/schema.ts";

const SignInRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
});

const SignUpRequestSchema = z.object({
  companyName: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
  password: z.string(),
});

type SignInRequest = FastifyRequest<{
  Body: z.infer<typeof SignInRequestSchema>;
}>;

type SignUpRequest = FastifyRequest<{
  Body: z.infer<typeof SignUpRequestSchema>;
}>;

/**
 * Hosts the credential-based local auth endpoints that the web app uses when runtime auth is set
 * to `local`.
 */
@injectable()
export class LocalAuthRoute {
  private static readonly BASE_PATH = "/auth/local";
  private readonly config: Config;
  private readonly localAuthService: LocalAuthService;

  constructor(
    @inject(Config) config: Config,
    @inject(LocalAuthService) localAuthService: LocalAuthService,
  ) {
    this.config = config;
    this.localAuthService = localAuthService;
  }

  register(app: FastifyInstance): void {
    if (this.config.auth.provider !== "local") {
      return;
    }

    app.post(`${LocalAuthRoute.BASE_PATH}/sign-in`, async (request: SignInRequest, reply: FastifyReply) => {
      await this.handleSignIn(request, reply);
    });
    app.post(`${LocalAuthRoute.BASE_PATH}/sign-up`, async (request: SignUpRequest, reply: FastifyReply) => {
      await this.handleSignUp(request, reply);
    });
    app.get(`${LocalAuthRoute.BASE_PATH}/session`, async (request: FastifyRequest, reply: FastifyReply) => {
      await this.handleLoadSession(request, reply);
    });
    app.post(`${LocalAuthRoute.BASE_PATH}/sign-out`, async (request: FastifyRequest, reply: FastifyReply) => {
      await this.handleSignOut(request, reply);
    });
  }

  private async handleSignIn(request: SignInRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = SignInRequestSchema.parse(request.body);
      await reply.send(await this.localAuthService.signIn(body));
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleSignUp(request: SignUpRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = SignUpRequestSchema.parse(request.body);
      await reply.send(await this.localAuthService.signUp(body));
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleLoadSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const token = this.requireBearerToken(request);
      await reply.send(await this.localAuthService.loadSession(token));
    } catch (error) {
      await this.replyWithError(reply, error, 401);
    }
  }

  private async handleSignOut(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const token = this.requireBearerToken(request);
      await this.localAuthService.signOut(token);
      await reply.send({
        success: true,
      });
    } catch (error) {
      await this.replyWithError(reply, error, 401);
    }
  }

  private requireBearerToken(request: FastifyRequest): string {
    const token = AuthProviderFactory.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new Error("Authorization header is required.");
    }

    return token;
  }

  private async replyWithError(
    reply: FastifyReply,
    error: unknown,
    statusCode = 400,
  ): Promise<void> {
    await reply.code(statusCode).send({
      error: error instanceof Error ? error.message : "Request failed.",
    });
  }
}
