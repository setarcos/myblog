---
title: HackRF handon
date: '2017-05-09 14:38:22'
tags:
    - hardware
---

买了一对儿 HackRF，学习使用软件无线电

<!--more-->

# 安装

拿到 HackRF 立刻准备安装相应软件进行测试。我使用的环境是 Debian 7.6，版本有点老，所以后面好多工具版本都不够，
也许我真的该升级一下系统了。

首先下载最新的 hackrf 代码

```bash
$ git clone http://github.com/mossmann/hackrf.git
$ cd hackrf/host
$ mkdir build
$ cd build
$ cmake ../ -DINSTALL_UDEV_RULES=ON
$ make ; sudo make install
$ hackrf_info
```

看起来一切正常，而且好像可以两个 hackrf 一起在一个机器上用。

然后是安装 GrOsmoSdr，应该是个必须的中间件，具体用途还需要以后研究

```bash
$ git clone git://git.osmocom.org/gr-osmosdr
$ cd gr-osmosdr
$ mkdir build
```

后面的 build 过程省略，由于 boost 版本不够，还通过源代码安装的方法更新了 boost。
更新了 boost 后，原来安装的 gnuradio 又不好使了，重新编译 gnuradio。

另外安装了gqrx，此软件功能不明，是用 QT 写的，好像是个频谱分析仪之类，安装的时候
采用了源码安装，结果说 cmake 版本不够，同样对 cmake 进行了更新。结果编译 gqrx 的时候
又说 PulseAuduio 有什么问题，后来没有使用 cmake，而是用 qmake 编译通过

```bash
$ git clone https://github.com/csete/gqrx.git
$ cd gqrx ; make build
$ qmake ../ ; make ; sudo make install
```

HackRF 店家提供的手册上说更新固件需要 dfu-util，于是对它进行了安装

```bash
$ git clone git://git.code.sf.net/p/dfu-util/dfu-util
$ ./autogen.sh ; ./configure; make; sudo make install
```

不过最后没有用到这个软件。因为从 hackrf github 的 wiki 里面看到好像不一定必须使用
这个工具，而是直接使用 hackrf_spiflash 烧写固件。

```bash
$ git submodule init  # 在 hackrf 目录中
$ git submodule update
$ cd firmware/libopencm3/
$ make -j 4
$ cd ../hackrf_usb/
$ mkdir build; cd build; cmake ../ ; make -j 2
$ hackrf_spiflash -w hackrf_usb.bin
```

之后用 hackrf_info 看结果如下（不升级不安心）

```text
hackrf_info version: git-9bbbbbf
libhackrf version: git-9bbbbbf (0.5)
Found HackRF
Index: 0
Serial number: 0000000000000000xxxxxxxxxxxxxxx
Board ID Number: 2 (HackRF One)
Firmware Version: git-9bbbbbf (API:1.02)
Part ID Number: 0x******* 0x*******
```


# 使用 HackRF

经过与卖家沟通，可以通过 gqrx 实现 FM 的功能。原来 gqrx 就是一个软件的调制解调器，
可以设定频率，然后选择解调方式（FM），然后通过耳机放出来。具体的说明见[这个链接](http://blog.csdn.net/opensourcesdr/article/details/51911220)

