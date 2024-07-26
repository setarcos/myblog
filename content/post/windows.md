---
title: Install Windows10
date: '2018-05-09 08:51:10'
tags:
    - software
---

给实验室的电脑装 Windows，记录几个遇到的问题

<!--more-->

安装 Windows 过程本身没有什么问题，但也许是太长时间没有用过
Windows 系统，后续安装软件和配置的时候遇到了一些问题。

# 无法运行下载应用

系统安装完毕后需要运行激活客户端进行 KMS 激活，结果相关软件
确“无法运行”。结果是我太着急了，如果多等待一会就可以看到是
SmartScreen 把应用拦截了，由于网络还没有配置所以迟迟给不出
建议。解决方法要么关掉 SmartScreen，要么配置好网络。

# 系统自动下载应用

这是一个迷惑我很久的问题。在实验室里面安装的一个 Windows
加上必备应用占用空间 30G 左右。而在我办公室安装的同样配置
竟然要多占用几个 G 的空间。过了几天我才发现，原来是办公室
的网络环境好，自动下载了 N 个应用，包括游戏和一些垃圾软件。
卸载之后应该就没有问题了。网上资料显示，如果要防止自动安装，
可以增加如下注册表项：

    [HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\CloudContent]
    "DisableWindowsConsumerFeatures"=dword:00000001

# 使用 UTC 时间

部分电脑需要 Windows 和 Linux 共存，系统时间就成为影响使用
体验的一个麻烦。最好的办法还是让 Windows 使用 UTC 时间，也是要
修改注册表：

    [HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\TimeZoneInformation]
    "RealTimeIsUniversal"=qword:00000001

# 关于杀毒软件

这个部分的看法有分歧，官方和国外好多地方都说有了 WindowsDefender
就不需要安装杀毒软件了。但这里我持保留态度，主要对微软不是很信任，
因此还是安装了 ESET，希望更专业一些。安装了 ESET 后 WindowsDefender
的杀毒功能就自动关闭了，应该也不会影响性能。

