export type McpOauthCallbackSearch = {
  code: string;
  state: string;
};

export function resolveMcpOauthCallbackSearch(locationSearch: string): McpOauthCallbackSearch {
  const searchParams = new URLSearchParams(locationSearch);

  return {
    code: String(searchParams.get("code") || "").trim(),
    state: String(searchParams.get("state") || "").trim(),
  };
}

export function resolveMcpOauthCallbackSearchFromWindow(): McpOauthCallbackSearch {
  if (typeof window === "undefined") {
    return {
      code: "",
      state: "",
    };
  }

  return resolveMcpOauthCallbackSearch(window.location.search);
}
