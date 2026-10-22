---
title: V-USB device fails to enumerate behind a USB hub
date: '2026-10-22 2:12:00'
tags:
    - hardware
    - embedded
---

把 BlinkStick 的固件跑在 Digispark（ATtiny85 + V-USB）上，直接插主机正常，
插到 USB hub 上就枚举失败。记录一下排查过程，顺便记下几个坑。

<!--more-->

# 现象

设备直连主机的 USB 口工作正常，经过一个 hub 之后就变成这样：

```text
[45290.923426] usb 3-2.2: new low-speed USB device number 88 using xhci_hcd
[45291.021431] usb 3-2.2: device descriptor read/64, error -32
[45291.225411] usb 3-2.2: device descriptor read/64, error -32
[45291.414367] usb 3-2.2: new low-speed USB device number 89 using xhci_hcd
[45291.502839] usb 3-2.2: Device not responding to setup address.
[45291.715878] usb 3-2.2: device descriptor read/all, error -32
[45291.716257] usb 3-2-port2: attempt power cycle
[45292.338277] usb 3-2.2: new low-speed USB device number 90 using xhci_hcd
[45292.338695] usb 3-2.2: Device not responding to setup address.
[45292.543659] usb 3-2.2: Device not responding to setup address.
[45292.751232] usb 3-2.2: device not accepting address 90, error -71
[45293.247482] usb 3-2-port2: unable to enumerate USB device
```

`-32` 是 EPIPE（xHCI 的 Stall Error），`-71` 是 EPROTO（事务错误：位错/CRC
错/没有回包）。失败发生在地址还是 0、第一次 `GET_DESCRIPTOR` 的时候，
这已经说明跟 HID 报告、EEPROM 读写这些应用逻辑无关了，是 V-USB 的物理层和
枚举时序问题。

# usbdrv 很久没有更新

不过在 github issue 列表里翻到一条几乎一模一样的：
[#37 Initial simulated disconnect causes problems with usb hub](https://github.com/obdev/v-usb/issues/37)。
报告人的现象是某个 hub 上永远枚举不出来，去掉 `main.c` 里那段

```c
usbDeviceDisconnect();
i = 0;
while(--i){ _delay_ms(1); }
usbDeviceConnect();
```

就正常了。维护者的回复大意是：规范里 SE0 持续 250ms 以上是 **RESET** 信号，
不是拔插；设备重启后应该发这个信号告诉主机“我把 ID 忘了”，但不知道那个 hub
为什么不按规范处理。

我的板子上 D- 的 1.5k 上拉是焊死的，没有定义 `USB_CFG_PULLUP_IOPORTNAME`，
所以 `usbDeviceDisconnect()` 实际只是把 D- 拉低（`usbdrv.h` 注释原话：
*does not conform to the spec, but it works*）。于是插上电的瞬间上拉就已经在
了，hub 开始枚举，而 AVR 正在把这 255ms 的 SE0 当成“断开”往总线上打——hub
看到的是“设备在一直被 reset”。

# 第一步：删掉假的“断开”

```diff
     usbInit();
-    usbDeviceDisconnect();  /* enforce re-enumeration */
-    i = 0;
-    while(--i){             /* fake USB disconnect for > 250 ms */
-        wdt_reset();
-        _delay_ms(1);
-    }
-    usbDeviceConnect();
```

顺便把只为此循环存在的 `uchar i;` 也删掉。烧进去之后——**hub 上认出来了**：

```text
usb 3-2.2: Product: BlinkStick
usb 3-2.2: Manufacturer: Agile Innovative Ltd
usb 3-2.2: SerialNumber: ÿÿÿÿÿÿÿÿÿÿÿÿ
```

# USB_COUNT_SOF 也顺手改掉

`usbconfig.h` 里 `#define USB_COUNT_SOF 1`，但这个功能要求中断接在 **D-** 上，
而 Digispark 是 D+ 接 PB2(INT0)。2012 版的代码判断的是 `defined()`：

```c
#   if defined(USB_COUNT_SOF) || defined(USB_SOF_HOOK)
#       define USB_INTR_CFG_SET (1 << ISC01)   /* falling edge */
```

所以 INT0 被配成了下降沿。改动很小：宏改成 `0`，再把头部改成上游的写法。

```diff
-#   if defined(USB_COUNT_SOF) || defined(USB_SOF_HOOK)
+#   if USB_COUNT_SOF || defined(USB_SOF_HOOK)
```

注意只把宏改成 `0` 是**没用**的，因为判断的是 `defined()`。

验证方法就是反汇编看 `usbInit`：

```text
 42c:  83 60   ori r24, 0x03   ; ISC00|ISC01 = INT0 上升沿（原来是 0x02 下降沿）
```

顺带说一句，这个错误其实不致命：接收是靠 sync 里的 J→K 边沿自同步的，跟中断
沿无关，只是白吃掉一个 bit（约 11 个周期）的中断延迟预算。

# 序列号变成乱码

`ÿ` 是 U+00FF，也就是 EEPROM 里读出来的 12 个字节全是 `0xFF`（擦除态），
不是编码问题。原因是 `make flash`：avrdude 写 flash 前默认会 **chip erase**，
而 chip erase 是否波及 EEPROM 由 EESAVE 熔丝决定，`FUSE_H = 0xdd` 的 bit3
是 1（未编程），所以 EEPROM 跟着一起被擦了，序列号（0x0001 起 12 字节）和
OSCCAL（byte 0）都没了。

```bash
make defaults    # 把 serial 写回 0x0001，byte0 保持 0xFF 触发重新校准
```

以后避免的办法有两个：烧 flash 时加 `-D` 禁止 chip erase，或者把 EESAVE
编程为 0（`FUSE_H` 改成 `0xd5`），以后 chip erase 就保留 EEPROM 了。

# 还是不稳定：每次 reset 都在校准

hub 上认出来一次之后又不行了，反复插只有小概率成功。这时候才注意到
`usbEventResetReady()` 里的在线校准：

```c
extern "C" void usbEventResetReady(void)
{
    cli();
    calibrateOscillator();       /* ~11 次 usbMeasureFrameLength，约 20ms */
    sei();
    eeprom_write_byte(0, OSCCAL);
}
```

问题有三层：

1. 这个 hook 是 `USB_RESET_HOOK` 挂上去的，**每次总线 reset 都会跑**；
2. 校准期间 `cli()` 关中断，约 20ms 再加 3.4ms 的 EEPROM 写，而主机在 reset
   之后 10ms 左右就发 `GET_DESCRIPTOR` 了，设备是聋的，于是 `-32/-71`；
3. 更麻烦的是测量本身会被流量打断：`usbMeasureFrameLength()` 数的是“到下一个
   D-==0 脉冲”的 CPU 周期，包一来就提前结束，算出错误的 OSCCAL 并写进 EEPROM，
   而重试时主机不会再 reset 端口，设备就一路用着错误的时钟。

上游 `libs-device/osccal.h` 里还有一句提醒：ATtiny25/45/85 的 v5 RC 振荡器
OSCCAL 与频率的关系是**分段不连续**的（2×128 步），二分会跑进错的分段。

所以改成：校准一次，结果放 EEPROM，开机直接用。

```c
#define EE_OSCCAL           0
#define OSC_TARGET_VALUE    ((int)(1499 * (double)F_CPU / 10.5e6 + 0.5))
#define OSC_MAX_DEVIATION   48      /* ~2% of the frame length at 16.5 MHz */

static uchar osccalValid;

static void restoreOscillator(void)
{
uchar   v = eeprom_read_byte((uchar *)EE_OSCCAL);

    if(v != 0xFF){          /* 0xFF: 从未校准过 */
        OSCCAL = v;
        osccalValid = 1;
    }
}

extern "C" void usbEventResetReady(void)
{
uchar   accurate;

    if(osccalValid)         /* 有值就不校准，枚举不再被拖延 */
        return;
    cli();
    calibrateOscillator();
    accurate = oscillatorIsAccurate();   /* 连测 3 次，偏差 <= 2% 才接受 */
    sei();
    if(accurate){
        eeprom_update_byte((uchar *)EE_OSCCAL, OSCCAL);
        osccalValid = 1;
    }
}
```

`oscillatorIsAccurate()` 就是拿目标值和当前测量值比较几次，避免把被总线流量
打断得到的垃圾值写进 EEPROM。`eeprom_write_byte` 也换成了
`eeprom_update_byte`，值没变就不写，省掉 3.4ms 的阻塞。

测试顺序是：`make flash` → `make defaults` → 先直连主机让它校准一次 → 读
EEPROM 确认 byte0 约等于 `0x9d`（跟原来的备份一致）→ 再插 hub。

# 总结

- 改完之后直连正常，hub 上也试了几次没有问题。
