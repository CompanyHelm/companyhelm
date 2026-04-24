import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { z } from "zod";
import { DevAuthService } from "../auth/dev/dev_auth_service.ts";
import { Config } from "../config/schema.ts";

const DevAuthSignUpRequestSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
});

const DevAuthUserRequestSchema = z.object({
  email: z.string().optional(),
  userId: z.string().optional(),
}).refine((value) => Boolean(value.email || value.userId), {
  message: "Either email or userId is required.",
});

const DevAuthCreateCompanyRequestSchema = z.object({
  companyName: z.string(),
  userId: z.string(),
});

type DevAuthSignUpRequest = FastifyRequest<{
  Body: z.infer<typeof DevAuthSignUpRequestSchema>;
}>;

type DevAuthUserRequest = FastifyRequest<{
  Querystring: z.infer<typeof DevAuthUserRequestSchema>;
}>;

type DevAuthCreateCompanyRequest = FastifyRequest<{
  Body: z.infer<typeof DevAuthCreateCompanyRequestSchema>;
}>;

/**
 * Hosts the dev-only user and company management endpoints used by the web app when runtime auth
 * is set to `dev`.
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
    app.get(`${DevAuthRoute.BASE_PATH}/user`, async (request: DevAuthUserRequest, reply: FastifyReply) => {
      await this.handleLoadUser(request, reply);
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

  private async handleLoadUser(request: DevAuthUserRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = DevAuthUserRequestSchema.parse(request.query);
      await reply.send(await this.devAuthService.loadUser(query));
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
