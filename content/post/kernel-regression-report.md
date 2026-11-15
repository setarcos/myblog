---
title: Reporting a kernel regression - Dell machines hang at shutdown
date: '2026-11-14 20:30:00'
tags:
    - linux
    - software
---

2023 年 10 月，我给 kernel bugzilla 提了一个 bug，四天后 Linus 亲手 revert 了有问题的
commit。三年后再回头看这份报告，从"关机卡死"到"6.6-rc6 修复"，中间的过程比结论更值得记
下来：一次不严谨的 bisect、一位回归跟踪者的追问、和一颗被 INIT 打进"假死"状态的 CPU。
<!--more-->

# 症状

机器是 Dell OptiPlex 7050，i5-7500。升级到 6.5 之后，关机时会卡住：系统日志已经刷完，
屏幕该黑的也黑了，但电源灯一直亮着，风扇还在转，只能长按电源键。不是每次都卡，但概率不低。

第一反应是怀疑自己：是不是某个服务没退出、是不是我改了什么配置。换回 6.3.13 的内核一切正常，
于是把范围缩小到内核。接着把论坛翻了一遍，找到三个同样症状的帖子——Arch、openSUSE、Artix
各一个，全是 Dell 机器。这就不太像巧合了。

# 第一次 bisect

这是我第一次做 bisect。没有用 `git bisect run`，全靠手工编译内核、重启、长按电源键，节奏很
慢，于是我就"抄了个近路"：读 commit message 的时候，觉得 `88afbb21d4b3`（一个 merge commit，
`x86-core` 的 pull）看着最可疑，直接 checkout 过去验证，结果确实是坏的，就没有继续往下走。

这个判断并不完全错，但它不是答案。merge commit 本身只是"两条历史在这里会合"，真正引入问题
的是某个分支里的某一次提交。我把它和 reflog 一起贴进 bug 里，事后证明这段"近路"是整件事里
唯一的弯路。

# 报告

bug 提交到 bugzilla.kernel.org，编号 217995，组件选 `Platform Specific/Hardware / x86-64`，
Kernel Version 填 6.5，Regression 选 Yes，然后：

- 写清现象和"只在 Dell 上出现"这个观察，附上三个论坛链接；
- 附一份完整 dmesg；
- 写上可疑的 commit id。

当天就有人 CC 了 commit 的作者 Thomas Gleixner。第二天 Bagas Sanjaya 把报告转发到 LKML 和
linux-regressions，regzbot 自动开始跟踪：

```text
#regzbot introduced: 88afbb21d4b36f
#regzbot title: x86 core fix pull causes shutdown hang on Dell OptiPlex 7050
```

再然后，Thorsten Leemhuis（内核回归跟踪者）说了一句很关键的话：bisect 到 merge commit 时，
结论有时会走偏，请补一份 bisect log；顺手还贴出了 Red Hat bugzilla 上另一个报告。

我这才去复核 merge 的两个 parent。重新编译、重新验证，确认真正的问题是：

```text
45e34c8af58f  x86/smp: Put CPUs into INIT on shutdown if possible
```

v6.5-rc1 引入。我给 Thorsten 回了信，也承认自己第一次的结论有误——他回了一句"Happens,
don't worry about it"，然后把 regzbot 的 `introduced:` 改成了正确的 commit，并 CC 了 x86
的几位 maintainer。

# 定性，只花了一天

10 月 13 日，同一天里三封邮件把这件事定下来了。

Linus 的判断很直接：这个 commit 很危险。真正的问题不在 `smp_park_other_cpus_in_init()`
本身，而在于 CPU 被打进 INIT **之后**，关机流程还要做一堆事——`iommu_shutdown()`、tboot 的
关闭序列（几乎肯定要走 SMI）。只要后面还有任何东西依赖 SMI，而 SMI 又需要那些已经"死"掉的
CPU 响应，机器就会卡在那里。

Intel 的 Ashok Raj 给出了硬件侧的解释：这是 BIOS 的 SMM handler 的 bug。客户端 BIOS 把
**APIC ID 最小的那颗 CPU** 当作 SMM rendezvous 的 master，而在某些机器上，APIC ID 最小的
并不是 BSP，而是一颗 AP——正是那颗被 INIT 打进假死状态的 AP。服务器 BIOS 早就写对了。

有意思的是他一开始以为我这是 MeteorLake，让我跑 `rdmsr -a 0x1b` 和
`turbostat --show CPU,APIC,X2APIC`。我贴了输出，顺便回了一句：这台是 i5-7500（Kaby Lake），
MTL 还没上市呢。这个"猜错"反而帮了忙——说明"最低 APIC ID = SMM master"这个假设在老客户端
BIOS 里也很普遍，于是结论从"等 BIOS 更新"变成了"内核先 revert"。

Thomas 表示同意 revert，同时解释了当初为什么加这个改动：`mwait_play_dead()` 的问题修完之后
发现 HLT 也不完全安全（NMI/SMI/MCE 都能把 CPU 唤醒，kexec 之后可能跑到已被覆盖的代码上），
最后才选了 INIT 这个"看起来最可靠"的办法——"Though it's obviously making some BIOSes very
unhappy." 邮件最后一句是："Did I mention before that I hate computers with a passion?"

10 月 15 日，Linus 直接提交了 revert（`fbe1bf1e5ff1`），连同它的两个后续修补一起回退：

```text
Revert "x86/smp: Put CPUs into INIT on shutdown if possible"

This reverts commit 45e34c8af58f23db4474e2bfe79183efec09a18b,
and the two subsequent fixes to it:
  3f874c9b2aae ("x86/smp: Don't send INIT to non-present and non-booted CPUs")
  b1472a60a584 ("x86/smp: Don't send INIT to boot CPU")
```

进 6.6-rc6，同时回灌到 6.5.8。

# 验证

我升级到 6.6-rc6 试了几次关机，恢复正常，回帖确认。几天后 Arch 上另一位用 Dell Precision
3420 的兄弟也确认 6.5.8 修好了，bug 被标记为 `RESOLVED CODE_FIX`。

三年过去，`smp_park_other_cpus_in_init()` 这个函数没有再回到 mainline。也就是说，最终的
"修复"并不是把 bug 改对，而是承认这条路在没有固件配合的情况下走不通，直接退回去。

# 几点体会

**bisect 到 merge commit 一定要手工核实。** merge commit 是一个"文件夹"，不是一个改动，
它的好坏取决于两个 parent 分别是什么状态。核对一下 parent，通常十分钟就能省掉一场误报。

**bisect log 比结论重要。** 我当时只贴了 reflog，其实 reflog 只能说明"我 checkout 过哪些
commit"，不能说明"每个 commit 验证了几次、结果如何"。后来老老实实地把可疑 commit 重新编译
验证了一遍，才把结论定死。

**报告写得"可复现"比写得"专业"重要。** 我对这部分内核不熟悉，能提供的只有：稳定的现象、
一份干净的 dmesg、一组"同样是 Dell"的外部证据、一个我尽力得到的 commit id。这些已经足够让
maintainer 在一天之内定性——真正的分析不是我做的。

**regzbot 和回归跟踪者是真实存在的基础设施。** 我提交报告的时候完全不知道有这套流程，是
Bagas 转发、Thorsten 追问、regzbot 记录 `introduced` / `fix` 一路推着走的。对第一次报 bug
的人来说，这种"有人接住"的体验非常重要。

**内核和固件之间的隐含契约很多。** 这次的教训很具体：一颗 CPU 在 INIT 状态里不会响应 SMI，
而某些 BIOS 假设所有 CPU 都会在 SMM 里开会。这种假设不在任何 spec 里，只能靠撞。

最后，记录一下时间线，当作给自己的备忘：

| 日期 | 事件 |
| --- | --- |
| 10-11 | 提交 bug 217995 |
| 10-12 | 转发到 LKML，regzbot 跟踪 |
| 10-13 | 复核 bisect，定位到 `45e34c8af58f`；Linus/Ashok/Thomas 定性 |
| 10-15 | `fbe1bf1e5ff1` revert 进 6.6-rc6 |
| 10-16 | 我确认修复 |
| 10-19 | 6.5.8 带上 revert |
| 10-21 | 另一位用户确认，bug 关闭 |

从报告到修复，一共 10 天。作为一个首次提交 bug 的普通用户，这个速度超出了我的预期。
