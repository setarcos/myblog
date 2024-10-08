---
title: Update BIOS for X1 Carbon
date: '2014-12-25 16:37:41'
tags:
    - linux
---

忽然想给用了一年多的 X1 Carbon 升级一下 BIOS，但没有 Windows 系统让这个任务变得有点难。

<!--more-->

# 缘起

原来的 BIOS 版本号是 2.56，现在最新的已经是 2.69，而且看到 Changelog 中有好多不错的更新，总是喜欢刷机的我自然不会放过这次升级。下载下来的升级包一种是在 Windows 下面直接运行的，一种是启动光盘。自然后者是较好的选择，剩下的问题就是如何启动这个光盘映像了。

# 启动盘

## grub-imageboot

最先尝试的一种方法就是 grub-imageboot，因为我知道 GRUB 自己就支持启动 ISO 影响，这种方法应该没有什么问题。

```bash
$ sudo apt-get install grub-imageboot
$ sudo mkdir -p /boot/images
$ sudo cp /your/downloads/my.iso
$ sudo update-grub
```

这样就可以在 GRUB 启动菜单里面增加一个启动项，重启选择这个启动项就应该可以了。可这种方法启动后竟然提示无法识别命令 linux16。原来在 UEFI 的环境下，GRUB 根本不知道 linux16 命令，也就是无法运行 16 位的代码，自然这条路就走不通了。

## El Torito

现在只好把系统的启动模式设置为 Legacy/UEFI 双模式，然后想办法用 USB 盘启动。一种方法就是将光盘中的 El Torito 记录读出来写入 USB 盘，然后用 USB 启动。

```bash
$ geteltorito my.iso > biosupdate.img
$ sudo dd if=biosupdate.img of=/dev/sdb bs=512K
```

可这种方法读出来的 img 文件只有 512K，感觉并不对，而且也无法启动。那个 ISO 文件不知道是什么格式，使用 mount 命令也看不到里面的内容。只好再换别的办法

## grub4dos

只好拿出了久违的 grub4dos，先是对 USB 盘进行分区，然后用 `sudo ./bootlace.com /dev/sdx` 来写入引导记录，然后拷贝过去 grldr，并编写一个 menu.1st 文件：

```text
title thinkpad-bios
map (hd0,0)/my.iso (hd32)
map --hook
chainloader (hd32)
boot
```

可惜刚开始的时候我一直把 /dev/sdb 写成了 /dev/sdb1，结果一直报错说不正确的分区表，害的我浪费了很多时间。最后终于写对了，然后成功启动了光盘映像。

# 更新 BIOS，恢复 Linux 启动

更新 BIOS 的过程并不复杂，可到了最后重启前的一个提示让我出了一些冷汗：将光盘留在光驱里面，按回车启动电脑。我使用的是虚拟的光盘，难道重启还需要使用光盘的内容？不过事实是并不再需要那个光盘，BIOS 会在下一次启动的时候更新 BIOS 和 ECP 的固件。

BIOS 更新成功后继续重启，结果还是出了问题，系统自动进入了 Windows 的系统恢复，原因是我的恢复分区没有删除，而 BIOS 只能找到这唯一的启动条目。此时我还没有意识到更新了 BIOS 后，UEFI 的启动列表就没有了，而缺省的启动程序是 EFI/Boot/bootx64.efi，而它只会启动 Windows 类型的操作系统。

此时我只好关机想办法如何能启动到 Linux 系统中。好在我还有一台 Ubuntu 的主机，我用它做了个 Ubuntu 的安装启动 USB 盘，不过这个启动盘是 i386 架构的，启动之后也无法运行我原来系统的程序，efibootmgr 也显示找不到 UEFI 的信息。这时候我没有意识到的是在非 UEFI 下启动，无论如何也访问不到 UEFI 信息。

之后的想法是在 USB 盘上安装 grub，用这个 grub 引导我原来系统的 Linux 操作系统。用到的 grub 命令如下：

```bash
# grub-install --force --no-floppy --boot-directory=/mnt/USB/boot /dev/sdx
```

自然在别的机器上安装的 grub 无法启动 X1 的系统，直接进入命令行界面

```text
grub> insmod part_gpt
grub> set root='(hd1,gpt3)'
grub> linux /boot/vmlinuz root=/dev/sda3
grub> initrd /boot/initrd.img
grub> boot
```

系统成功启动，但依然是无法使用 efibootmgr 命令更新 UEFI 信息，唯一的办法就是把 grubx64.efi 复制到 EFI/Boot/bootx64.efi 然后重启，终于看到了原来的系统启动菜单，登录后再运行 `update-grub2`，加入了 UEFI 的启动项。更新 BIOS 的工作才算最终完成。
