module.exports = {
  apps: [
    {
      name: "ai-job-search",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 8127,
        SECURE_COOKIE: "false",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      exec_mode: "fork",
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      env_file: ".env",
    },
  ],
};
