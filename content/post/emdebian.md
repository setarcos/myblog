---
title: Install EmDebian to DIM3517
date: '2014-01-16 17:35:49'
tags:
    - embedded
---

在闲置的 DIM3517 开发板上安装 Debian

<!--more-->

# 开发板简介

DIM3517 是 SEED 公司推出的 AM3517 开发板，闲置很长时间了，今天准备拿它玩玩……

# 主机准备

由于使用了 multistrap 工具，所以主机上必须安装：

    $ sudo apt-get install multistrap dpkg-dev

之后需要准备 multistrap 的配置文件，目前我的配置文件是这样的：

    [General]
    noauth=true
    unpack=true
    debootstrap=Grip
    aptsources=Grip
    [Grip]
    # space separated package list
    packages=netbase ifupdown iproute net-tools apt
    source=http://www.emdebian.org/grip
    suite=wheezy-grip

由于我参考的[网页](http://free-electrons.com/blog/embdebian-with-multistrap/)并没有 packages 那一行，结果生成的文件系统没有网络配置工具，也没有 apt 工具，造成接下来的安装非常麻烦，必须手工使用 dpkg 安装缺少的包。如果采用上面的设置就应该没有问题了。

接下来运行：

    $ multistrap -a armel -d $PWD/debian -f multistrap.conf

就可以从网上下载并在 debian 目录下生成初始的文件系统了。

# 运行 Debian 系统

上面的过程仅仅是把安装文件展开，所有的包都还没有配置。为了完成配置过程，我把生成的文件系统复制到了 SD 卡上，然后重新启动开发板，希望可以登录到新的文件系统上。由于系统并没有配置，所以要在启动参数上加上 `init=/bin/sh`。可结果还是启动失败，系统显示：

    warning: unable to open initial console

这是一个比较熟悉的问题，原因是 /dev/ 目录下没有 console 文件，建立好这个文件之后系统就可以正常启动了，之后需要运行：

    # mount -t proc nodev /proc
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin  dpkg --configure -a

可是这个过程也不顺利，dash 和 bash 都没有成功配置，通过网络搜索，找到了解决办法，需要先执行下面的命令：

    # /var/lib/dpkg/info/dash.preinst install

终于都配置好了。但在重启系统之前还要再修改几个系统配置文件，这个过程是在另外一台电脑上直接修改 SD 卡上的文件的方法实现的。需要修改的文件如下：

1. inittab 文件，增加在串口终端上的登录功能，即增加如下内容：

    T0:23:respawn:/sbin/getty -L ttyS2 115200 vt100

2. 去掉 root 用户的密码

再次启动的时候仍然失败，错误消息类似如下：

    udevd[45]: unable to receive ctrl connection: Function not implemented

这个问题明显是 udevd 造成，网上没有特别好的解决办法，好像要升级系统的内核，但鉴于我现在升级内核比较困难，我直接删除了 udevd 文件，这样就可以启动系统了，只是没有了自动生成设备文件的功能。

接下来的配置过程就比较简单了。只要安装好了 apt-get，一切就和一个普通的 Debian 系统没有什么区别，只要 apt-get install 就可以把一切搞定。

