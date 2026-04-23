import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatsPagePreferenceStorage } from "../src/pages/chats/chats_page_preference_storage";

test("ChatsPagePreferenceStorage loaders can be used as receiverless React initializers", () => {
  const loadChatListHidden = ChatsPagePreferenceStorage.loadChatListHidden;
  const loadCollapsedAgentIds = ChatsPagePreferenceStorage.loadCollapsedAgentIds;
  const loadWorkflowStatusExpanded = ChatsPagePreferenceStorage.loadWorkflowStatusExpanded;

  assert.equal(loadChatListHidden(), false);
  assert.deepEqual(loadCollapsedAgentIds(), {});
  assert.equal(loadWorkflowStatusExpanded(), false);
});
