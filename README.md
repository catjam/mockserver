### MockService
>   基于[mockjs](http://mockjs.com/) 模拟服务器响应，使用nginx反向代理到此网站，自助式定义请求的参数和返回值，来实现``前后端开发解耦`` 的目的

### 服务器地址
[列表](http://117.48.215.22:9000/mocklist) 

[添加用户](http://117.48.215.22:9000/adduser) 

### 技术栈
> jquery@3.x + express@4.x + bootstrap@4.x + mongodb@lastest + mockjs@lastest

### Demo
```
{
  "number|1-100": 100
}
```

```
{
  "number": 21
}
```

### Nginx conf
```
  listen       7777;
  server_name  localhost;

  location / {
    proxy_pass   http://localhost:9000/mockapi/;
  }
```

### 环境
安装 node, npm, git, mongodb
```
  git clone https://github.com/catjam/mockserver.git
  cd mockserver
  npm install
  npm run dev
```




