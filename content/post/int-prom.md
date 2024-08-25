---
title: Integer promotion in C
date: '2013-12-17 11:15:24'
tags:
    - programming
---

虽然使用 C 语言已经很长时间了，但对于一些 C 语言的细节一直没有特别的注意，这次就遇到了在表达式中整型精度提升的问题。

<!--more-->

# 问题描述

问题的发现是在一个 C51 的单片机程序中。相关的代码如下：

```c
P4 = ~P4 >> 4;
```

本来很简单的一个语句，但在 sdcc 下面编译运行后却得到了令我意外的结果。我马上又使用 Keil C 进行了测试，结果就符合我的预期。那么它们的区别到底是什么呢？假如 P4 == 0x0F，那么对于 sdcc 结果是 0xFF，对于 Keil C 的结果是 0x0F，而后者是我想要的。通过对比二者生成的汇编代码，发现 sdcc 的汇编代码很长（20行），而 Keil C 的代码只有 4 行（预料之中），我根本没有仔细分析一下 sdcc 的代码就直接到它们的网站上去提交了一份 bug report。事实证明我有些太草率了。

# 问题分析

通过这篇文章的标题就可以知道问题的本质是什么，如果我仔细看一下 sdcc 生成的汇编代码，或者哪怕到 sdcc 的论坛上浏览一下：上个月就有个家伙问过类似的问题([虽然是从另外的方面](http://sourceforge.net/p/sdcc/discussion/1864/thread/bc2ed6ff/))，并得到了很好的解释。很快我的邮箱里面也收到了 Maarten Brock 的回复：

```text
I see nothing wrong here. C integer promotion rules require the P4 value to be upcast to an int and then have its bits inverted. And after that the resulting int is shifted down. Didn't you get a warning about the ~ operator having strange effects on operands smaller than int?

To get what you probably expected, you should either cast the ~P4 value back to unsigned char or assign it to an intermediate unsigned char variable and shift that down in a second operation.
```

可惜当时我仍然没有立刻领会了这段话的含义，又经过了几次实验才最终搞清楚。在进行 ~P4 >> 4 这个运算的时候，由于第一个取反之后还要进行其它的运算，所以必须在运算前提高 P4 的精度，对于前面的实例，P4 的值将在运算前变成 int 类型，在 C51 的环境中就是 0x000F，然后取反再右移就得到了 0xFFFF（包含符号位扩展），重新赋值给 P4 才使得它最终成为 0xFF。而这种行为是符合 C 语言的标准的，也就是说 Keil C 的行为不符合标准。

没过几天，我正好翻看 Linden 的 Expert C Programming，结果也看到了对 integer promotion 的分析，看来我的 C 语言知识还需要再补充一些。BTW，Linden 的这本书真的是非常的精彩，信息量很大，而且讲述也很有趣，非常推荐大家阅读。
