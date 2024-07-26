---
title: Hands on Launchpad(part two) with ARM CM4
date: '2015-09-21 16:54:41'
tags:
    - embedded
---

一年前拿到的 Launchpad，今天再次拿出来玩，发现好玩不少...

<!--more-->

# 示例代码

原来没有玩转“口袋实验室”的原因是觉得硬件复杂，不愿意多花时间。可这次网上找到了示例代码，马上下载尝试一番。

首先示例代码都是为 CCS 写的，因此必然要做一些移植，主要有如下几个方面：

1. 头文件修改成 `msp430.h` 就好了，gcc 通过编译参数可以使用正确的设备头文件
2. `_enable_interrupts` 没有定义，需要使用 `__eint`，当然对应的还有`__dint`
3. `_nop` 要换成 `__nop`
4. `_bis_SR_register` 要换成 `_BIS_SR`，同样还有 `_BIC_SR`，如果用在中断中，还要加上 `_IRQ`

很快，128 段 LCD 就搞定了，但这个板接上口袋实验室就不能再扩展了，有点可惜，扩展和 LCD 暂时不能兼得阿。

# Launchpad with TM4C123G

另外一款基于 ARM CM4 的 Launchpad 也是去年拿到的，当时也没有找到合适的工具。今天也花了一些时间在网上寻找，就当快要放弃的时候找到了 [KernelHacks](http://kernelhacks.blogspot.com/2012/11/the-complete-tutorial-for-stellaris.html) 上的一篇文章，前面遇到的问题都迎刃而解。

首先，编程工具可以使用 Github 上的一个项目：[LM4Tools](https://github.com/utzig/lm4tools.git)，当然 Blog 里面也提到了可以直接用 OpenOCD 编程，这个以后再尝试。有 LM4Tools 一般就够了。

另外，从 TI 网站下载了 `SW-EK-TM4C123GXL-2.1.1.71.exe`，直接用 unzip 解压（以前我还傻乎乎的用 wine 解压）——必须先建个目录再解压，否则你懂的——进入到目录中后有 Makefile，于是 make，竟然马上就可以编译了，整个过程也没有出错。后来看了一下 PATH 变量，发现 arm-none-eabi-gcc 是在路径中的，真是万幸。

玩了几个示例后发现非常顺利，代码通通不用修改，示例中的 Makefile 完美的支持 gcc，LM4Tools 也很给力……


