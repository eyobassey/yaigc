# Deploy

How the YAIGC web platform runs in production.

## Topology (Phase 1, single IONOS box)

```
Browser
  │  HTTPS (Cloudflare edge cert, free, managed by Cloudflare)
  ▼
Cloudflare proxy
  │  HTTPS (Cloudflare Origin Cert, 15 years, locked to CF → origin)
  ▼
nginx :443 on the IONOS box
  │  HTTP loopback
  ▼
Next.js production server on 127.0.0.1:3002
  │  managed by
  ▼
PM2 (autorestart, log rotation, systemd integration)
```

Both nginx and the Node process live on the same box. The Node server never
binds to a public interface; the only public ingress is via Cloudflare.

## Files

- [`pm2/production.config.cjs`](pm2/production.config.cjs) — PM2 app definition for the production Next.js process. Loads env vars from `/home/username/secrets/yaigc-production.env` via Node's `--env-file` flag.
- [`nginx/yaigc.conf`](nginx/yaigc.conf) — nginx server config. TLS termination, Cloudflare real-IP recovery, security headers, reverse proxy.

## First-time deploy

See [`../docs/runbooks/first-deploy.md`](../docs/runbooks/first-deploy.md) (to be written) for the full walkthrough. Summary:

1. `sudo apt install nginx`
2. Generate Cloudflare Origin Certificate in the Cloudflare dashboard
3. Place cert and key in `/etc/nginx/ssl/youareingoodcompany.co.uk.{crt,key}`
4. Copy this directory's `nginx/yaigc.conf` to `/etc/nginx/sites-available/yaigc`, symlink to `sites-enabled`, disable default site
5. `sudo nginx -t && sudo systemctl reload nginx`
6. `pnpm install && pnpm build` in the repo
7. `pm2 start deploy/pm2/production.config.cjs && pm2 save`
8. `pm2 startup systemd` and run the printed sudo command so PM2 starts on boot
9. Cloudflare SSL/TLS mode → **Full (Strict)**; Always Use HTTPS → On
10. `curl https://app.youareingoodcompany.co.uk` — expect 200

## Subsequent deploys

```
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 reload deploy/pm2/production.config.cjs --update-env
```

The `--update-env` flag picks up changes to `/home/username/secrets/yaigc-production.env`. `pm2 reload` is zero-downtime: new workers spawn before old ones are killed.

## Rollback

```
git log --oneline                       # find the previous good SHA
git checkout <previous-sha>
pnpm install --frozen-lockfile
pnpm build
pm2 reload deploy/pm2/production.config.cjs --update-env
```

A more sophisticated keep-last-N-releases pattern with symlink-swap deploys lands in Sprint 1.

## Observability

- **nginx access logs**: `/var/log/nginx/yaigc-access.log`
- **nginx error logs**: `/var/log/nginx/yaigc-error.log`
- **Next.js stdout**: `~/.pm2/logs/igc-prod-web-out.log`
- **Next.js stderr**: `~/.pm2/logs/igc-prod-web-error.log`
- **Process state**: `pm2 status`, `pm2 logs igc-prod-web`, `pm2 monit`

Sentry, PostHog, and Better Stack integrations land in Sprint 1.
