# Vynthen AI - Cloudflare Pages Deployment

This application is configured for deployment to Cloudflare Pages with Edge Runtime support.

## Prerequisites

1. A Cloudflare account
2. The `wrangler` CLI installed (`npm install -g wrangler`)
3. API keys and secrets configured

## Quick Deploy

```bash
# Build for Cloudflare Pages
npx @cloudflare/next-on-pages

# Deploy
npx wrangler pages deploy .vercel/output/static
```

## Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings > Environment variables**:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENROUTER_API_KEY` or `OPENROUTER_API_KEY_1..N` - OpenRouter API keys

### Recommended
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side operations
- `NEXT_PUBLIC_APP_URL` - Your app's URL (default: https://vynthen.ai)

## Optional: Cloudflare KV for Rate Limiting

For distributed rate limiting across edge workers:

1. Create a KV namespace in Cloudflare dashboard
2. Add the binding to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"
```

## Architecture

### Edge-Compatible Routes
These routes use `export const runtime = 'edge'` and run on Cloudflare's global network:
- `/api/chat` - AI chat completions
- `/api/translate` - Text translation
- `/api/generate-image` - Image generation
- `/api/keys` - API key status

### Node.js Runtime Routes
These routes require Node.js runtime for session management:
- `/api/auth/*` - Authentication endpoints
- `/api/conversations/*` - Conversation management

## Security Features

- ✅ Rate limiting (stateless or KV-based)
- ✅ Input validation with Zod
- ✅ API key rotation
- ✅ No sensitive data in client bundles
- ✅ OWASP best practices

## Troubleshooting

### "No API keys configured"
Ensure `OPENROUTER_API_KEY` or `OPENROUTER_API_KEY_1..N` are set in environment variables.

### Rate limits not working
Without KV, rate limiting uses a stateless approach that provides approximate limits. For precise rate limiting, configure KV namespace.

### Authentication issues
Auth routes use Node.js runtime and should work correctly. Check Supabase configuration.
