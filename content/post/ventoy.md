---
title: play with ventoy
date: '2025-04-01 9:29:07'
tags:
    - software
---

准备使用 ventoy 制作一个多功能启动盘。

<!--more-->

# ventoy 简介

“Ventoy 是一个制作可启动 U 盘的开源工具”，项目主页上如是说。下载 GUI 版本的安装工具，
直接运行安装即可。安装过程会重新格式化我的 U 盘，我在安装前设置了空余一部分硬盘空间自用。
安装完成后，第一个分区是 fat32 分区，可以作为普通 U 盘使用，也可以放入 ISO 等映像文件，
Ventoy 启动的时候会自动找到可启动映像加入菜单，选择即可运行映像中的操作系统。支持大部分
的操作系统，一般使用非常方便。

# U 盘安装 voidlinux

之前空余的空间自然是用来安装一个正常的 void 发行版。我分了两个分区：一个 ext2 格式用来
做 boot 分区，一个 btrfs 用来一般使用。btrfs 分区设置了两个子卷，@void 用来作为根目录，
@home 用来作为个人目录。

直接使用下面命令安装基本系统：

```bash
# xbps-install -S -r /mnt -R "$REPO" base-system
```
其中 `/mnt` 是我挂载的根分区，`$REPO` 是我使用的镜像地址。安装完成后将我本地的 `/etc/rc.conf`
和 `/etc/default/libc-locales` 文件复制过去，手写一个 `/etc/fstab` 文件。使用 `xchroot` 命令
进入新文件系统，设置 root 的密码，使用 `xbps-reconfigure -f glibc-locales` 生成 locale 信息。

安装 grub 比较特殊，因为我不能安装到正常的 EFI 分区，那样会影响到 Ventoy 的启动，因此挂载了
boot 分区，将原来 boot 目录中的内容移动过去。建立 `/boot/efi/` 目录，然后运行下面的命令安装：

```bash
# xbps-install -S grub-x86_64-efi
# grub-install --target=x86_64-efi --efi-directory=/boot/efi --removable --no-nvram --force
```
使用 `--force` 参数是因为我的 efi 目录根本不是 EFI 分区，安装到这里只是为了将来使用 Ventoy
进行 chainloading。

最后执行 `xbps-reconfigure -fa` 确定所有的软件包配置成功。

# 配置 Ventoy 启动

在 U 盘的第一个分区设置一个 ventoy 目录，里面建立一个 `ventoy_grub.cfg` 文件，内容如下：

```text
set mygrub=/grub/x86_64-efi/grub.efi

menuentry "Enter the Void" {
    search --set=root --file $mygrub
    chainloader $mygrub
}
```
这样在 Ventoy 运行时按 F6 就可以看到我的菜单，并启动 U 盘上的系统了。
