---
title: try to install freedos on floppy
date: '2017-10-20 19:54:47'
tags:
    - software
---

对在实验室使用 FreeDOS 的一些问题的解决方案

<!--more-->

# 简介

FreeDOS 终于推出了 2.1 的版本，我也多次在我的电脑和虚拟机里面试用。既遇到了一些问题也找了一些解决方法。

# 主要问题及解决方法

## JWasm 无故死机

这个问题是李老师发现的。我在 Linux 下面使用 JWasm 的时候从来没有遇到过问题。经过仔细排查，发现是版本的问题，FreeDOS 2.1 带的 JWasm 不是最新版，有一些奇怪的 Bug，更新以后自然解决。

## edit 无法编辑大文件

受限于 DOS 段的大小，edit 无法编辑大于 64k 的文本文件。感觉这是一个很严重的问题，使我对 FreeDOS 有了负面的看法。缺省安装的编辑软件太弱了。当然可以选择安装 MSDOS 里面的 edit，但它并不是开源的。多亏后来找到了 FED 软件，是一个比较出色的编辑器，暂时还没有出什么问题。

## FDAPM 的问题

FDAPM 的问题在我第一篇 FreeDOS 的文章中提过，调用参数改成 ADV:REG 搞定

# 操作系统的保护

在公共机房安装 FreeDOS 还必须考虑操作系统的安全性。原来是通过硬盘保护卡来保证系统文件不被破坏，现在准备采用软件的解决方案。比较简单的就是将 DOS 系统作成一个映像文件，通过 Grub2 启动管理器来启动 DOS 系统。这样用户就无法很容易的破坏 DOS 系统文件了。

比较简单的是做一个软盘镜像

    $ dd if=/dev/zero of=btdos.img bs=512 count=2880
    $ /sbin/mkfs.msdos -F 12 -n "FREEDOS" btdos.img

然后启动 qemu 的 FreeDOS 把需要的文件拷贝进去。

如果要通过 Grub2 启动，还必须在 grub.cfg 中加入

    menuentry "DOS" {
        linux16 /boot/memdisk
        initrd16 /boot/btdos.img
    }

其中的 memdisk 是 syslinux 软件中所带，也要拷贝到 boot 目录下。

这样做的缺点是软盘的空间有限，不能放进去太多的程序，一个解决办法就是做一个启动光盘映像。制作光盘映像也要用到启动软盘，还要用 isolinux 的工具生成最终的可启动光盘。在设定 Grub2 启动项的时候，需要在 memdisk 后面加入 iso 参数，否则无法启动。

在 qemu 中测试通过的 iso 映像在实际硬件上竟然无法识别虚拟的光驱，最后通过 syslinux 中自带的驱动正常识别，顺便加上了光盘的 CACHE。AUTOEXEC 中的增加的代码如下：

    DEVLOAD /H /Q %dosdir%\BIN\ELTORITO.SYS /D:CDROM001
    DEVLOAD /H /Q %dosdir%\BIN\CDRCACHE.SYS CDROM001 CDRCACH$ 1024
    SHSUCDX /Q /D:CDRCACH$


