---
title: Play with android
date: '2018-05-20 19:58:40'
tags:
    - software
---

Google 现在好像不太支持命令行工具了，android 命令即将废弃，好像
已经没有办法只用命令行工具完成 Android 开发了。

<!--more-->

# 安装 SDK

只安装了 SDK 之后其实离开始工作还有很大距离。运行 `sdkmanager --list`
可以看到能安装的组件，然后就可以用 `sdkmanager` 安装，例如

```bash
$ sdkmanager "emulator;platform-tools"
```

# 建立虚拟机

建立虚拟机可以用 avdmanager 命令，例如：

```bash
$ ./avdmanager create avd -n test2 -k "system-images;\
android-25;google_apis;arm64-v8a" -d "Galaxy Nexus"
```

其中 `-d --device` 参数在手册里面都没有提，在执行 `create avd`
命令的时候可以看到相关的提示。而可选的设备列表在 `lib/devices.xml`
文件中可以找到。

# 启动虚拟机

```bash
$ ./emulator -avd test2
```

这个命令在执行的时候有可能报告 libGL 的加载失败，可以在运行前指定：

```bash
$ export ANDROID_EMULATOR_USE_SYSTEM_LIBS=1
```

# 建立新工程

原来的 `android create project` 命令已经不被支持，目前只能使用 android
studio 建立工程。
