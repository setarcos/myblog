---
title: Hands on Launchpad G2
date: '2014-07-11 15:24:54'
tags:
    - embedded
---

前两天的 FPGA 展会上拿到了 TI 的“口袋实验室”，其中包含基于 MSP430 的 Launchpad。

<!--more-->

# 工具

TI 的首要工具自然是 CCS，但我还是喜欢免费的跨平台解决方案。TI 提供了 energia 这个开源工具，有点类似于 Arduino 的开发环境，打开界面就是编写 Setup 和 Loop 两个函数，这个也不太对我的胃口。

sf.net 有一个 [mspgcc](http://sourceforge.net/projects/mspgcc/) 的开源项目，但提供的只是补丁，集成起来比较麻烦。好在 github 上有人写了一个[安装脚本](https://github.com/jlhonora/mspgcc-install)，只要克隆这个项目并执行 install-all 就可以了。mspgcc 会被缺省安装到 /usr/local/msp430 目录。

```bash
$ git clone https://github.com/jlhonora/mspgcc-install.git
$ cd mspgcc-install
$ ./install-all
```

编程和调试工具是 [mspdebug](http://sourceforge.net/projects/mspdebug/)，直接 `make` 就可以安装，然后执行

```bash
$ sudo mspdebug rf2500
```

可以得到一个交互界面，运行 `prog blinky` 把我写的 blinky 代码写入到处理器，然后运行 `run` 就可以运行程序。或者也可以直接运行下面语句进行编程：

```bash
$ sudo mspdebug  rf2500 "prog ./blinky"
```

# 硬件

Launchpad 的硬件资源不多，只有两个 LED 灯和一个用户按键，但另外一块“口袋实验室”的硬件资源就丰富多了，比较醒目的就是它的那个 128 段液晶显示器了。不过这个液晶并不是 CPU 自己控制，而是通过 I2C 控制的一个 IO 扩展芯片来控制 LCD 控制器。呜呼，好麻烦。
