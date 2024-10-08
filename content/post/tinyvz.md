---
title: Using TinyVZ
date: '2014-09-07 09:29:34'
tags:
    - networking
---

买了 15 刀一年的 VPS，基于 OpenVZ 技术

<!--more-->

# 购买

购买 [TinyVZ][1] 需要有国际支付手段，我使用 Paypal，自动兑换汇率，还是比较方便的。支付完成后需要 3 个工作日才可以获得登录的密码，通过他们提供的 IP 地址用 vz:vz 登录，然后再输入用户名和密码就可以获得 VPS 的 root 终端。

# 安装操作系统

初次登录安装的操作系统是 Debian 6.0，喜欢追新的我立刻给换成了 Debian 7.0，但由于是基于 OpenVZ 技术，Linux 内核还只能是 2.6.26。更新操作系统的过程是使用网页上的 Web Console，选择 Reload OS，此时可供选择的有多个操作系统，选定后 60 秒内就可以安装完毕。

# 配置服务

## ssh 服务

```bash
# apt-get install openssh-server
```

使用 ssh 服务不但可以直接登录到 VPS 中，而不需要通过 vz:vz 那个服务器的中转，还可以实现端口的动态转发，搭建一个 SOCKS 服务器。

## pptpd 服务

SOCKS 服务器只能给浏览器使用，最好能实现个 VPN 服务器，第一个实现方案是用 PPTPD 服务。安装和配置过程还比较简单，只要安装 pptpd 和 iptables，并修改 ppp 的几个配置文件就可以了。具体的设置方法网上有很多，但安装完毕却一直出现如下错误：

```bash
GRE: read(...) from PTY failed...
CTRL: PTY read or GRE write failed (pty,gre)=(6,7)
```

我在自己的主机上配置 PPTPD 竟然也出现同样的错误，有人说是 GRE 穿透路由的问题，也许是目前的网络环境不允许 GRE 包通过。这个有时间再慢慢检查一下。

## openvpn 服务

OpenVPN 的服务已经搭过多次了，家里的路由器就使用 OpenVPN 实现与实验室电脑的共享上网。但在 VPS 中还是出了问题。建立隧道连接没有问题，但通信过程非常不稳定，只是偶尔可以 ping 通远程的服务器，基本属于不可用状态。

而且 iptables 的 MASQUERADE 好像不好使，必须使用 SNAT，例如：

```bash
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o venet0 -j SNAT --to MYVZIP 
```

## 其它 服务

apache 服务安装后就不能启动，说是 ports.conf 中语法错误，但实际的原因是 libapr1 使用了比较新的内核接口，必须重新编译安装 libapr1 才可以。

```bash
# apt-get source libapr1
# cd apr-1.4.6/
# dpkg-buildpackage
```

编译失败在最后的 test 部分，不理它，直接进入到 build-i386 目录然后 make install 安装成功，然后就可以启动 apache 了。

不过 apache 运行过程还是不顺利，错误信息为：Resource temporarily unavailable: apr_thread_create: unable to create worker thread，好像是 VZ 环境下不允许开太多的 Thread。当然这点也要继续确认，不过还是放弃了使用 apache，正好可以试用一下 nginx。

nginx 的安装还是比较顺利了，直接 apt-get 安装好就可以正常使用了。


[1]: http://tinyvz.com