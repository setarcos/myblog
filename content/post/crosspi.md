---
title: Compile Qt application for raspberry pi
date: '2025-10-14 09:09:36'
tags:
    - software
---

在树莓派上开发和运行 Qt 应用程序时，编译是一个关键环节。本文将介绍三种不同的编译方法，
从最简单的本地编译到高效的跨平台编译。

<!--more-->

# 直接在树莓派上编译

这是最直接的方法：在树莓派上面安装 Qt 的相关依赖，下载程序代码，直接编译即可。但这种
方法的缺点是需要设置树莓派环境，启动开发板，步骤繁琐。

# 在 PC 使用 chroot 环境

这种方法利用内核的 binfmt 支持，使用 qemu 在 x86 主机上模拟 ARM 环境进行编译。主要步骤
是直接在 PC 上下载树莓派的文件系统映像，使用 chroot 进入到根目录中，利用 PC 处理器完成
编译。

这种方法的缺点是树莓派的文件系统包含的无关软件比较多，占用额外的磁盘空间。

# 使用 docker 环境

由于树莓派是基于 Debian 发行版，可以直接利用 Debian 的编译环境创建一个容器，Dockerfile
如下：

```Dockerfile
FROM debian:trixie-slim

RUN sed -i 's/deb.debian.org/mirrors.pku.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y build-essential qtbase5-dev qtbase5-dev-tools libqt5serialport5-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1000 builduser && \
    useradd -u 1000 -g builduser builduser

WORKDIR /build

USER builduser

CMD ["/bin/bash"]
```

使用下面命令生成映像文件：

```bash
$ docker build --platform=linux/arm64 -t pi-dev .
```

这样就可以用这个 docker 来编译树莓派工程了。可以通过 `-v` 参数将本地目录挂载到容器内部，然后
启动容器进行编译。

# 总结

使用 Docker 自然是最轻量的方案，还可以写成脚本自动完成编译。或者可以创建 CI 流水线，在代码托管
平台上自动完成编译。
