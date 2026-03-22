module.exports = {
  apps: [
    {
      name: "ufportal",
      cwd: "/var/www/ufportal",
      script: "yarn",
      args: "start",
       env_production: {
        NODE_ENV: "production",
        TYPESENSE_HOST: "127.0.0.1",
        TYPESENSE_PORT: "8108",
        TYPESENSE_API_KEY: "a7742a1ce3e7296b3234ed83db28e9713cd92dd597d3a206bfe82fde919b481d",
        TYPESENSE_COLLECTION: "products",
        TYPESENSE_SEARCH_KEY: "9VBwk51KOE7cwRERj0mOrMgos0HmJUKc",
      },

      env: {
        NODE_ENV: "production",
        PORT: 3066,
      },

      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,

      error_file: "/var/log/pm2/ufportal-error.log",
      out_file: "/var/log/pm2/ufportal-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
