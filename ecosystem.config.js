module.exports = {
  apps: [
    {
      name: 'attendancems',
      script: 'src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'backups', 'uploads'],
      max_memory_restart: '500M',
      
      // Advanced features
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Source map support
      source_map_support: true,
      
      // Environment variables
      env_file: '.env'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/attendancems.git',
      path: '/var/www/attendancems',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/attendancems.git',
      path: '/var/www/attendancems-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};