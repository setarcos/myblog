---
title: D-Bus on Void Linux
date: '2026-06-16 02:00:00'
tags:
    - linux
---

D-Bus 是 Linux 系统下进程间通信（IPC）的核心基础设施，为应用程序与系统服务之间提供了标准化的消息传递机制。大部分发行版自动完成了相关的配置，但在 void 发行版下使用 D-Bus 需要更多的手动干预。

<!--more-->

# 简介

Linux 系统中各个组件之间需要频繁通信：网络管理器需要告知应用连接状态，系统服务需要互相协调。D-Bus 正是为了解决这个问题而诞生。

D-Bus 提供两种总线：**系统总线（system bus）**用于系统级服务通信，在 void 系统中由 dbus 服务负责启动；**会话总线（session bus）**用于桌面应用之间的交互，如通知、托盘图标和媒体控制，这个需要更多的手动干预，也是本文的重点。

# 会话总线

我习惯使用 LightDM 作为桌面管理器，以下讨论也基于这一前提，不同的 DM 可能表现不同。

## X11 下的极简配置

在使用 X11 的时候，我最初并没有使用 DM，登录系统后自动运行 `startx`（`.bashrc` 中会根据是本地登录还是远程登录有选择的执行）。因此我在 `.xprofile` 中添加了如下命令：

```bash
eval $(dbus-launch --sh-syntax --exit-with-session)
```
它会创建一个会话总线，并使用 `DBUS_SESSION_BUS_ADDRESS` 这个环境变量通知其它使用 D-Bus 的进程。这种方式即使到了后来我开始使用 LightDM 也可以正常工作。

## Wayland 下的配置

但我切换到 Sway 之后，使用 LightDM 无法正确设置会话总线，导致 waybar 启动失败。实际上，即使没有 `.xprofile` 中的设置，waybar 反而可以正常启动，会话总线也可以正常创建。其原因应该是 LightDM 使用 X11 会话启动，当启动 Wayland 的时候，D-Bus 认为 X11 会话已经结束，就自动退出了。但环境变量还在，导致 waybar 找不到文件。

虽然 waybar 可以自己启动 D-Bus 会话，但比较可靠的方式还是使用 `dbus-run-session sway` 来启动 Sway，这样可以保证会话总线可以覆盖图形界面的整个生命周期。

# 总结

在使用 DM 的前提下，无论是 X11 还是 Wayland，都没有必要手动在 .xprofile 中设置会话总线，只要修改会话的描述文件，改变启动命令即可。例如对于 Sway，只要修改 `/usr/share/wayland-sessions/sway.desktop` 中的 Exec 设置即可。
