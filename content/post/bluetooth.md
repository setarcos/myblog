---
title: Use bluetooth under debian
date: '2015-01-29 15:05:47'
tags:
    - networking
---

一直有个蓝牙键盘闲置，今天在 Debian 系统中尝试使用……

<!--more-->

网上找到的资料都比较老，用起来经常达不到必要的效果。首先是要确定主机的蓝牙模块正常。

    $ hcitool dev
    Devices:

如果 Devices 下面的列表是空的，就表明无法识别主机设备，说明内核驱动没有正确加载。编译内核的时候花了好长时间找 bluetooth 相关选项，很意外发现竟然在 Networking 条目下，对应的驱动模块是 btusb。

加载了驱动之后，使用 bluetooth-wizard 可以连接到键盘，并能正常使用。不过重启之后还需要重新连接，这非常不方便。网上存在一些脚本可以自动连接键盘，但最后都被证明并不是必须的。

至少以下几个说法在我的情况下都不是必须的：

1. 增加 `/etc/bluetooth/hcid.conf`
1. 修改 `/etc/default/bluetooth` 设置 `HID2HCI_ENABLED=0`

需要做的只是：

    bluez-simple-agent hci0 xx:xx:xx:xx:xx:xx
    bluez-test-device trusted xx:xx:xx:xx:xx:xx yes
    bluez-test-input connect xx:xx:xx:xx:xx:xx

如果第一步出错：`org.bluez.Error.AlreadyExists: Already Exists` 只要在第一条命令后面加上 `remove` 然后重新执行就可以了。这样设置好之后，重启依然有效，键盘可以自动连接。

