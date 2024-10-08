---
title: Configure My X1 Carbon
date: '2014-12-08 20:16:36'
tags:
    - project
---

配置我的笔记本的过程

<!--more-->

# 初上手

2013-11-25 日拿到X1 3443-8BC，安装了 Debian 7.2，硬件基本都支持，指纹识别模块没有试，也不太需要。

规格书里面没有3G模块，不过 X1 后面有个 SIM 卡槽，但 lsusb 没有找到 3G 模块，看来卡槽是固定的。

硬盘的分区结构为：

```text
# partx -l /dev/sda
1:      2048-  2050047 (  2048000 sectors,   1048 MB)
2:   2050048-  2582527 (   532480 sectors,    272 MB)
3:   2582528- 22114303 ( 19531776 sectors,  10000 MB)
4:  22114304-315166719 (293052416 sectors, 150042 MB)
5: 315166720-336971775 ( 21805056 sectors,  11164 MB)
6: 336971776-351651839 ( 14680064 sectors,   7516 MB)
```

其中第 5 分区是用来恢复系统的，第 6 个分区是用来实现 Intel Rapid Start，可以在 BIOS 级别实现休眠的快速恢复。

# Power Consume 

在缺省的 3.2 内核下，最低亮度，关闭 wlan 和 BT，功率最低可以低于 4.5W（曾经看到过 4.26W 的读数）

同样条件下 3.12 内核的最低功耗只能到 7.0W 左右（最低看到 6.64W）还是有很大的差距。目前不知道是什么造成的。

增加了 /etc/modprobe.d/i915.conf 调整节能参数，参考了 archwiki 

```text
options i915 i915_enable_rc6=7 i915_enable_fbc=1 lvds_downclock=1
```

## laptop_mode 

安装了 laptop_mode 软件包来控制节能，主要是对各种内核参数的控制。

1. cpu 的 freqency scaling 的控制，目前选用 powersave，用来最大节能
1. LCD 亮度控制（有时候不好使）
1. 控制 bluetooth 关闭
1. 很多通过 powertop 看到的调整项都可以自动通过它设置正确

## 电池充电阈值

原来在 Thinkpad 上面用的 tp_smapi 在 X1 上已经不能用了。原因是新的 Thinkpad 取消了 smbus，因此只能使用比较新的 acpi 接口。不过目前 thinkpad_acpi 还不支持设置电池的阈值，通过 google 终于找到了这样两个工具。

1. acpi_call
1. tpacpi-bat 

前者是一个内核模块，可以用它直接调用 acpi 函数。tpacpi-bat 则是一个脚本，可以用来达到设置电池阈值的目的。最简单的用法如下：

```text
tpacpi-bat -s ST 0 40
tpacpi-bat -s SP 0 80
```

分别设置了开始充电的阈值为 40% 和结束充电的阈值 80%。

## 内核参数调整

CONFIG_X86_INTEL_PSTATE 参数有些奇怪，当我允许了这个参数的时候 CPU 频率一直很高，造成系统功耗降不下来。

CONFIG_FB_SIMPLE 如果不设置的话，最开始的启动信息看不到，不过这个可能和其它的设置有关 

# 直接用 UEFI 启动内核

1. 建立 /boot/efi/EFI/linux
1. 在这个目录中增加内核和initrd

运行下面命令

```bash
# efibootmgr -p 2 -c -g -L "Debian (EFI stub)" -l '\EFI\linux\vmlinuz' -u root=UUID=$UUID ro quiet rootfstype=ext4 add_efi_memmap initrd=\\EFI\\linux\\initrd.img
```

其中 -p 2 参数是由于我的 EFI 分区在 sda2

# 配置运行环境

## 终端模拟器

终端的选择主要是对中文的支持。gnome-terminal的中文支持不错，还有很好的 tab 支持，我之前一直使用这个。 可是 gnome-terminal 的内存占用有些大，对于我这种偏执狂来说，有些不太能接受。

xterm 的中文支持不是“与生俱来”的，经过了一番配置，终于有了比较好的效果。具体使用的 uxterm 来启动， 通过 .Xresources 来进行配置： 

```text
UXTerm*faceName: Bitstream
UXTerm*faceNameDoublesize: WenQuanYi Bitmap Song
UXTerm*faceSize: 10
UXTerm*metaSendsEscape: true
UXTerm*scrollbar: yes
```

其中那个 metaSendsEscape 用来保证我习惯的 readline 功能可以使用，否则 alt+. 都不好使了。

urxvt 经过了一番努力也没有把中文配置好（中文可以正常显示，但AntiAlias打不开），最后只好放弃。

## 桌面

gnome 对于我来说也太“大型”了，我更喜欢比较简单好用的WM，因此还是选择了比较熟悉的 fluxbox。

fluxbox 启动速度快，配置灵活，界面也比较美观，在笔记本上我一直使用它。不过这次我重新对它进行了配置。

1. toolbar 造成 fluxbox 唤醒的次数过多（通过 powertop 发现），因此不使用 toolbar
1. 使用了 Slit，用到了 wmclock，wmcpuload，和 wmacpi 三个 dockable app。
1. 配置使用了我比较喜欢的键盘绑定
1. 使用 unclutter -idle 2 来隐藏鼠标指针
1. 使用 syndaemon 来控制触控板，这部分下面详细说 

目前的问题是 fluxbox 和 xterm 的标题栏还不能显示中文，这个我暂时放下了。因为通过设置中文 locale 可以 解决 fluxbox 的问题，xterm 还是不行。而我目前暂时还是希望使用 en_US.UTF-8 的 locale

## 触控板

触控板的支持现在已经非常好了，通过 synaptics 驱动和对应的工具可以很好的处理各种常见问题。

首先使用 -R 启动 syndaemon，用来在使用键盘的时候禁止 touchpad。-R 是使用 XRecord 而不是 polling 来监控键盘，我觉得这样同样使得 syndaemon 可以更加省电。

另外使用 synclient 来控制一些参数，主要有如下几个方面：

1. TapButton1=1 来允许轻触触控板来触发鼠标事件
1. VertTwoFingerScroll=1 允许通过两个手指滑动来触发滚动
1. VertScrollDelta=-150 来允许类似 MacOS 的自然滚动方向
1. PalmDetect=1 来触发手掌检测（不过不是特别敏感） 

“TapButton2=3 TapButton3=2”不是特别好用，因为经常由于两个手掌的动作触发，造成很多麻烦，好在有 ClickButton2 和 ClickButton3。

因此还使用一个快捷键来切换 touchpad 的有效：

```text
OnDesktop Mouse6 :Exec synclient TouchpadOff=1
```

这个设置在 keys 中，由 Mouse6 触发：设置为双指向右滑动。
