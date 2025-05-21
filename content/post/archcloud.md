---
title: Dual boot voidlinux from cloud
date: '2024-11-06'
tags:
    - linux
---

云平台上并没有 void 的镜像，本文记录如何在一个新安装的 arch 云主机上，安装并配置 void。

<!--more-->

# 文件系统准备

在 arch 主机上使用的是 btrfs 文件系统，这会大大简化分区操作。首先看一下当前配置：

```bash
pluto@arch4 ~ > sudo btrfs su l /
ID 256 gen 126 top level 5 path var/lib/portables
ID 257 gen 126 top level 5 path var/lib/machines
ID 258 gen 61 top level 5 path swap
```

前面两个应该是 systemd 建立，目前都是空的，swap 是虚拟内存空间，需要保留。
由于还准备保留 arch，双系统共用 home 会比较方便，所以建立一个 home 子卷。

```bash
pluto@arch4 ~ > sudo btrfs su cr /@home
Create subvolume '//@home'
pluto@arch4 ~ > sudo cp /home/* /@home/ -a
```

然后设置 `/etc/fstab` 挂载 `home` 分区，添加如下内容：

```bash
UUID=<your-btrfs-device-uuid> /home btrfs subvol=@home,defaults 0 0
```

注意如果 `/home` 目录的权限是 700 的话，普通用户无法访问个人目录，需要改成 755。

重新生成启动配置文件，检查生成的文件是否合理：

```bash
pluto@arch4 / > sudo grub-mkconfig -o /boot/grub/grub.cfg
```

接下来把 arch 的 文件系统做个快照，以后作为 arch 的根目录，同时建立一个 void 的根目录。

```bash
pluto@arch4 / > sudo btrfs su sn / /@archroot
Create snapshot of '/' in '//@archroot'
pluto@arch4 / > sudo rmdir @archroot/@home
pluto@arch4 / > sudo btrfs su cr /@voidroot
Create subvolume '//@voidroot'
```

重启后确认文件系统挂载没有问题，删除原来根文件系统中的内容：

```bash
pluto@arch4 / > sudo mount /dev/sda3 /mnt
pluto@arch4 ~ > sudo find /mnt -mindepth 1 -maxdepth 1 ! -name '@archroot' ! -name '@home' ! -name '@voidroot ! -name swap -exec rm -rf {} +
```

此时必须重新安装一下 `grub`，否则可能进入到 grub rescue 模式（刚刚犯了这个错误）

```bash
pluto@arch4 ~ > sudo grub-install --efi-directory=/efi
```

# 安装 void

重启进入 arch 之后，挂载 `@voidroot` 目录：

```bash
pluto@arch4 ~ > sudo mount /dev/sda3 /mnt -o subvol=@voidroot
```

按照官方[安装文档](https://docs.voidlinux.org/installation/guides/chroot.html)安装 void。
需要注意的主要有以下几项：

1. 允许 dhcpd 和 sshd 两个服务，否则重启之后可能无法连上主机。

```bash
bash-5.2# ln -s /etc/sv/dhcpcd /etc/runit/runsvdir/default/
bash-5.2# ln -s /etc/sv/sshd /etc/runit/runsvdir/default/
```

1. 不重复安装 grub，使用 arch 的启动管理器，在 `/etc/grub.d/40_custom` 中
填入如下内容。

```bash
menuentry 'Void Linux' {
    set root='hd0,gpt3'
    linux /@voidroot/boot/vmlinuz-6.6.59_1 root=UUID=<your-btrfs-device-uuid> rw rootflags=subvol=@voidroot  loglevel=3 quiet console=tty0 console=ttyS0,115200
    initrd /@voidroot/boot/initramfs-6.6.59_1.img
}
```

1. 由于共享 home 分区，添加用户，注意 uid 和 gid 是否相同。
1. 注意用户的 sudoer 设置，使用户可以获得 root 权限。
1. 双系统使用不同的 ssh key 会让客户端很麻烦，因此将 arch 系统中的 key 复制到 void 系统中。
1. void 更新了内核之后需要更新 grub 的配置。

```bash
# mount /dev/sda3 /mnt
# vi /mnt/boot/grub.cfg
```
注意这里的 boot 目录不在根目录的子卷内，否则 grub 支持有问题。

另外 void 缺省使用隐私扩展的 IPV6 地址，这在 OpenStack 里面无法被路由，因此需要修改 `dhcpcd.conf`
设置 `slaac hwaddr`。

# 使用

在 arch 系统中，可以使用

```bash
sudo grub-reboot 'Void Linux'
```

来让系统在重启之后进入到 void 系统。但由于文件系统是 btrfs，grub 无法直接修改，使得之后每次
启动都会在 void 系统中。解决方法是在 void 中安装 grub 工具，不执行 `grub-install` 安装。
然后用 `grub-editenv` 修改 arch 的启动设置。

```bash
pluto@void ~ > sudo mount /dev/sda3 -o subvol=@archroot /mnt
pluto@void /mnt/boot/grub > grub-editenv grubenv set next_entry='Arch Linux'
```

这样就可以在重启后进入 arch 系统。
