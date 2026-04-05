export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const callbackUrl = `${url.origin}/callback`;

    if (url.pathname === "/auth") {
      const githubUrl = new URL("https://github.com/login/oauth/authorize");
      githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubUrl.searchParams.set("scope", env.GITHUB_OAUTH_SCOPE || "repo");
      githubUrl.searchParams.set("redirect_uri", callbackUrl);

      return Response.redirect(githubUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Missing OAuth code", { status: 400 });
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "decap-cms-oauth-worker",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: callbackUrl,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return new Response(`OAuth failed: ${JSON.stringify(tokenData)}`, {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const profileResponse = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "decap-cms-oauth-worker",
        },
      });

      if (!profileResponse.ok) {
        return new Response("Failed to fetch GitHub profile", { status: 403 });
      }

      const profile = await profileResponse.json();
      const username = String(profile.login || "").toLowerCase();
      const allowedUsers = String(env.ALLOWED_GITHUB_USERS || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (!allowedUsers.includes(username)) {
        return new Response(`Access denied for GitHub user: ${profile.login}`, {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const tokenPayload = JSON.stringify({ token: tokenData.access_token });

      return new Response(
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Login complete</title>
  </head>
  <body>
    <script>
      const receiveMessage = () => {
        window.opener.postMessage(
          'authorization:github:success:${tokenPayload}',
          '*'
        );
        window.removeEventListener('message', receiveMessage, false);
        window.close();
      };

      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    </script>
    Login complete. You can close this window.
  </body>
</html>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
