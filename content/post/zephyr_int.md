---
title: GPIO interrupt for zephyr
date: '2026-11-20 06:05:00'
tags:
    - programming
    - embedded
---

上一篇 [GPIO driver for zephyr](zephyr.md) 给飞腾派的 Zephyr 加上了 GPIO 输入输出，
但只轮询、不支持中断。这一篇接着把中断补上，同时把引脚的内部上拉也接进 pinctrl
框架。最后用三个引脚做个演示：GPIO4_13 输出，GPIO4_12 轮询输入，GPIO4_11 中断输入，
按任意一个键都翻转 GPIO4_13。
<!--more-->

# 硬件寄存器

PE220x 的一个 GPIO 控制器有 16 个引脚，寄存器按 port 排列。输入输出只用到前三个，
中断相关的寄存器在 `0x18` 之后：

```c
#define GPIO_DR               0x00 /* 输出数据 */
#define GPIO_DDR              0x04 /* 方向，1: 输出，0: 输入 */
#define GPIO_EXT              0x08 /* 外部引脚电平 */
#define GPIO_INTEN            0x18 /* 中断使能 */
#define GPIO_INTMASK          0x1c /* 中断屏蔽，1: 屏蔽 */
#define GPIO_INTTYPE_LEVEL    0x20 /* 1: 边沿，0: 电平 */
#define GPIO_INT_POLARITY     0x24 /* 1: 上升/高，0: 下降/低 */
#define GPIO_INTSTATUS        0x28 /* 屏蔽后的中断状态 */
#define GPIO_RAW_INTSTATUS    0x2c /* 原始中断状态 */
#define GPIO_PORTA_EOI        0x38 /* 写 1 清除中断 */
```

中断配置就是组合这几个寄存器：

- `INTMASK` 某位为 1 表示屏蔽，使能时要先清零
- `INTEN` 某位置 1 使能
- `INTTYPE_LEVEL` 选择边沿或电平
- `INT_POLARITY` 选择上升沿/高电平，或下降沿/低电平
- 中断产生后往 `PORTA_EOI` 对应位写 1 清除

GPIO4 的 16 个引脚共用一个中断号。飞腾 SDK 的 `soc/pe220x/fgpio_table.c` 里写的是
IRQ 189，对应到设备树就是 `GIC_SPI 157`，因为 GIC 的 INTID 等于 SPI 编号加 32。

# 设备树

在 `gpio4` 节点上补上中断：

```dts
gpio4: gpio@28038000 {
        compatible = "phytium,pe220x-gpio";
        reg = <0x00 0x28038000 0x00 0x1000>;
        ngpios = <16>;
        status = "okay";
        gpio-controller;
        #gpio-cells = <2>;
        interrupts = <GIC_SPI 157 IRQ_TYPE_LEVEL 0>;
        interrupt-names = "irq_0";
};
```

绑定里把 `interrupts` 声明为必需属性，因为这个控制器没有中断就无法完整工作：

```yaml
properties:
  interrupts:
    required: true
```

Zephyr 的 ARM64 GIC 使用 INTID 编号，所以 `DT_INST_IRQN()` 拿到的是 189 而不是 157，
后面的 `IRQ_CONNECT()` 和 `irq_enable()` 都直接用它。

# 驱动实现

## 回调链表

Zephyr 的 GPIO 中断模型是“驱动注册 ISR，应用注册回调”。驱动里保存一个回调链表：

```c
struct pe220x_gpio_data {
        struct gpio_driver_data common;
        DEVICE_MMIO_NAMED_RAM(mmio);
        mem_addr_t base_addr;
        sys_slist_t callbacks;
};
```

并实现 `manage_callback`：

```c
static int pe220x_gpio_manage_callback(const struct device *dev,
                                       struct gpio_callback *callback,
                                       bool set)
{
        struct pe220x_gpio_data *data = dev->data;

        return gpio_manage_callback(&data->callbacks, callback, set);
}
```

## 中断配置

`pin_interrupt_configure()` 的入参是 `enum gpio_int_mode` 和 `enum gpio_int_trig`。
它先处理“关闭”，再根据 mode/trig 写类型和极性，最后清 pending、解屏蔽、使能：

```c
static int pe220x_gpio_pin_interrupt_configure(const struct device *dev,
                                               gpio_pin_t pin,
                                               enum gpio_int_mode mode,
                                               enum gpio_int_trig trig)
{
        struct pe220x_gpio_data *data = dev->data;
        const uint32_t mask = BIT(pin);
        uint32_t reg_val;

        if (mode == GPIO_INT_MODE_DISABLED) {
                reg_val = sys_read32(data->base_addr + GPIO_INTMASK);
                sys_write32(reg_val | mask, data->base_addr + GPIO_INTMASK);
                reg_val = sys_read32(data->base_addr + GPIO_INTEN);
                sys_write32(reg_val & ~mask, data->base_addr + GPIO_INTEN);
                return 0;
        }

        if (trig == GPIO_INT_TRIG_BOTH || trig == GPIO_INT_TRIG_WAKE) {
                return -ENOTSUP;
        }

        reg_val = sys_read32(data->base_addr + GPIO_INTTYPE_LEVEL);
        if (mode == GPIO_INT_MODE_EDGE) {
                reg_val |= mask;
        } else {
                reg_val &= ~mask;
        }
        sys_write32(reg_val, data->base_addr + GPIO_INTTYPE_LEVEL);

        reg_val = sys_read32(data->base_addr + GPIO_INT_POLARITY);
        if (trig == GPIO_INT_TRIG_HIGH) {
                reg_val |= mask;
        } else {
                reg_val &= ~mask;
        }
        sys_write32(reg_val, data->base_addr + GPIO_INT_POLARITY);

        sys_write32(mask, data->base_addr + GPIO_PORTA_EOI);

        reg_val = sys_read32(data->base_addr + GPIO_INTMASK);
        sys_write32(reg_val & ~mask, data->base_addr + GPIO_INTMASK);
        reg_val = sys_read32(data->base_addr + GPIO_INTEN);
        sys_write32(reg_val | mask, data->base_addr + GPIO_INTEN);

        return 0;
}
```

硬件本身只支持单边沿，所以 `GPIO_INT_EDGE_BOTH` 直接返回 `-ENOTSUP`，不做软件模拟。

## 中断服务函数

ISR 用 `RAW_INTSTATUS & INTEN` 找出真正使能的 pending 位，先写 `EOI` 清除，再分发
回调。循环处理是为了避免在处理回调期间新到的边沿被下一次 EOI 误清：

```c
static void pe220x_gpio_isr(const struct device *dev)
{
        struct pe220x_gpio_data *data = dev->data;
        uint32_t pending;

        while ((pending = sys_read32(data->base_addr + GPIO_RAW_INTSTATUS) &
                          sys_read32(data->base_addr + GPIO_INTEN)) != 0U) {
                sys_write32(pending, data->base_addr + GPIO_PORTA_EOI);
                gpio_fire_callbacks(&data->callbacks, dev, pending);
        }
}
```

## 注册 IRQ

设备初始化时把回调链表清空，先把所有引脚中断屏蔽掉，再应用 pinctrl，最后连接并使能
IRQ：

```c
sys_slist_init(&data->callbacks);

sys_write32(cfg->common.port_pin_mask, data->base_addr + GPIO_INTMASK);
sys_write32(0U, data->base_addr + GPIO_INTEN);
sys_write32(cfg->common.port_pin_mask, data->base_addr + GPIO_PORTA_EOI);

pinctrl_apply_state(cfg->pcfg, PINCTRL_STATE_DEFAULT);

cfg->irq_config();
```

每个实例生成一个 `irq_config`：

```c
#define PE220X_GPIO_IRQ_CONFIG(n)                                      \
        static void pe220x_gpio_irq_config_##n(void)                   \
        {                                                              \
                IRQ_CONNECT(DT_INST_IRQN(n),                           \
                            DT_INST_IRQ(n, priority),                  \
                            pe220x_gpio_isr,                           \
                            DEVICE_DT_INST_GET(n), 0);                 \
                irq_enable(DT_INST_IRQN(n));                           \
        }
```

最后在 `gpio_driver_api` 里挂上三个新成员：

```c
.manage_callback = pe220x_gpio_manage_callback,
.get_pending_int = pe220x_gpio_get_pending_int,
.pin_interrupt_configure = pe220x_gpio_pin_interrupt_configure,
```

# 内部上下拉

PE220x 的引脚上下拉不在 GPIO 控制器里，而在 IOPAD（`FIOPAD`）里，每个引脚有两位：

```c
FIOPAD_PULL_NONE = 0b00,
FIOPAD_PULL_DOWN = 0b01,
FIOPAD_PULL_UP   = 0b10,
```

之前的 pinctrl 只支持功能复用，这次把 pull 也接进来。

## 设备树绑定

`dts/bindings/pinctrl/phytium,pinctrl.yaml` 的子节点增加三个标准属性：

```yaml
bias-pull-up:
  type: boolean
bias-pull-down:
  type: boolean
bias-disable:
  type: boolean
```

## pinctrl 数据结构

`soc/phytium/*/pinctrl_soc.h` 里的 `pinctrl_soc_pin` 增加 `pull` 字段，并从设备树计算：

```c
struct pinctrl_soc_pin {
        uint32_t pin_reg_offset;
        uint32_t func_num;
        int32_t pull;   /* 2: up, 1: down, 0: none, -1: 不修改 */
};

#define PHYTIUM_PE2204_PIN_PULL(node_id)                       \
        (DT_PROP_OR(node_id, bias_pull_up, 0) ? 2 :            \
         DT_PROP_OR(node_id, bias_pull_down, 0) ? 1 :          \
         DT_PROP_OR(node_id, bias_disable, 0) ? 0 : -1)
```

`-1` 表示设备树没写 bias，此时保持寄存器原值，避免把 bootloader 或前级配置的上拉
误清掉。

## 应用 pull

`pinctrl_phytium.c` 在设置完功能复用后，按需调用 `FIOPadSetPull()`：

```c
ret = FIOPadSetFunc(&iopad_ctrl, pin->pin_reg_offset, pin->func_num);
if (ret != FIOPAD_SUCCESS) {
        LOG_ERR("FIOPadSetFunc error.");
        return ret;
}

if (pin->pull >= 0) {
        ret = FIOPadSetPull(&iopad_ctrl, pin->pin_reg_offset,
                            (FIOPadPull)pin->pull);
        if (ret != FIOPAD_SUCCESS) {
                LOG_ERR("FIOPadSetPull error.");
        }
}
```

## 一个状态节点只能写一个引脚

这里还踩了一个坑：Phytium 现有的 `Z_PINCTRL_STATE_PINS_INIT` 宏对每个状态节点只读
`pinmux` 的第 0、1 个 cell，也就是**一个状态节点只能描述一个引脚**。一开始把三个引脚
写在同一个 `pinmux` 里，编译没问题，但生成的状态数组只有一项，实际只有第一个引脚
被复用。

改成三个状态节点，再一起挂到 `pinctrl-0`：

```dts
&pinctrl {
        gpio4_11_default: gpio4_11_default {
                pinmux = <PHYTIUM_PINMUX(FIOPAD_AC49_REG0_OFFSET, FIOPAD_FUNC6)>;
                bias-pull-up;
        };

        gpio4_12_default: gpio4_12_default {
                pinmux = <PHYTIUM_PINMUX(FIOPAD_AE47_REG0_OFFSET, FIOPAD_FUNC6)>;
                bias-pull-up;
        };

        gpio4_13_default: gpio4_13_default {
                pinmux = <PHYTIUM_PINMUX(FIOPAD_AA47_REG0_OFFSET, FIOPAD_FUNC6)>;
        };
};

&gpio4 {
        pinctrl-0 = <&gpio4_11_default &gpio4_12_default &gpio4_13_default>;
        pinctrl-names = "default";
        status = "okay";
};
```

GPIO4_11 和 GPIO4_12 是输入，打开内部上拉；GPIO4_13 是输出，不设置 pull。
编译后可以检查生成的状态数组，确认三个引脚都在：

```text
0x148 0x6 2   -> GPIO4_11, func 6, pull-up
0x14c 0x6 2   -> GPIO4_12, func 6, pull-up
0x150 0x6 -1  -> GPIO4_13, func 6, 不修改 pull
```

# 上层应用

演示程序使用三个引脚：

- GPIO4_13：输出，初始低电平
- GPIO4_12：输入，主循环轮询，每按一次翻转 GPIO4_13
- GPIO4_11：输入，边沿中断，每次中断翻转 GPIO4_13

按键默认按低电平有效配置（一端接 GND，按下产生下降沿）：

```c
#define BUTTON_ACTIVE_LOW 1

#if BUTTON_ACTIVE_LOW
#define BUTTON_FLAGS (GPIO_INPUT | GPIO_ACTIVE_LOW)
#else
#define BUTTON_FLAGS GPIO_INPUT
#endif
```

初始化和中断注册：

```c
gpio_pin_configure(gpio, 13, GPIO_OUTPUT_INACTIVE);
gpio_pin_configure(gpio, 12, BUTTON_FLAGS);
gpio_pin_configure(gpio, 11, BUTTON_FLAGS);

gpio_init_callback(&gpio4_11_cb, gpio4_11_isr, BIT(11));
gpio_add_callback(gpio, &gpio4_11_cb);
gpio_pin_interrupt_configure(gpio, 11, GPIO_INT_EDGE_TO_ACTIVE);
```

`GPIO_INT_EDGE_TO_ACTIVE` 会结合引脚的 `GPIO_ACTIVE_LOW` 自动选下降沿；如果按键是
高电平有效，把 `BUTTON_ACTIVE_LOW` 改成 0，中断就变成上升沿。

轮询 GPIO4_12 时做了一个简单的软件消抖：每 10 ms 采样一次，连续两次一致才认为
状态稳定，检测到“按下”（逻辑 1）时翻转输出：

```c
while (1) {
        sample = gpio_pin_get(gpio, 12);

        if (sample != stable) {
                if (++debounce >= 2) {
                        stable = sample;
                        debounce = 0;

                        if (stable == 1) {
                                gpio_pin_toggle(gpio, 13);
                                printk("GPIO4_12 pressed, GPIO4_13 toggled\r\n");
                        }
                }
        } else {
                debounce = 0;
        }

        k_msleep(10);
}
```

中断回调里直接翻转输出：

```c
static void gpio4_11_isr(const struct device *dev, struct gpio_callback *cb, uint32_t pins)
{
        gpio_pin_toggle(gpio, 13);
        printk("GPIO4_11 interrupt, GPIO4_13 toggled\r\n");
}
```

# 编译与运行

编译和下载流程和上一篇一样，仍然加载到链接地址 `0x80100000`：

```text
dcache off
tftpboot 0x80100000 zephyr.bin
go 0x80100000
```

正常输出：

```text
GPIO4_12 input, GPIO4_11 interrupt, GPIO4_13 output
GPIO4_12 pressed, GPIO4_13 toggled
GPIO4_11 interrupt, GPIO4_13 toggled
```

# 小结

这次补上的两部分：

1. **中断**：`INTEN`/`INTMASK`/`INTTYPE_LEVEL`/`INT_POLARITY`/`PORTA_EOI` 五个寄存器
   配合 `gpio_fire_callbacks()`，GPIO4 的 16 个引脚共用一个 IRQ（INTID 189）。
2. **内部上下拉**：在 pinctrl 绑定和 `pinctrl_soc_pin` 中加入 bias，驱动通过
   `FIOPadSetPull()` 配置 IOPAD。按键不再需要外部上拉。

另外记录了 Phytium pinctrl 目前“一个状态节点一个引脚”的限制，多个引脚要拆成多个
状态节点。后续如果想继续完善，可以考虑让 pinctrl 支持一个状态节点多个引脚，或者
利用 GPIO 的 `DEBOUNCE` 寄存器做硬件消抖。
