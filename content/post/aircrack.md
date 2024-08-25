---
title: monitor the interface other than 802.3
date: '2014-05-06 23:30:11'
tags:
    - networking 
---

从前只用 wireshark 监听过有线以太网，这次尝试一下其它接口。

<!--more-->

# 问题描述

监听有线以太网比较简单，不需要特殊的设置，只要启动 wireshark 就可以自动把网卡设置在混杂模式下，可以监听到网线上的一切信息。但对于 wifi 就不一样了，一般情况下监听到只是用户数据，连以太网头部都是伪造的。

# 使用 aircrack

首先需要下载 aircrack，编译安装不在话下。之后的过程就比较简单了。

```bash
# ifconfig wlan0 down
# airmon-ng start wlan0
```

此时会多了一个 mon0 网络接口，启动 wireshark 监听这个接口就可以看到 802.11 协议的内容了。

如果能监听到握手数据包，再配合密码本，就可以使用 aircrack 来破解网络密码了，这个可以使用 aircrack 自带的示例报文 wpa.cap 来测试，如果要实际运用可能需要一个比较好的密码本。

# 恢复 wifi 功能

如果要恢复 wifi 上网，还需要执行下面的命令

```bash
# ifconfig mon0 down
# airmon-ng stop wlan0
# ifconfig wlan0 up
```

# 监听 USB 接口

USB 接口的监听（sniffer or monitor）在 Linux 操作系统中有很好的支持，只要加载 usbmon 模块（在 Driver/USB 下面）就可以了，不过需要内核支持 DEBUG_FS（CONFIG_DEBUG_FS 在 Kernel Hacking/Compiler options/Debug Filesystem 下面，这个太容易让人误解为对文件系统的调试了）。关于 usbmon 在内核文档中有详细的说明，我们只需要执行下面两步，就可以通过 wireshark 监听了。

```bash
# mount -t debugfs none_debugs /sys/kernel/debug
# modprobe usbmon
```

通过 lsusb 命令可以知道要监听的设备在哪条 USB 总线上，然后在 wireshark 中的接口列表中选择相应的总线即可。

使用 wireshark 监听到的并不是真正在 USB 总线上传输的电信号，而是从操作系统角度看到的 USB 的协议交互过程。比如可以看到读取描述符，读取配置信息，和对 USB 的配置进行设置等。最重要的是可以看到主机与 USB 的各个端点的通信过程，这对协议分析是最重要的。

需要注意的是，有时候可以看到 0 字节的 BULK IN 请求，这应该是主机软件提出了异步的输入请求，这样就可以同时进行两个方向的传输，提高 USB 总线的效率。
