---
title: emptty, CLI Display Manager on TTY
date: '2026-06-18 02:00:00'
tags:
    - linux
---

emptty 是一个极简的命令行显示管理器（Display Manager），运行在虚拟终端上，允许用户在登录后选择桌面环境或窗口管理器，也可以配置为自动登录。它不需要 systemd-logind 或 agetty，既可以作为 agetty 的替代，也可以以守护进程模式独立运行。

<!--more-->

# 简介

之前在使用 lightDM 的时候，由于 lightDM 基于 X11 环境，因此当启动 Sway 的时候，就会有明显的卡顿：从一个 X11 环境退出，并启动 Wayland。所以我希望找到一款不依赖图形环境的极简 DM，于是找到了 emptty。它只是一个运行在 TTY 上的文本界面，提供用户登录、会话选择，然后启动你选定的桌面会话。不论 X11 还是 Wayland 都可以快速启动。

# 安装与基本配置

emptty 的配置文件位于 `/etc/emptty/conf`，我主要修改了如下配置：

## 使用缺省用户

```ini
DEFAULT_USER=your_username
```
对于个人电脑，一般只使用固定的用户，设置缺省用户后就不必每次输入，提高效率。其实它还有一个 `SELECT_LAST_USER` 配置，可以记住最后一次登录的用户，也很方便，但需要多回一次车。

## 启动会话前运行脚本

emptty **不会**自动加载用户的 `.profile` 或 `/etc/profile`，这是很多用户遇到的第一个坑。如果你依赖这些文件来设置环境变量（如 `PATH`、`LANG`、`EDITOR` 等），就需要手动配置。项目主页上就有示例，比如我的 `~/.config/emptty` 文件如下：


```bash
#!/bin/sh
Selection=true

. /etc/profile
. ~/.xprofile

exec dbus-launch $@
```

这个文件实际上是一个脚本，`Selection` 设置为 `true` 表示 emptty 在登录时依然提供会话选择，最后的 exec 用来运行最终的桌面会话。如果 `Selection` 设置为 `false`，emptty 就不会提供选择会话的机会，脚本最后必须负责启动会话。

# 总结

emptty 的核心优势在于简洁，但功能还是不够完备。比如我希望它可以首先列出全部会话与缺省选择，用户可以通过 Fn 选择第几个会话（当然也可以不选采用缺省），这样就可以在登录时少按一次回车。另外还希望增加关机或者重启的快捷键，同样也是比输入命令更快捷些。
