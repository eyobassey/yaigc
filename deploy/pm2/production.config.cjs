/**
 * PM2 ecosystem file for the YAIGC production environment.
 *
 * Loaded by:    pm2 start deploy/pm2/production.config.cjs
 * Runs:         apps/web in Next.js production mode on 127.0.0.1:3002
 * Listens on:   loopback only — nginx terminates TLS on :443 and proxies in.
 *
 * Env vars come from /home/username/secrets/yaigc-production.env via the
 * Node --env-file flag (built-in to Node 20.6+, no dotenv dependency needed).
 * The file is mode 600 and owned by `username`; PM2 inherits that.
 *
 * Logs land in ~/.pm2/logs/.
 */

const repoRoot = '/home/username/igc-platform';
const webDir = `${repoRoot}/apps/web`;
const secretsFile = '/home/username/secrets/yaigc-production.env';

module.exports = {
  apps: [
    {
      name: 'igc-prod-web',
      // Point at the actual JS file, not the .bin/ shell wrapper (which PM2
      // tries to parse as JS and choke on).
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3002 -H 127.0.0.1',
      cwd: webDir,
      // Node 20.6+ built-in env-file loader. Loads SMTP_*, AWS_*, S3_*, etc.
      // before the script starts. NODE_ENV and PORT are set in env below as
      // belt-and-braces; --env-file values win on conflict.
      node_args: `--env-file=${secretsFile}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/home/username/.pm2/logs/igc-prod-web-error.log',
      out_file: '/home/username/.pm2/logs/igc-prod-web-out.log',
      merge_logs: true,
      time: true,
      // Wait a moment between SIGINT and SIGKILL so in-flight requests drain.
      kill_timeout: 10000,
      // Give Next.js up to 30s to come up cleanly on first start.
      listen_timeout: 30000,
      // Use the Next.js HTTP server's readiness signal once available.
      wait_ready: false,
    },
    {
      // M.1.1 - WebSocket realtime server. Standalone Node process,
      // bound to 127.0.0.1:3004. nginx proxies wss://.../realtime/
      // here with the Upgrade dance. We point at the tsx ESM entry
      // directly (not the .bin/ shell wrapper) so PM2 doesn't try to
      // parse the shell script as JS - same workaround as igc-prod-web.
      name: 'igc-prod-realtime',
      script:
        '../../node_modules/.pnpm/tsx@4.22.2/node_modules/tsx/dist/cli.mjs',
      args: 'scripts/realtime-server.ts',
      cwd: webDir,
      node_args: `--env-file=${secretsFile}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        REALTIME_PORT: '3004',
      },
      error_file: '/home/username/.pm2/logs/igc-prod-realtime-error.log',
      out_file: '/home/username/.pm2/logs/igc-prod-realtime-out.log',
      merge_logs: true,
      time: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
