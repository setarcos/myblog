---
title: Hands-on the BeagleBone Black
date: '2014-07-07 21:00:08'
tags:
    - embedded
---

刚刚购买了 BeagleBone Black 中国版，安装和调试的过程记录

<!--more-->

# 初上手

在淘宝上购买了包含 4.3 寸 LCD 的 BeagleBone Black（以后称作 BBB）开发板，到手后直接上电，发现板子运行的是 Debian 系统，而且运行了 avahi 服务，可以直接使用下面的命令登录，其中 root 的密码是空，同时板子的网口也必须接好网线。

```bash
$ ssh root@beaglebone.local
```

接上 USB Client 接口之后会识别出一个 U 盘和一个串口，通过 U 盘可以非常方便的和开发板交换文件。

预安装的发行版是 BeagleBone 的官方版本，并不支持这次购买的一系列外设，因此根据淘宝上提供的资料，下载了商家提供的文件系统。商家提供的是一个 img 文件，通过 dd 命令可以写入到 TF 卡中，然后按着“启动选择”按钮接通电源，系统就可以从 TF 卡启动（否则是从板载的 eMMC 存储器启动）。

为了使用 LCD 屏，还必须更换启动时使用的 dtb 文件，商家提供了一个 test_lcd4.3 命令来完成。重启开发板后，LCD 还是没有亮，突然意识到可能是 USB 供电不足，接上一个 5V 电源之后再启动就没有问题了。

# 文件系统结构

无论是 eMMC 存储还是 TF 卡，文件系统的组织结构都是类似的。首先 mmc 必须分成两个分区：一个是 VFAT 格式，保存了 MLO，u-boot 和 uImage；另一个是 Linux 格式，是最终的 root 文件系统。

官方支持的文件系统安装方式是从网站下载文件名带 flasher 的 img 映像，写入 TF 卡并用这个卡启动后就会自动把文件系统写入到 eMMC 中，如果做自己的写入工具，就必须对这个映像进行修改。网上可以找到一个 emmc_prepare.sh 脚本做这件事，实际上就是更新第二个分区里面 build 目录中的 MLO 等文件，并更新脚本中的 MD5 校验。

BBB 板的启动过程是首先内部的 ROM 执行，然后会根据 Boot 管脚的设置按照一定的顺序查找启动介质（通过启动按钮可以改变这个顺序，也就是使用 TF 卡启动的原理），如果是 MMC 卡启动就会从里面的 VFAT 分区里面找到 MLO（称为 x-loader）加载到 SRAM 中执行；而 MLO 会进一步加载 U-Boot 到 DDR 内存启动；最后才会由 U-Boot 启动 Linux 操作系统。

# 使用 buildroot 生成文件系统

官方的文件系统无论是基于 Debian 的还是基于 Angstrom 的，都要超过 1G 空间，给出的映像文件都大于 2G，因此至少要 4G 的 TF 卡才能安装。而如果使用 buildroot 就要精简多了。生成的文件系统只有几兆大小，比较适合教学使用。

首先下载了 `buildroot-2014.05` 的稳定版，里面就有对 beaglebone 的支持，因此只要执行：

```bash
$ make beaglebone_defconfig
```

就可以获得一个基本的配置，只要在这个基础上修改就可以了。

1. 首先使用了 Linaro_2014.02 版本的工具链，减少下载和编译工具链的时间
2. 文件系统设置为读写方式
3. 增加了 dropbear 等软件
4. 选择 tar.gz 格式的文件系统

最后生成的包括 MLO，u-boot，zImage，dtb 文件 和 root.tar.gz。

清空 TF 卡两个分区的内容，把 MLO，u-boot.img，zImage，dtb 文件放到 vfat 分区，再把 root.tar.gz 解压到 ext2 分区。

还缺少的是 uEnv.txt 文件，这个是 U-Boot 的配置文件，里面可以写入 U-Boot 的配置信息，这个配置文件所涉及到的命令不是很熟悉，最后好不容易修改好后的样子是这样的：

```text
console=ttyO0,115200n8

kernel_file=zImage

loadaddr=0x82000000
fdtaddr=0x88000000
fdt_high=0xffffffff

loadkernel=load mmc ${mmcdev}:${mmcpart} ${loadaddr} ${kernel_file}
loadfdt=load mmc ${mmcdev}:${mmcpart} ${fdtaddr} /dtbs/${fdtfile}

loadfiles=run loadkernel; run loadfdt
mmcargs=setenv bootargs console=tty0 console=${console} ${optargs}\
${kms_force_mode} root=${mmcroot} rootfstype=${mmcrootfstype} noinitrd

uenvcmd=run loadfiles; run mmcargs; bootz ${loadaddr} - ${fdtaddr}
```

主要是根据 Debian 发行版带的 uEnv.txt 修改，去掉 initrd 部分得到的。
