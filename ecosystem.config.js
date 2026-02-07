// PM2 Ecosystem Configuration for ACe_Toolkit
// Manages backend, frontend, and cloudflare tunnel

module.exports = {
  apps: [
    // ==================== Backend (FastAPI) ====================
    {
      name: 'backend',
      cwd: '/Users/blest/dev/ACe_Toolkit/apps/api',
      script: '.venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none', // Don't use node to interpret

      // Environment
      env: {
        PATH: '/Users/blest/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
        DATA_BASE_DIR: '/Volumes/T7/dev',
      },

      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000, // 3 seconds between restarts

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-backend-error.log',
      out_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-backend-out.log',
      merge_logs: true,

      // Health check - wait for port to be ready
      wait_ready: false,
      listen_timeout: 10000,
    },

    // ==================== Frontend (Next.js) ====================
    {
      name: 'frontend',
      cwd: '/Users/blest/dev/ACe_Toolkit/apps/web',
      script: 'npm',
      args: 'start',
      interpreter: 'none',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
      },

      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-frontend-error.log',
      out_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-frontend-out.log',
      merge_logs: true,

      // Wait for backend to start first (5 second delay)
      wait_ready: false,
    },

    // ==================== Cloudflare Tunnel ====================
    {
      name: 'cloudflared',
      script: '/opt/homebrew/bin/cloudflared',
      args: 'tunnel --config /Users/blest/.cloudflared/config.yml run',
      cwd: '/Users/blest',
      interpreter: 'none',

      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000, // 5 seconds - tunnel needs more time

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-cloudflared-error.log',
      out_file: '/Users/blest/dev/ACe_Toolkit/logs/pm2-cloudflared-out.log',
      merge_logs: true,
    },
  ],
};
