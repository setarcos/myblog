---
title: peek into my mifare card
date: '2018-12-04 14:54:34'
tags:
    - hardware
---

校园一卡通是 Mifare 卡，一直想了解它的原理……

<!--more-->

# 入手 ACR122U 读卡器

MIFARE 是 NXP 公司的商标，主要用于利用 NFC 技术通信的低成本ID/IC卡。
网上找相关标准比较复杂，还是从工程的角度入手。淘宝购入 ACR122U 芯片
的读卡器，然后用相关软件对卡进行操作来增加对卡的认识。

读卡器到手之后在 Linux 下面无法正常工作，dmesg 显示错误消息：

```text
NFC: Couldn't poweron the reader (error -11)
```

以为是内核的问题，更新了 Debian 到最新版之后问题依旧。

# 安装驱动和软件

换个思路，在 ACS 下载了最新的驱动，并安装相关软件：

```bash
# dpkg -i libacsccid1_1.1.5-1~bpo9+1_amd64.deb
# apt-get install pcscd pcsc-tools
```

结果运行 pcsc_scan 之后，读卡器的红灯亮起，竟然开始工作了。
不过这个软件读到的只是卡的属性，并看不到具体的数据，继续安装了 nfc 软件

```bash
# apt-get install libnfc5 libnfc-bin libnfc-dev
```

使用 nfc-list 也只能读到ATQA（属性），UID（第一扇区前四个字节）和SAK（？）。

# 暴力破解

还需要下载一个强力的软件 mfoc，通过暴力破解获取数据。下载源码编译之后，运行

```bash
# ./mfoc -O mycard.mfd
```

就可以将数据完整读出了，但由于是暴力破解，所以需要的时间比较长。感觉
读一张卡片要 10 分钟左右，比 Windows 下面的软件要快一些，也更加稳定。

mfoc 读出数据的过程也把密钥获得了，将密钥保存到文件中，下次读卡的时候就会
快一些：

```bash
# ./mfoc -f keys.txt -O mycard.mfd
```

目前还有一个疑问，不同的校园卡用的密钥竟然不一样，这样如何管理呢？也许
密钥不唯一，暴力破解的时候就有可能得到不同的值，实际密钥会是不同的一个。

另外如果用校园卡做门禁，只要用到 UID 部分就可以，也不需要破解，速度很快。
