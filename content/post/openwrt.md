---
title: OpenWRT, wireless freedom
date: '2014-08-14 15:00:50'
tags:
    - networking 
---

OpenWRT 是一款开源的 Linux 发行版，主要用于各种无线路由器

<!--more-->

# Tp-link WR703N
## 入手

入手流行的 TL-WR703N 当前软件版本是 3.15.2 Build 130321 Rel. 37153n，硬件版本 v1。直接用 web 界面升级 openwrt-ar71xx-generic-tl-wr703n-v1-squashfs-factory.bin。然后在主机上执行 `dhclient eth1` 没有反应，重启硬件 `dhclient eth1` 还是没有反应，由于 OpenWRT 网站上说过成砖的先例，以为这次悲剧了。直接

    $ ifconfig eth0 192.168.1.100

ping 有反应，telnet 没有问题

    telnet 192.168.1.1
    Trying 192.168.1.1...
    Connected to 192.168.1.1.
    Escape character is '^]'.
    === IMPORTANT ============================
     Use 'passwd' to set your login password
     this will disable telnet and enable SSH
    ------------------------------------------
    BusyBox v1.19.4 (2013-03-14 11:28:31 UTC) built-in shell (ash)
    Enter 'help' for a list of built-in commands.

     _______                     ________        __
    |       |.-----.-----.-----.|  |  |  |.----.|  |_
    |   -   ||  _  |  -__|     ||  |  |  ||   _||   _|
    |_______||   __|_____|__|__||________||__|  |____|
             |__| W I R E L E S S   F R E E D O M
    -----------------------------------------------------
    ATTITUDE ADJUSTMENT (12.09, r36088)
    -----------------------------------------------------
     * 1/4 oz Vodka      Pour all ingredients into mixing
     * 1/4 oz Gin        tin with ice, strain into glass.
     * 1/4 oz Amaretto
     * 1/4 oz Triple sec
     * 1/4 oz Peach schnapps
     * 1/4 oz Sour mix
     * 1 splash Cranberry juice
    -----------------------------------------------------
    root@OpenWrt:/#

## 初始配置

缺省情况下 WLAN 是关闭的，而且 bridge 到了 lan 端口(Bridged AP Mode) ，想设成常见的路由模式（Routed AP Mode）,在它的 WEB 界面上配置了半天也没有搞定，最后还是直接修改配置文件。参考 http://wiki.openwrt.org/doc/recipes/routedap

## 允许 ssh 访问 wan 端口

It is real simple, just add to following to /etc/config/firewall:

    #open ssh on wan interface
    config rule               
           option src              wan
           option dest_port        22
           option target           ACCEPT    
           option proto            tcp 

And restart the firewall:

    # /etc/init.d/firewall restart

## 安装 NFS

703N 的 Flash 只有 4M，我又不想在上面接个 U盘，于是只有使用 NFS

    # opkg install nfs-utils kmod-fs-nfs
    # mount.nfs ip:/path /mnt

安装完 NFS 剩余的空间就只有300K左右了，以后的东西必须都要安装到 NFS 上，于是修改 opkg.conf 增加

    dest mnt /mnt

以后就可以用 -d mnt 安装到 /mnt 目录了。

## 安装 openvpn

安装的过程比较简单

    # opkg install kmod-tun
    # opkg -d mnt install openvpn

配置就比较麻烦了，折腾了一天半，记得的主要如下： 
    
1.增加一个接口

    config interface 'vpn'
           option ifname 'tun0'
           option proto 'none'

2.配置防火墙

    config zone
           option name 'vpn'
           option network 'vpn'
           option input 'ACCEPT'
           option output 'ACCEPT'
           option forward 'ACCEPT'
           option masq '1'
    config forwarding
           option dest 'vpn'         
           option src 'wlan'   

3.配置文件 把 wrt.crt, wrt.key, ca.crt 放到路由器上，openvpn 配置文件如下

    package openvpn
    config openvpn custom_config
        option enabled 1
        option client 1
        option dev tun
        option proto udp
        list remote "ip地址 1194"
        option resolv_retry infinite
        option nobind 1
        option persist_key 1
        option persist_tun 1
        option ca /mnt/etc/openvpn/ca.crt
        option cert /mnt/etc/openvpn/wrt.crt
        option key /mnt/etc/openvpn/wrt.key
        option comp_lzo 1
        option verb 3
        option mute 20

4.将 mount.nfs 命令和 /etc/init.d/openvpn start 写到 /etc/rc.local 里面

# 改装 MW151RM

wr-703n 在家里一直用，不能拿来玩，出差的时候买了个 MW150RM，结果被我弄成砖了，后来一直不死心，就买了个 MW151RM。这个 MW151RM的电路板和 wr-703n 一模一样（后来发现接上串口线后显示的信息都还是 tp-link），只是没有焊 USB host相关的器件。

改装的过程并不复杂，不过由于技术不精却没少了波折。主要过程如下：

1. 将 DDR 内存从8M换成64M
1. 将 Flash 从 2M 换成 8M
1. 写入新版的固件 

其中 DDR 内存的来源是海龙淘来的内存条，把内存芯片吹下来，再焊到路由器上。可把内存从路由器上吹下来的时候好几个焊盘都翘起来了，好在没有断，还可以修补，最终焊好内存顺利启动。

把 Flash 焊下来之后去找张老师读取里面的内容，结果发现读出来的数据不对，怀疑芯片坏了。然后再把这个 2M Flash 焊上去的时候发现板子无法启动了，以为芯片果然坏掉了。这样里面的 ART 数据岂不是读不出来了？按照 openWRT 网站上的说法，这个路由器就废了。

不过我还没有死心，利用家里 wr703n 的固件，直接写到 8M Flash 上面，然后焊到 151RM 上，结果依然无法启动，串口也没有任何输出。

再把原来的固件 Flash 焊上去，依然无法启动，抱着死马当活马医的态度，把 64M 内存重新用烙铁烫了一遍，结果奇迹出现，板子可以启动了，无线也正常。

再把 8M 的 Flash 焊上去，同样可以启动，而且由于利用了家里 wr703n 的固件，手机直接就连上了。看来用同型号的 ART 也没有问题。

先把板子装回盒子，玩几天再说

## 修改 MAC 地址

由于使用了 wr-703n 的固件，目前 MAC 地址和 703n 一样，通过分析 u-boot.bin 发现 MAC 地址写在 0x1fc00，这也通过网络获得了证实。不过修改 MAC 之后重写 flash 却无法启动 wifi。重新读取了原 flash，总算把 ART 读了出来，换上去之后还是无法启动 wifi。通过多方组合，发现只有 703n 的 MAC 可以启动 wifi，其它的都不行，于是开始怀疑固件。

因为固件是从路由器里面 dump 出来的，所以一些配置信息也被复制过来，原来是 /etc/config/wireless 的配置文件的问题。将里面的 mac 地址同步修改了之后就可以正常启动了。

## TTL 串口

对路由器的调试必须有串口的支持，板子上的 TP_OUT 就是串口的 TXD，TP_IN 就是 RXD，在启动路由器的早期快速输入 tpl 可以进入 u-boot 界面。
增加 USB Host

硬件改动：

1. 加焊usb接口
1. R101 R102 焊 22ohm 电阻（0402 的还是挺难焊的）
1. R112 焊 0ohm 电阻 

软件改动：

    # opkg install kmod-usb-storage block-mount block-hotplug kmod-fs-vfat kmod-nls-cp437 kmod-nls-iso8859-1 kmod-nls-utf8

然后还装了 3G 和摄像头的驱动，有空可以试试

    opkg install kmod-video-uvc kmod-usb-serial-wwan

# 编译安装 trunk

首先下载最新代码

    $ git clone git://git.openwrt.org/openwrt.git

配置界面和 buildroot 类似，选择了 tl-703n 的缺省配置，直接 make 就可以生成最后的 bin 包。把 sysupgrade 包拷贝到路由器的 /tmp 目录，然后执行

    # sysupgrade openwrt-ar71xx-generic-tl-wr703n-v1-squashfs-sysupgrade.bin

升级非常顺利：

    BusyBox v1.22.1 (2014-08-13 11:11:21 CST) built-in shell (ash)
    Enter 'help' for a list of built-in commands.

      _______                     ________        __
     |       |.-----.-----.-----.|  |  |  |.----.|  |_
     |   -   ||  _  |  -__|     ||  |  |  ||   _||   _|
     |_______||   __|_____|__|__||________||__|  |____|
              |__| W I R E L E S S   F R E E D O M
     -----------------------------------------------------
     CHAOS CALMER (Bleeding Edge, r42131)
     -----------------------------------------------------
      * 1 1/2 oz Gin            Shake with a glassful
      * 1/4 oz Triple Sec       of broken ice and pour
      * 3/4 oz Lime Juice       unstrained into a goblet.
      * 1 1/2 oz Orange Juice
      * 1 tsp. Grenadine Syrup
     -----------------------------------------------------
    root@OpenWrt:~# 
