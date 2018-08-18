// 项目配置信息
module.exports = {
  enableCluster: false,
  enableQueueCluster: false,
  numCPUs: 2,
  numQueueCPUs: 2,
  port: 4000,
  name: 'project template by KoaJS',
  log_level: 5, // 0:关闭所有不必要的log 1:严重的系统错误 2：普通错误 3：警告信息 4：调试信息 5: 网络请求信息
  debug_log: true,
  development: {
    log_dir: 'logs',
    mongodb_uri: "mongodb://127.0.0.1:27017/mockservice?poolSize=5",
    redis: {
      host: "127.0.0.1",
      port: 6379,
      opts: {
        auth_pass: ""
      },
    }
  },
  production: {
    log_dir: '/var/data/logs',
    mongodb_uri: "mongodb://127.0.0.1:27017/project-demo?poolSize=5",
    redis: {
      host: "localhost",
      port: 6379,
      opts: {
        auth_pass: ""
      },
    }
  }
};
