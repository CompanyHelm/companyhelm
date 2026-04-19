import {
  BotIcon,
  BookOpenIcon,
  FolderGit2Icon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LockKeyholeIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  PlugIcon,
  ServerIcon,
  SparklesIcon,
  WorkflowIcon,
  WrenchIcon,
  CalendarClockIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ApplicationNavigationGroupRecord = Readonly<{
  items: readonly ApplicationNavigationItemRecord[];
  label: string;
}>;

export type ApplicationNavigationItemRecord = Readonly<{
  icon: LucideIcon;
  label: string;
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
  }): readonly ApplicationNavigationGroupRecord[] {
    const infrastructureItems: ApplicationNavigationItemRecord[] = [
      {
        icon: ServerIcon,
        label: "Environments",
        to: "/environments",
      },
    ];

    if (input.isComputeProvidersEnabled) {
      infrastructureItems.push({
        icon: WrenchIcon,
        label: "Compute Providers",
        to: "/compute-providers",
      });
    }

    return [
      {
        items: [
          {
            icon: LayoutDashboardIcon,
            label: "Dashboard",
            to: "/",
          },
          {
            icon: InboxIcon,
            label: "Inbox",
            to: "/inbox",
          },
          {
            icon: MessageSquareIcon,
            label: "Chats",
            to: "/chats",
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
        ],
        label: "Operate",
      },
      {
        items: [
          {
            icon: CalendarClockIcon,
            label: "Routines",
            to: "/routines",
          },
          {
            icon: WorkflowIcon,
            label: "Workflows",
            to: "/workflows",
          },
        ],
        label: "Automation",
      },
      {
        items: [
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
          {
            icon: KeyRoundIcon,
            label: "Model Credentials",
            to: "/model-provider-credentials",
          },
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
        ],
        label: "Agent",
      },
      {
        items: infrastructureItems,
        label: "Infrastructure",
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
    ];
  }
}
