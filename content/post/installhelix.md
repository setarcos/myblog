---
title: Install Linux(Arch) to Thinkpad Helix
date: '2015-05-13 09:14:00'
tags:
    - linux
---

新买了个 Helix，当然要装 Linux

<!--more-->

# Debian

Helix 只能使用 UEFI 方式启动，没有 Legacy 模式，Debian 的安装盘都无法启动，实在没有办法了，只好下载了个 Arch，顺利启动安装。实际上后来证明 Debian 8.0 的安装盘是可以 UEFI 启动的，但为什么当时没有在 Helix 上启动成功就不知道了。

# Arch

Arch 的安装过程按照官网上的步骤也没有问题，但有几个地方还是让我花了一些功夫。

1. 安装的 fluxbox 无法设定缩放壁纸，必须安装 feh
2. gnome-terminal 启动失败，显示 `Error constructing proxy for org.gnome.Terminal`，原来还必须设置 locale.conf 用：`localectl set-locale LANG="en_US.UTF-8"`
3. 很多软件不是缺省安装，费了周折的同时也学了很多八百年永不到的命令
4. 电磁触摸屏 Wacom digitizer 好不容易配置可以使用了，但定位却不太准，在 .xprofile 里面加上 `xsetwacom` 的参数设置触摸屏的区域搞定

# 硬件支持

Linux 对 Helix 的硬件支持一直是我的痛，但经过了几个月的折腾，也算是差强人意了。电容屏直接就支持，电磁屏最开始必须要给内核打一个补丁才可以，到了 4.2 的内核，终于补丁被接受，打补丁的日子也就结束了。

显卡的支持原来也不太好，总会有屏幕闪烁的情况出现，但随着更新内核和 xf86-video-intel 的更新，问题也不知不觉的消失了。

声卡的支持是足足花了四个多月才最终搞定，一直都是内核不支持，只有 hdmi 的输出。后来在升级内核的时候忽然发现多了个声卡设备 `broadwell-rt286`，但配置了好久也是无法发生。今天（2015-09-30）决定和它死磕，通过 `aplay` 命令选择第二个声卡来播放，然后不断的用 alsamixer 设置不同的通道开关组合，结果终于听到了声音。然后就是找到 PulseAudio 设置缺省声卡的方法，在 `/etc/pulse/default.pa` 里增加了 `set-default-sink 1` 搞定。只是音量略低，不过好像 Windows 下也是如此就没有多理了。差点忘记一点，dmesg 命令曾经提示缺少一个固件，最后从 Windows 版的驱动里面拷贝了 `IntcPP01.bin` 过去搞定。选择声卡的方法也试了半天，最后用的是：

```bash
$ aplay Ring05.wav -D sysdefault:CARD=broadwellrt286
```
