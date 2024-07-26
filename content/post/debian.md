---
title: Install Debian
date: '2018-05-09 11:00:15'
tags:
    - software
---

给实验室的电脑装 Debian，记录几个遇到的问题

<!--more-->

Debian 本来是非常熟悉了，但安装 stretch 的时候还是需要的几个问题

# 网络接口名称

新安装的系统使用了新的命名规则，例如网络接口的名字变成了 `enp0s31f6`
这样就变得很不习惯，暂时没有发现这样的好处（命名唯一）。
可以使用 udev rule 来给接口改名字，但比较简单的还是增加一个内核参数，
修改 /etc/default/grub

    GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0"

# 保存上次启动选项

当使用多系统的时候，可以保存上次的选项会比较方便，这里只是记录一下
方法，并不是很困难，还是修改 grub 文件

    GRUB_DEFAULT=saved
    GRUB_SAVEDEFAULT=true

# ip 命令

ifconfig 命令缺省不安装了，取而代之的是功能更加强大的 ip 命令，
但这个命令还需要熟悉，如果要安装原来的命令，需要

    $ sudo apt-get install net-tools

下面列出一些常用命令，便于以后记忆：

    $ sudo ip addr add 192.168.0.51/24 dev eth0
    $ ip addr show eth0
    $ ip link
    $ ip route show
    $ sudo ip route add default via 192.168.0.1
    $ ip neighbour  # arp -a
    $ sudo ip link set eth0 down
