---
title: Install Qt5.2.0 to Mac
date: '2014-01-15 10:14:11'
tags:
    - programming
---

在 Macbook Air 上安装 Qt5.2.0

<!--more-->

从前 MBA 上安装的是 Qt4.7.4，今天下载了 5.2.0 版本，结果安装的过程竟然出了一些问题。

首先是安装过程出错，出错信息是

    Command install_name_tool failed

一共出现两次，分别对应于一个 QtQuickMultimedia 和一个 QtBluetooth 的库，考虑到这两个部分可能不会用到，我选择了 Ignore 继续安装。

安装之后看起来都正常，结果 qmake 竟然也失败，说找不到 macx-clang 配置文件。使用

    $ qmake -query

查询一下，发现 Qt 所默认的路径都是 /usr/local，和安装的路径选择不一致。于是在 /usr/local 下面建立了一个对于我安装目录的符号链接，具体的链接为

    Qt-5.2.0 -> /Users/myuser/Qt5.2.0/5.2.0/clang_64/
