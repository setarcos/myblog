---
title: SSH reverse tunnel
date: '2012-01-16 20:04:34'
tags:
    - networking
---

访问 NAT 内部的服务器

<!--more-->

# 直接使用 ssh 命令

A 处的计算机都在防火墙的后面，IP 地址是如 10.88.32.x 的非法 IP，我在 B 处就无法访问它们。
为了可以远程登录 A 处的主机，就要使用 SSH 的反向隧道功能。此时需要 A 处计算机可以直接
访问 B 处的主机，也就是 B 处主机需要有公网 IP。首先是在A处的计算机上执行

```bash
$ ssh -N -R 10002:localhost:22 myuser@my.b.ip.addr
```

只要保证这条命令一直执行，就可以在 B 处的电脑上打开 10002 这样一个反向隧道，之后只要在 B 处使用

```bash
$ ssh my_a_user@localhost -p 10002
```

就可以连接 A 处的电脑上了。其中 my_a_user 是 A 处电脑的用户名。而我 B 处主机上的 myuser
用户还可以没有合法的登录终端，这样也很安全，万一 B 处电脑重启什么的，还可以让别人
帮我运行这个命令，不用担心告诉他们密码了。

如果希望从别的主机也可以连接 B 电脑的对应端口，还需要修改 sshd 的配置选项：GatewayPorts 为 yes。

# 使用 tailscale 等私网组网工具

直接使用 ssh 还是比较麻烦，比较好的解决方案是组一个私网，将所有的个人主机都放到一个
独立的网段中。比如可以使用 wireguard 组网，每个主机会新建一个 tun 虚拟网卡，使用
私有 IP 组网。但自己组网需要考虑网络的结构，至少有一台主机要有公网 IP，否则主机之间
还是无法联通。

有些商业的组网工具可以提供数据中转，即使个人没有公网 IP 也可以组网，如 tailscale 和
zerotier 等。对于大部分用户来说免费额度就足够使用了。

# 使用 cloudflare 的 tunnel

cloudflare 的 tunnel 可以创建个人主机到公网的隧道，一般用来提供 http 服务，能自动
具有 ssl 证书，并提供 DoS 等攻击的防火墙。用它也同样可以暴露内网的 SSH 服务。不过需要
首先在主机安装 cloudflared。如果主机仅支持 IPV6，可以在 cloudflared.service 中的
ExecStart 中增加 `--edge-ip-version 6` 参数。

接下来在 cloudflare 的仪表盘建立一个新的域名指向（在 tunnel 的配置页面建立一个主机名）
到 SSH 服务。然后就可以这样访问 NAT 后面的主机：

```bash
ssh -o ProxyCommand="cloudflared access ssh --hostname %h" username@host.domain
```
或者可以配置 `ssh_config` 简化命令：
```ssh_config
Host host.domain
  User username
  ProxyCommand cloudflared access ssh --hostname %h
```

cloudflared 命令实际也是打开了一个反向的 ssh 隧道，比如可以指定端口：
```bash
cloudflared access ssh --hostname host.domain --url localhost:2222
```
这样就可以访问本地 2222 端口来连接远程主机了。
