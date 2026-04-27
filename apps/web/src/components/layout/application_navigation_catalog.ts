import {
  BotIcon,
  BookOpenIcon,
  Building2Icon,
  ChartPieIcon,
  FolderGit2Icon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LockKeyholeIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  PlugIcon,
  ShieldCheckIcon,
  ServerIcon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon,
  WrenchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ApplicationNavigationGroupRecord = Readonly<{
  items: readonly ApplicationNavigationItemRecord[];
  label: string | null;
}>;

export type ApplicationNavigationItemRecord = Readonly<{
  icon: LucideIcon;
  label: string;
  scope?: "organization" | "root";
  to: string;
}>;

/**
 * Centralizes the user-approved application sidebar information architecture so the React shell
 * and the tests share one source of truth for grouping, ordering, and feature-flagged entries.
 */
export class ApplicationNavigationCatalog {
  /**
   * Builds the top-level sidebar groups in the exact order the user approved, while keeping
   * feature-flagged destinations like Compute Providers removable without reshuffling the rest.
   */
  public static buildMainGroups(input: {
    isComputeProvidersEnabled: boolean;
    isPlatformAdmin?: boolean;
    isOnboardingFocused?: boolean;
  }): readonly ApplicationNavigationGroupRecord[] {
    if (input.isOnboardingFocused) {
      return [{
        items: [
          {
            icon: MessageSquareIcon,
            label: "Onboarding",
            to: "/onboarding",
          },
        ],
        label: "Setup",
      }];
    }

    const agentItems: ApplicationNavigationItemRecord[] = [
      {
        icon: BotIcon,
        label: "Agents",
        to: "/agents",
      },
      {
        icon: SparklesIcon,
        label: "Skills",
        to: "/skills",
      },
      ...(input.isPlatformAdmin
        ? []
        : [{
          icon: KeyRoundIcon,
          label: "Model Credentials",
          to: "/model-provider-credentials",
        }]),
      {
        icon: LockKeyholeIcon,
        label: "Secrets",
        to: "/secrets",
      },
      {
        icon: PlugIcon,
        label: "MCP Servers",
        to: "/mcp-servers",
      },
      {
        icon: ServerIcon,
        label: "Environments",
        to: "/environments",
      },
      {
        icon: WrenchIcon,
        label: "Compute Providers",
        to: "/compute-providers",
      },
    ];

    const visibleAgentItems = input.isComputeProvidersEnabled
      ? agentItems
      : agentItems.filter((item) => item.to !== "/compute-providers");

    return [
      {
        items: [
          {
            icon: MessageSquareIcon,
            label: "Chats",
            to: "/chats",
          },
          {
            icon: InboxIcon,
            label: "Inbox",
            to: "/inbox",
          },
        ],
        label: null,
      },
      {
        items: [
          {
            icon: LayoutDashboardIcon,
            label: "Dashboard",
            to: "/",
          },
          {
            icon: MessagesSquareIcon,
            label: "Agent Conversations",
            to: "/conversations",
          },
          {
            icon: ListTodoIcon,
            label: "Tasks",
            to: "/tasks",
          },
          {
            icon: ChartPieIcon,
            label: "Usage",
            to: "/usage",
          },
        ],
        label: "Operate",
      },
      {
        items: [
          {
            icon: WorkflowIcon,
            label: "Workflows",
            to: "/workflows",
          },
        ],
        label: "Automation",
      },
      {
        items: visibleAgentItems,
        label: "Agent",
      },
      {
        items: [
          {
            icon: FolderGit2Icon,
            label: "Repositories",
            to: "/repositories",
          },
          {
            icon: BookOpenIcon,
            label: "Knowledge Base",
            to: "/knowledge-base",
          },
        ],
        label: "Sources",
      },
      ...(input.isPlatformAdmin
        ? [{
          items: [
            {
              icon: ShieldCheckIcon,
              label: "Admin",
              scope: "root",
              to: "/admin",
            },
            {
              icon: KeyRoundIcon,
              label: "LLM Credentials",
              to: "/model-provider-credentials",
            },
            {
              icon: UsersIcon,
              label: "Users",
              scope: "root",
              to: "/admin/users",
            },
            {
              icon: Building2Icon,
              label: "Companies",
              scope: "root",
              to: "/admin/companies",
            },
            {
              icon: KeyRoundIcon,
              label: "LLM credentials",
              scope: "root",
              to: "/admin/llm-credentials",
            },
          ],
          label: "Platform",
        } satisfies ApplicationNavigationGroupRecord]
        : []),
    ];
  }
}
