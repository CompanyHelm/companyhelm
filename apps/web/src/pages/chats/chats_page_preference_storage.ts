import { LocalStoragePreference } from "@/lib/local_storage_preference";

/**
 * Owns the browser-local preferences for the chat workspace chrome so the page can restore the
 * user's panel and workflow-status layout without coupling React state to raw storage keys.
 */
export class ChatsPagePreferenceStorage {
  private static readonly chatListHiddenStorageKey = "companyhelm.chats.listHidden";
  private static readonly collapsedAgentIdsStorageKey = "companyhelm.chats.collapsedAgentIds";
  private static readonly workflowStatusExpandedStorageKey = "companyhelm.chats.workflowStatusExpanded";

  static loadChatListHidden(): boolean {
    return LocalStoragePreference.readBoolean(ChatsPagePreferenceStorage.chatListHiddenStorageKey, false);
  }

  static saveChatListHidden(isHidden: boolean): void {
    LocalStoragePreference.writeBoolean(ChatsPagePreferenceStorage.chatListHiddenStorageKey, isHidden);
  }

  static loadCollapsedAgentIds(): Record<string, boolean> {
    return LocalStoragePreference.readBooleanRecord(ChatsPagePreferenceStorage.collapsedAgentIdsStorageKey);
  }

  static saveCollapsedAgentIds(collapsedAgentIds: Readonly<Record<string, boolean>>): void {
    LocalStoragePreference.writeBooleanRecord(
      ChatsPagePreferenceStorage.collapsedAgentIdsStorageKey,
      collapsedAgentIds,
    );
  }

  static loadWorkflowStatusExpanded(): boolean {
    return LocalStoragePreference.readBoolean(ChatsPagePreferenceStorage.workflowStatusExpandedStorageKey, false);
  }

  static saveWorkflowStatusExpanded(isExpanded: boolean): void {
    LocalStoragePreference.writeBoolean(ChatsPagePreferenceStorage.workflowStatusExpandedStorageKey, isExpanded);
  }
}
