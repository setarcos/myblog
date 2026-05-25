---
title: From i3 to Sway
date: '2026-05-24 04:08:08'
tags:
    - software
---

Wayland 相比 X11 具有更现代的架构、更好的安全性、更流畅的渲染表现。对于平铺窗口管理器用户来说，
Sway 是 i3 在 Wayland 生态中的完美替代品——它直接兼容 i3 配置文件，迁移成本极低。

<!--more-->

多年之前曾经做过一次迁移，体验并不好，需要写一个脚本才启动成功，尝试了一下就放弃了。
这次直接使用 lightdm 管理，界面上选择 Sway 就轻松的切换过来了，原来的 i3 配置竟然一点都不用改，
大部分功能都可以使用。这里记录一下后续的迁移过程。

# 配置文件

## 触控板设置

之前使用 xinput 命令设置触控板，现在直接在配置文件中设置即可：

```bash
input type:touchpad {
    tap enabled
    natural_scroll enabled
}
```

## 窗口自动工作区布局

之前可以使用 `assign [class="Firefox"] $ws2` 将 Firefox 缺省放到特定的工作区，在 sway 中需要把
`class` 换为 `app_id`。部分程序不遵循 Wayland 的协议可以使用 `instance` 来识别。比如 VncViewer：

```bash
assign [instance="vncviewer"] $ws5
```

## 不支持的选项

`bindsym $super+Shift+r restart` 这个 `restart` 在 sway 中无效，只能使用 reload 来重新加载配置文件。

`feh`，`picom`，`scrot` 之类的命令都不被支持了。`xscreensaver` 竟然还可以用，也许是通过 XWayland 的支持。

* 之前使用 feh 设置壁纸，现在可以使用 swaybg 替代：

```bash
exec_always swaybg -i /path/to/wallpaper.png -m fill
```

* 之前使用 `scrot` 截图，现在可以用 `grim` 和 `slurp` 组合完成同样的功能。

```bash
bindsym --release Print exec grim -g "$(slurp -d)" - | wl-copy -t image/png
```

其中 `wl-copy` 用来把图像放到剪贴板，之前的 `xclip` 也不能用了。

## 多显示器

显示器的命名也和 x11 不一样，编号缺省从 1 开始，而 x11 是从 0 开始的。对显示器的配置也
比较直观：

```bash
swaymsg output HDMI-A-1 transform 180
swaymsg output HDMI-A-1 mode 720x400
swaymsg output HDMI-A-1 position 0 0
swaymsg output DP-1 position 0 400
```

# 其它杂项

## nvim 剪贴板

迁移到 Wayland 后，nvim 无法使用系统剪贴板。实际只要安装 `wl-clipboard` 就可以无缝解决。

## 系统托盘图标

sway 自带的 bar 总是无法显示托盘图标（高版本好像就支持了，目前 void 带的版本比较低），只好更换为 waybar，它使用 css 配置外观，定制性很强。

