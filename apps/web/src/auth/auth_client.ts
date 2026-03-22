import type { AuthenticatedUserDocument, AuthSessionDocument } from "./auth_session_store";
import { authSessionStore } from "./auth_session_store";
import { RelayEnvironmentBuilder } from "../relay/relay_environment";

export interface SignInInputDocument {
  email: string;
  password: string;
}

export interface SignUpInputDocument {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthMutationDataDocument {
  SignIn?: AuthSessionDocument;
  SignUp?: AuthSessionDocument;
}

export class AuthClient {
  async signIn(input: SignInInputDocument): Promise<AuthSessionDocument> {
    const payload = await RelayEnvironmentBuilder.executeMutation<AuthMutationDataDocument>(
      "SignInPageMutation",
      `mutation SignInPageMutation($input: SignInInput!) {
        SignIn(input: $input) {
          token
          user {
            id
            email
            firstName
            lastName
          }
        }
      }`,
      {
        input,
      },
    );

    const session = this.normalizeSession(payload.SignIn);
    authSessionStore.setSession(session);
    return session;
  }

  async signUp(input: SignUpInputDocument): Promise<AuthSessionDocument> {
    const payload = await RelayEnvironmentBuilder.executeMutation<AuthMutationDataDocument>(
      "SignUpPageMutation",
      `mutation SignUpPageMutation($input: SignUpInput!) {
        SignUp(input: $input) {
          token
          user {
            id
            email
            firstName
            lastName
          }
        }
      }`,
      {
        input,
      },
    );

    const session = this.normalizeSession(payload.SignUp);
    authSessionStore.setSession(session);
    return session;
  }

  signOut(): void {
    authSessionStore.clearSession();
  }

  private normalizeSession(rawSession: AuthSessionDocument | undefined): AuthSessionDocument {
    const token = String(rawSession?.token || "").trim();
    if (!token) {
      throw new Error("Auth mutation did not return a token.");
    }

    return {
      token,
      user: this.normalizeUser(rawSession?.user),
    };
  }

  private normalizeUser(rawUser: AuthenticatedUserDocument | null | undefined): AuthenticatedUserDocument | null {
    if (!rawUser) {
      return null;
    }

    return {
      id: String(rawUser.id || "").trim(),
      email: String(rawUser.email || "").trim(),
      firstName: String(rawUser.firstName || "").trim(),
      lastName: String(rawUser.lastName || "").trim() || null,
    };
  }
}

export const authClient = new AuthClient();
