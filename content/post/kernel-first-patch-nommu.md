---
title: My first kernel patch - the prompt shows (none) on a noMMU board
date: '2026-11-15 01:30:00'
tags:
    - linux
    - software
---

2024 年 6 月 11 日，我给内核发了第一个 patch。最后进 mainline 的改动只有两行：把
`arch/arm/mm/fault.c` 里的 `#ifdef CONFIG_MMU` 往上挪两格，让紧挨着的那个函数也落进 MMU 的
范围里。它修的是 STM32F469-Disco 上一个很不起眼的现象：shell 提示符里本该是当前路径的位置，
变成了 `(none)`。
<!--more-->

# 症状

板子是 STM32F469-Disco，Cortex-M4，跑 noMMU 的 Linux——没有 MMU，内核和用户态挤在同一个扁平
地址空间里。板上是 busybox 的 userland，提示符里带 `\w`，平时长这样：

```text
/ #
```

换到 6.9 之后的内核，那个位置变成了：

```text
(none) #
```

文件系统使用 buildroot 构建，我第一反应是 rootfs 或者 busybox 配置的问题，折腾了一圈没有
结果；换回旧内核又一切正常，这才把方向转回内核。

调试的办法是 bisect。板上跑的是自己编的内核，编译、刷进去、开机看提示符，一步一步往收敛，
最后落在 `169f9102f9198b` 上——一个只加了一个函数的 commit。bisect 只告诉我"是它"，为什么
坏还得自己从代码里捞。

# 那个判断

`169f9102f9198b`（ARM 9350/1）是 Kees 写的，改动就是一个新函数：

```c
bool copy_from_kernel_nofault_allowed(const void *unsafe_src, size_t size)
{
	unsigned long addr = (unsigned long)unsafe_src;

	return addr >= TASK_SIZE && ULONG_MAX - addr >= size;
}
```

有 MMU 的时候它是对的：用户空间在 `TASK_SIZE` 以下，内核在以上，所以这个检查的含义是"别借
`copy_from_kernel_nofault()` 去读用户地址"。加它的理由很具体——PAN 模拟打开时，打印栈回溯的
`dump_instr()` 读到了用户地址，double fault 直接把 CPU 挂死（Mark Brown 报的，Russell 提的
思路）。

noMMU 上这个前提根本不存在。`arch/arm/include/asm/memory.h` 里，`CONFIG_MMU` 关掉时
`TASK_SIZE` 就是 `ULONG_MAX`：

```c
/*
 * Fortunately, there is no reference for this in noMMU mode, for now.
 */
#define TASK_SIZE		UL(0xffffffff)
```

注释里那句 "no reference" 当时已经不成立了。`addr >= TASK_SIZE` 对所有真实地址恒为假，
`copy_from_kernel_nofault()` 在 noMMU 上一个字节都读不出来，一律返回 `-EFAULT`，而且不报错、
不打日志，就那么静默地失败。

修法不是把这个判断改对，是让它别在 noMMU 上出现：把 `#ifdef CONFIG_MMU` 挪到函数前面，
noMMU 就退回 `mm/maccess.c` 里的 `__weak` 版本，直接 `return true`。

```diff
--- a/arch/arm/mm/fault.c
+++ b/arch/arm/mm/fault.c
@@ -25,6 +25,8 @@
 
 #include "fault.h"
 
+#ifdef CONFIG_MMU
+
 bool copy_from_kernel_nofault_allowed(const void *unsafe_src, size_t size)
 {
 	unsigned long addr = (unsigned long)unsafe_src;
@@ -32,8 +34,6 @@ bool copy_from_kernel_nofault_allowed(const void *unsafe_src, size_t size)
 	return addr >= TASK_SIZE && ULONG_MAX - addr >= size;
 }
 
-#ifdef CONFIG_MMU
-
 /*
  * This is useful to dump out the page tables associated with
  * 'addr' in mm 'mm'.
```

# 为什么偏偏打在提示符上

`\w` 展开成什么，是 shell 调 `getcwd()` 拿到的。`getcwd()` 在内核里是 `fs/d_path.c` 的
`SYSCALL_DEFINE2(getcwd)`，它从 dentry 一层层往上把路径拼回来，每拼一段都走
`copy_from_kernel_nofault()` 读 dentry 名字（`prepend_copy()`，用 nofault 是为了兜住并发
rename 的窗口）。读失败的时候它不报错，只把名字填成 `x`、把长度标记成无效：

```c
static bool prepend_copy(void *dst, const void *src, int len)
{
	if (unlikely(copy_from_kernel_nofault(dst, src, len))) {
		memset(dst, 'x', len);
		return false;
	}
	return true;
}
```

长度无效以后，`getcwd()` 算出来的结果比 `PATH_MAX` 还长，于是返回 `-ENAMETOOLONG`。shell
拿不到路径，提示符就退成了 `(none)`。回头看，`pwd` 当时必然也是坏的，只是我没在意。

# 报告

6 月 11 日，bugzilla 提了 218953，产品选 `Memory Management / Other`，Hardware 填 `ARM
Linux`，正文很短：贴了 patch，写了一句"for devices without MMU, addr > TASK_SIZE will
fail. I'm using stm32, not sure for others"。

同一天把 patch 发到了 linux-arm-kernel，然后自己补了一句：

> Also sent a patch to the linux-arm-kernel maillist.
> But I forget to CC anyone...

第二天重发了一遍，这次把 Ard、Russell、Kees、Andrew、Mark、Ben 都 CC 上了。Ard 五个多
小时后回复，先质疑，再给 Ack：

> Is that true? Doesn't it depend on the physical memory layout of the platform in question?
> ...
> Acked-by: Ard Biesheuvel <ardb@kernel.org>

我把 `memory.h` 里那段定义和注释贴了回去。Ard 回了一句 "OK, I stand corrected. Thanks for
the explanation."——到这里，技术上就没有争议了。

然后安静了三周。

# 三周之后

7 月 1 日，Thorsten Leemhuis 把这封邮件从列表里捞了出来：

> What happened to this fix regression for a 6.9 regression? From here it looks like it
> fell through the cracks, but I might be missing something.

顺手还纠正了一个格式问题：引用 bugzilla 不该写 "Also reported at"，应该用 `Closes:` 标签，
这样 bug 能自动关掉，回归跟踪器也认。当天两封回复把路铺好了——Kees 说这个 patch 可以走
Russell 的 ARM tracker，但如果急，他可以直接从自己的树带走（"It has Ard's Ack"）；Russell
说自己被一件高优先级的活埋住了，今晚才看到这个线程。

最后走的是 Kees 的树。7 月 15 日 `hardening updates for v6.11-rc1` 的 pull request 里带着它，
7 月 16 日合并（`ce5a51bfacf7`），v6.11-rc1 是 7 月 28 日。最终提交里的 tag 就是 Thorsten
建议的那两个：

```text
Closes: https://bugzilla.kernel.org/show_bug.cgi?id=218953
Fixes: 169f9102f9198b ("ARM: 9350/1: fault: Implement copy_from_kernel_nofault_allowed()")
Link: https://lore.kernel.org/r/20240611100947.32241-1-yangyj.ee@gmail.com
```

修复没有进 6.10——7 月 11 日 Thorsten 那份"即将错过 6.10 的回归清单"里就有它一条。8 月 3 日
的 6.10.3 才带上。更老的 LTS 更晚：2025 年 4 月，因为有人向 stable 提了一批 ARM mm 补丁的
cherry-pick 请求，它才回灌进 5.4.292、5.10.236、5.15.180、6.1.133、6.6.86。

顺带一提，第一次发 patch 的三天后，我又提了一个 `stm32f429` 的 dts 补丁
（`0fc78aa67b3f`，syscfg 少了 clocks），两个都落在同一个 v6.11 合并窗口里。

# 几点体会

**bisect 是唯一不需要懂代码的定位手段。** 我对 noMMU 那条路径一无所知，能做的只有"6.8 好、
6.9 坏"，然后一步步收敛。它交出来的是一行 commit id，不是解释；解释得自己回头读那个 commit
才能补上。上次报关机卡死的 bug，我 bisect 到 merge commit 就抄了近路，还得回头返工；这次
一路做到单个 commit，后面写报告时省了很多自我怀疑。

**症状离根因可以隔好几层。** 提示符 → `\w` → `getcwd()` → `d_path()` →
`copy_from_kernel_nofault()`，四层，中间任何一层都没有报错。我一开始去查 rootfs，就是被
"(none)" 这个输出骗了——它看着像配置问题，其实是一个系统调用在返回 `-ENAMETOOLONG`。

**patch 的第一次发送大概率是废的。** 我的第一版只发给了列表，一个 maintainer 都没 CC。
在 LKML 上这意味着没人有义务看它——重发一封比等三周便宜得多。

**maintainer 的质疑和 Ack 可以同时出现在同一封邮件里。** Ard 那句 "Is that true?" 没让
我难堪，反而逼我把 `memory.h` 翻出来引了一遍，后面就没人再问同样的问题了。质疑是 reviewer
在替你补证据，不是在拦你。

**没有 CC 到人，patch 会静默地躺在那里。** 6 月 12 日拿到 Ack，到 7 月 1 日 Thorsten 追问，
中间十九天没有一个人推动。技术上已经通关了，流程上却停在原地。

**回归跟踪者是真实存在的基础设施。** 这次又是 Thorsten 和 regzbot 把我这封埋在列表里的邮件
捞出来，顺手教了 `Closes:` 怎么写。第一次报 bug 的时候我完全不知道有这套流程，第二次也一样。

**两行的修复也可以是完整的修复。** 这个函数在 MMU 上没错，只是在 noMMU 上没有意义。承认
"这段代码不该出现在这个配置里"，比在里面加一堆 `#ifdef` 判断干净得多。

**别把功劳想大。** 我提供的只是"这个 `#ifdef` 的位置错了"，以及一个能复现的板子。把它变成
commit 的是 Kees，替我把关的是 Ard，让它在列表里没被忘掉的是 Thorsten。

最后，时间线：

| 日期 | 事件 |
| --- | --- |
| 06-11 | bugzilla 218953；第一次发 patch（忘了 CC） |
| 06-12 | 重发并 CC；Ard 质疑 `TASK_SIZE` 的前提，随后 Ack |
| 06-14 | regzbot 把线程挂进回归清单 |
| 07-01 | Thorsten 追问；Kees 表示可以从他的树带走 |
| 07-16 | `3ccea4784fdd` 随 `hardening-v6.11-rc1` 合并 |
| 07-28 | v6.11-rc1 发布 |
| 08-03 | 6.10.3 带上修复 |
| 2025-04 | 回灌到 5.4.292 / 5.10.236 / 5.15.180 / 6.1.133 / 6.6.86 |

从发信到进 mainline 五周。作为第一个 patch，比预期顺利；作为一次回归，它活得比谁都长。
