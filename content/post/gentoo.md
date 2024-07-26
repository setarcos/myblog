---
title: Install Gentoo
date: '2017-05-17 14:39:45'
tags:
    - linux
---

主机好久没有更新系统了，一直是 Debian 7，今天换个样。

<!--more-->

# Debian

本来想装 Debian 8 的，但前两天在 Hasee 机器上装的 Debian 8 有点不太满意
* grub2 启动 Windows 10 有时候会失败，切换回文本模式好像稳定性好一些。不过实际原因不确定
* 如果没插网线，启动过程超慢
* 对 systemd 有一点抵触
* 实验室其它机器已经装了 Debian，换个样

# 安装

Gentoo 也不是新朋友了，使用 Debian 之前的主力发行版，两年前在机器上也又装了一次，
但现在 `emerge --sync` 后无法升级，问题多多，只好重新安装。
一切按照 Handbook 安装，从 stage3 开始，没有出多少问题，之后配置其它软件的时候有一些状况。
简单记录一下：

* git-daemon 好像不需要安装，这个只是只读访问的一个服务
* git 用户安装的时候 `git-shell` 路径写错了，结果一直不能登陆，花了一些时间
* jfs 的一个旧文件系统不能挂载，一点提示消息都没有，结果最后 jfs.fsck 了一下就好了
* gentoo 的 `L10N` 和 `LINGUAS` 环境变量让我花了一些时间学习
* HP 打印机需要安装 `hplip`，结果它还依赖 `gnugp`，这个需要手动安装，然后才可以安装二进制插件

代码如下：

    $ hp-plugin
    $ sudo hp-setup

* vsftpd 安装后也不好用，最后增加了一个 `seccomp_sandbox=NO` 选项搞定。
* pip 直接安装的 hyde 也不能用，必须用 python2 版本的

可以使用 python2 指定用的 python 版本

    # python2 -m pip install hyde

* Qt5 的程序无法输入中文。这个问题以前我没有注意过，估计是发行版自己给修复了。

具体需要安装输入法模块的 Qt5 包，然后设置环境变量

    # emerge --ask fcitx-qt5
    $ export QT_IM_MODULE=fcitx

# 收获

* 发现 `lxterminal` 比较好用，依赖又不多，估计以后是我的主力 term
* 发现 mupdf 是个不错的阅读器（实际是在安装 gentoo 之前发现的）
* hackrf-tools、gqrx 和 gnuradio 等都通过 emerge 就可以安装，还是比较方便的
* pcmanfm 一个轻量级的文件管理器，通过配置文件关联，用 feh 查看图片非常方便
* feh 的快捷键 v 切换全屏，e 切换 exif 信息

# 存在问题

* fcitx 输入法在 LibreOffice 中经常会漏掉几个按键：部分拼音片段成为了英文。
* lxterminal ctrl+shift+v 粘贴的时候会粘贴两次
