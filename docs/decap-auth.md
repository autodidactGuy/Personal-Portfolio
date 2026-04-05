# Decap CMS Auth for GitHub Pages

This portfolio uses Decap CMS with the `github` backend and an external OAuth proxy because GitHub Pages cannot host a secure token-exchange backend.

## Recommended approach

Use a Cloudflare Worker as the OAuth proxy.

## Required GitHub OAuth app

Create a GitHub OAuth App with these values:

- Application name: `Personal Portfolio CMS`
- Homepage URL: `https://hassanraza.us`
- Authorization callback URL: `https://YOUR_CLOUDFLARE_WORKER_DOMAIN/callback`

Save the generated values:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Cloudflare Worker environment variables

Configure these secrets in the Worker:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_SCOPE=repo`
- `ORIGIN=https://hassanraza.us`
- `REPO_BASE_PATH=`

## Worker routes

Your Worker must expose:

- `GET /auth`
- `GET /callback`

`/auth` redirects the user to GitHub's OAuth consent screen.

`/callback` exchanges the temporary GitHub code for an access token, then posts that token back to the Decap CMS window using `postMessage`.

## Login flow

1. The editor opens `https://hassanraza.us/admin/`.
2. Decap reads `public/admin/config.yml`.
3. Clicking login sends the user to `https://YOUR_CLOUDFLARE_WORKER_DOMAIN/auth`.
4. The Worker redirects to GitHub OAuth.
5. GitHub redirects back to `https://YOUR_CLOUDFLARE_WORKER_DOMAIN/callback?code=...`.
6. The Worker exchanges `code` for a GitHub access token.
7. The Worker returns a small HTML page that calls `window.opener.postMessage(...)`.
8. Decap receives the token, authenticates against `autodidactGuy/Personal-Portfolio`, and commits content changes directly to `main` or the editorial workflow branch.
9. GitHub push triggers `.github/workflows/deploy.yml`.
10. GitHub Pages deploys the rebuilt static site.

## Minimal Worker behavior

The Worker only needs to:

- redirect to GitHub OAuth with your client ID
- exchange the callback code against `https://github.com/login/oauth/access_token`
- return an HTML page that posts `{ token, provider: "github" }` to the opener window

## Decap config mapping

`public/admin/config.yml` is already prepared for this model:

```yml
backend:
  name: github
  repo: autodidactGuy/Personal-Portfolio
  branch: main
  base_url: https://YOUR_CLOUDFLARE_WORKER_DOMAIN
  auth_endpoint: /auth
```

Replace `https://YOUR_CLOUDFLARE_WORKER_DOMAIN` with the deployed Worker URL after provisioning.
