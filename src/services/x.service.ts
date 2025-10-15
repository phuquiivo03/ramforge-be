import { env } from "../config/env";

// Minimal X OAuth 2.0 helper for authorization code with PKCE
export const XService = {
  getAuthUrl(state: string, codeChallenge: string, scopes?: string[]): string {
    const base = "https://twitter.com/i/oauth2/authorize";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.xClientId,
      redirect_uri: env.xRedirectUri,
      scope: (scopes && scopes.length > 0
        ? scopes
        : ["tweet.read", "users.read", "follows.read", "offline.access"]
      ).join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${base}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string, codeVerifier: string) {
    const tokenUrl = "https://api.twitter.com/2/oauth2/token";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.xRedirectUri,
      client_id: env.xClientId,
      code_verifier: codeVerifier,
    });

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
    return (await resp.json()) as {
      token_type: string;
      expires_in: number;
      access_token: string;
      scope: string;
      refresh_token?: string;
    };
  },

  async getMe(accessToken: string) {
    const url = "https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url";
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error(`Failed to fetch X user: ${resp.status}`);
    return (await resp.json()) as { data?: { id: string; name?: string; username?: string } };
  },
};
