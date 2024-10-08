---
title: SSH reverse tunnel
date: '2012-01-16 20:04:34'
tags:
    - networking
---

访问 NAT 内部的服务器

<!--more-->

A 处的计算机都在防火墙的后面，IP 地址是如 10.88.32.x 的非法 IP，我在 B 处就无法访问它们。为了可以远程登录 A 处的主机，就要使用 SSH 的反向隧道功能。

首先是在A处的计算机上执行

```bash
$ ssh -N -R 10002:localhost:22 myuser@my.b.ip.addr
```

只要保证这条命令一直执行，就可以在 B 处的电脑上打开 10002 这样一个反向隧道，之后只要在 B 处使用

```bash
$ ssh my_a_user@localhost -p 10002
```

就可以连接 A 处的电脑上了。其中 my_a_user 是 A 处电脑的用户名。而我主机上的 myuser 用户还可以没有合法的登录终端，这样也很安全，万一 B 处电脑重启什么的，还可以让别人帮我运行这个命令，不用担心告诉他们密码了。

如果希望从别的主机也可以连接 B 电脑的对应端口，还需要修改 sshd 的配置选项：GatewayPorts 为 yes。