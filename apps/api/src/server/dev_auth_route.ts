import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { AuthProviderFactory } from "../auth/auth_provider_factory.ts";
import { DevAuthService } from "../auth/dev/dev_auth_service.ts";
import { Config } from "../config/schema.ts";

const DevAuthSignInRequestSchema = z.object({
  email: z.string().optional(),
  userId: z.string().optional(),
}).refine((value) => Boolean(value.email || value.userId), {
  message: "Either email or userId is required.",
});

const DevAuthSignUpRequestSchema = z.object({
  companyName: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
});

const DevAuthCreateCompanyRequestSchema = z.object({
  companyName: z.string(),
  email: z.string().optional(),
  userId: z.string().optional(),
}).refine((value) => Boolean(value.email || value.userId), {
  message: "Either email or userId is required.",
});

type DevAuthSignInRequest = FastifyRequest<{
  Body: z.infer<typeof DevAuthSignInRequestSchema>;
}>;

type DevAuthSignUpRequest = FastifyRequest<{
  Body: z.infer<typeof DevAuthSignUpRequestSchema>;
}>;

type DevAuthCreateCompanyRequest = FastifyRequest<{
  Body: z.infer<typeof DevAuthCreateCompanyRequestSchema>;
}>;

/**
 * Hosts the passwordless dev auth endpoints that the web app uses when runtime auth is set to
 * `dev`.
 */
@injectable()
export class DevAuthRoute {
  private static readonly BASE_PATH = "/auth/dev";
  private readonly config: Config;
  private readonly devAuthService: DevAuthService;

  constructor(
    @inject(Config) config: Config,
    @inject(DevAuthService) devAuthService: DevAuthService,
  ) {
    this.config = config;
    this.devAuthService = devAuthService;
  }

  register(app: FastifyInstance): void {
    if (this.config.auth.provider !== "dev") {
      return;
    }

    app.get(`${DevAuthRoute.BASE_PATH}/users`, async (_request: FastifyRequest, reply: FastifyReply) => {
      await this.handleListUsers(reply);
    });
    app.post(`${DevAuthRoute.BASE_PATH}/sign-in`, async (request: DevAuthSignInRequest, reply: FastifyReply) => {
      await this.handleSignIn(request, reply);
    });
    app.post(`${DevAuthRoute.BASE_PATH}/sign-up`, async (request: DevAuthSignUpRequest, reply: FastifyReply) => {
      await this.handleSignUp(request, reply);
    });
    app.post(
      `${DevAuthRoute.BASE_PATH}/create-company`,
      async (request: DevAuthCreateCompanyRequest, reply: FastifyReply) => {
        await this.handleCreateCompany(request, reply);
      },
    );
    app.get(`${DevAuthRoute.BASE_PATH}/session`, async (request: FastifyRequest, reply: FastifyReply) => {
      await this.handleLoadSession(request, reply);
    });
    app.post(`${DevAuthRoute.BASE_PATH}/sign-out`, async (request: FastifyRequest, reply: FastifyReply) => {
      await this.handleSignOut(request, reply);
    });
  }

  private async handleListUsers(reply: FastifyReply): Promise<void> {
    try {
      await reply.send({
        users: await this.devAuthService.listUsers(),
      });
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleSignIn(request: DevAuthSignInRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = DevAuthSignInRequestSchema.parse(request.body);
      await reply.send(await this.devAuthService.signIn(body));
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleSignUp(request: DevAuthSignUpRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = DevAuthSignUpRequestSchema.parse(request.body);
      await reply.send(await this.devAuthService.signUp(body));
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleCreateCompany(request: DevAuthCreateCompanyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = DevAuthCreateCompanyRequestSchema.parse(request.body);
      await reply.send(await this.devAuthService.createCompany(body));
    } catch (error) {
      await this.replyWithError(reply, error);
    }
  }

  private async handleLoadSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const token = this.requireBearerToken(request);
      await reply.send(await this.devAuthService.loadSession(token));
    } catch (error) {
      await this.replyWithError(reply, error, 401);
    }
  }

  private async handleSignOut(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const token = this.requireBearerToken(request);
      await this.devAuthService.signOut(token);
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
