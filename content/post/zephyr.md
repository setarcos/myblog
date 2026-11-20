---
title: GPIO driver for zephyr
date: '2025-12-16 2:20:27'
tags:
    - programming
    - embedded
---

用飞腾派尝试了一下国外比较火的 Zephyr 嵌入式操作系统，官方代码中没有实现 GPIO，但通过 Zephyr
Shell 中的 devmem 命令操作寄存器可以控制 GPIO，说明这部分实现不难，最后在大模型的帮助下为其
增加了 GPIO 的支持。
<!--more-->

# 概述

在 Zephyr RTOS 中，一个完整的GPIO驱动包含以下组件：

- **设备树绑定** (.yaml文件)
- **设备树节点** (板级.dts或.overlay文件)
- **实现gpio_driver_api的C驱动**
- （可选）中断支持

# 驱动编写

## 设备树绑定

创建设备树绑定描述文件：`dts/bindings/gpio/phytium,pe220x-gpio.yaml`

```yaml
description: Phytium pe220x GPIO controller

compatible: "phytium,pe220x-gpio"

include: [gpio-controller.yaml, pinctrl-device.yaml, base.yaml]

properties:
  reg:
    type: array
    required: true

  ngpios:
    type: int
    required: true

  "#gpio-cells":
    const: 2

gpio-cells:
  - pin
  - flags
```

这个文件告诉Zephyr：这是一个使用标准 GPIO 语义的 GPIO 控制器。这里额外
include 了 `pinctrl-device.yaml`，因为后面需要给 GPIO 节点挂 `pinctrl-0`；同时把
`#gpio-cells` 固定为 2。

## 设备树节点

在 `dts/arm64/phytium/pe2204.dtsi` 的 soc 部分，增加一个 GPIO 的节点，这里只定义了 GPIO4，其它
端口都可以类似定义。

```dts
gpio4: gpio@28038000 {
        compatible = "phytium,pe220x-gpio";
        reg = <0x00 0x28038000 0x00 0x1000>;
        ngpios = <16>;
        status = "okay";
        gpio-controller;
        #gpio-cells = <2>;
};
```

PE220x 的每个 GPIO 控制器实际只有 16 个脚（HAL 头文件里的 `FGPIO_PIN_NUM` 也是 16），
所以 `ngpios` 要写成 `<16>`。这样 GPIO 框架会用 `0xffff` 作为合法引脚掩码，访问 16 及以上的
引脚会直接触发断言，避免误访问不存在的 bit。

## 驱动编写

驱动的编写主要基于飞腾的数据手册，目前仅实现了 GPIO 的输入输出，没有写中断控制。

寄存器偏移很简单，一个 port 只有三个寄存器：

```c
/* Register offsets of one GPIO port (port A) */
#define GPIO_DR   0x00 /* Output data register */
#define GPIO_DDR  0x04 /* Data direction register, 1: output, 0: input */
#define GPIO_EXT  0x08 /* External port (input) data register */
```

配置结构和数据结构如下。注意 `gpio_driver_config` / `gpio_driver_data` 必须放在第一位，
这是 GPIO 框架的要求：

```c
#define DEV_CFG(dev) \
    ((const struct pe220x_gpio_config *)(dev)->config)
#define DEV_DATA(dev) \
    ((struct pe220x_gpio_data *)(dev)->data)

struct pe220x_gpio_config {
    /* gpio_driver_config needs to be first */
    struct gpio_driver_config common;
    DEVICE_MMIO_NAMED_ROM(mmio);
    const struct pinctrl_dev_config *pcfg;
};

struct pe220x_gpio_data {
    /* gpio_driver_data needs to be first */
    struct gpio_driver_data common;
    DEVICE_MMIO_NAMED_RAM(mmio);
    /* Mapped address, resolved once in the init function */
    mem_addr_t base_addr;
};
```

### MMIO 映射：这次真正踩到的坑

最初按照“标准写法”用了 `DEVICE_MMIO_ROM` / `DEVICE_MMIO_RAM` 和 `DEVICE_MMIO_MAP()`：

```c
struct pe220x_gpio_config {
    struct gpio_driver_config common;   /* 必须在第一位 */
    DEVICE_MMIO_ROM;                    /* 实际在 common 之后 */
    ...
};
```

设备启动后直接 panic：

```text
[00:00:00.000,000] <err> os: insufficient virtual address space (requested 671322112)
[00:00:00.000,000] <err> os: memory mapping 0xffffffff (size 671318016, flags 0xa) failed
[00:00:00.000,000] <err> os:   EC:  0x15 (Unknown)
[00:00:00.000,000] <err> os:   ISS: 0x2
[00:00:00.000,000] <err> os: >>> ZEPHYR FATAL ERROR 4: Kernel panic on CPU 0
```

原因是**非 named 的 MMIO 宏默认 MMIO 结构位于 config/data 的第一个成员**：

```c
#define DEVICE_MMIO_RAM_PTR(dev)  (mm_reg_t *)((dev)->data)
#define DEVICE_MMIO_ROM_PTR(dev)  (struct z_device_mmio_rom *)((dev)->config)
```

而 GPIO 框架要求 `struct gpio_driver_config common` 必须在第一位，于是：

- `phys_addr` 读到的其实是 `common.port_pin_mask = 0xffffffff`
- `size` 读到的其实是 `mmio.phys_addr = 0x28038000`

（这段日志来自当时 `ngpios = <32>` 的版本，所以掩码是 `0xffffffff`；改成 `<16>` 后掩码是
`0xffff`，现象和原因完全一样。）

日志里的 `0xffffffff`、`0x28038000`、`0x28039000` 正好就是这三个值，MMU 试图映射
`0xffffffff`、长度 0x28038000，直接耗尽虚拟地址空间。

正确做法是使用 **named MMIO** 宏，让宏按成员名去取偏移：

```c
static int pe220x_gpio_init(const struct device *dev)
{
    const struct pe220x_gpio_config *cfg = dev->config;
    struct pe220x_gpio_data *data = dev->data;
    int ret;

    DEVICE_MMIO_NAMED_MAP(dev, mmio, K_MEM_CACHE_NONE);

    /* save the mapped address and always use it afterwards */
    data->base_addr = DEVICE_MMIO_NAMED_GET(dev, mmio);

    ret = pinctrl_apply_state(cfg->pcfg, PINCTRL_STATE_DEFAULT);
    if (ret < 0 && ret != -ENOENT) {
        LOG_ERR("failed to apply pinctrl (%d)", ret);
        return ret;
    }

    return 0;
}
```

设备实例定义里应为：

```c
DEVICE_MMIO_NAMED_ROM_INIT(mmio, DT_DRV_INST(n)),
```

这里初始化时把映射后的地址保存到 `data->base_addr`，后续所有寄存器访问都用它，不再反复调用
`DEVICE_MMIO_GET()`。Zephyr 里 `gpio_davinci.c`、`gpio_rcar.c`、`gpio_intel.c` 这些同时有
GPIO common 和 MMIO 的驱动，也都是用 named 宏处理的。

### pinctrl：overlay 里的节点要挂到设备上

只写一个 pinctrl 子节点是不够的，Zephyr 不会自动应用它。必须在设备节点上通过 `pinctrl-0`
引用，并在驱动里调用 `pinctrl_apply_state()`。

驱动初始化优先级放在 `PRE_KERNEL_2`，保证 `PRE_KERNEL_1` 的 pinctrl 驱动先完成初始化；
没有配置 pinctrl 时 `pinctrl_apply_state()` 会返回 `-ENOENT`，忽略即可。

## Kconfig配置

为了让操作系统知道这个添加的驱动，还需要改写相应的配置。首先要增加一个
`drivers/gpio/Kconfig.pe220x` 文件。内容如下：

```kconfig
config GPIO_PE220X
    bool "PE220x GPIO controller"
    depends on GPIO
    depends on DT_HAS_PHYTIUM_PE220X_GPIO_ENABLED
```

其中 `DT_HAS_PHYTIUM_PE220X_GPIO_ENABLED` 是 Zephyr 根据设备树绑定自动生成的符号，只有设备树
里存在状态为 `okay` 的 `phytium,pe220x-gpio` 节点时，这个配置项才可见。

并在 `drivers/gpio/Kconfig` 增加一行 `source "drivers/gpio/Kconfig.pe220x"`
还需要在 `drivers/gpio/CMakeLists.txt` 中也增加一行：

```cmake
zephyr_library_sources_ifdef(CONFIG_GPIO_PE220X     gpio_pe220x.c)
```

# 上层应用

首先要增加一个 dts 的 overlay 文件对处理器管脚进行设置，这个文件要和开发板同名
（`e2000q_demo.overlay`），下面示例配置了 GPIO4_13，具体 pinmux 参数也是参考了 SDK 的代码。
注意除了定义 pinmux 节点，还要把它挂到 `gpio4` 上：

```dts
#include <zephyr/dt-bindings/pinctrl/phytium-pe2204-pinctrl.h>

&pinctrl {
    gpio4_13_default: gpio4_13_default {
        pinmux = <PHYTIUM_PINMUX(FIOPAD_AA47_REG0_OFFSET, FIOPAD_FUNC6)>;
    };
};

&gpio4 {
    pinctrl-0 = <&gpio4_13_default>;
    pinctrl-names = "default";
    status = "okay";
};
```

在 C 语言中使用标准的 GPIO API 就可以使用这个驱动了：

```c
const struct device *gpio = DEVICE_DT_GET(DT_NODELABEL(gpio4));

gpio_pin_configure(gpio, 13, GPIO_OUTPUT_ACTIVE);
gpio_pin_set(gpio, 13, 1);
```

本次用于验证的循环翻转示例：

```c
static const struct device *gpio = DEVICE_DT_GET(DT_NODELABEL(gpio4));

if (!device_is_ready(gpio)) {
    printk("gpio4 is not ready\r\n");
    return 0;
}

gpio_pin_configure(gpio, 13, GPIO_OUTPUT_ACTIVE);

while (1) {
    gpio_pin_set(gpio, 13, 1);
    printk("gpio4_13 = %d\r\n", gpio_pin_get_raw(gpio, 13));
    k_sleep(K_SECONDS(1));

    gpio_pin_set(gpio, 13, 0);
    printk("gpio4_13 = %d\r\n", gpio_pin_get_raw(gpio, 13));
    k_sleep(K_SECONDS(1));
}
```

另外配置文件中要增加 GPIO 相关设置：

```text
CONFIG_GPIO=y
CONFIG_GPIO_PE220X=y

CONFIG_PINCTRL=y
CONFIG_PINCTRL_PHYTIUM=y
```

如果需要更多的调试信息，比如查看 printk 的输出，还需要增加如下设置：

```text
CONFIG_LOG_PRINTK=n
CONFIG_PRINTK=y
CONFIG_LOG=y
CONFIG_LOG_MAX_LEVEL=4
CONFIG_DEBUG_INFO=y
```

# 编译与下载

```bash
west build -b e2000q_demo ./ -DOVERLAY_CONFIG=prj.conf
```

生成的镜像是 `build/zephyr/zephyr.bin`。下载前先确认镜像的链接地址：

```bash
readelf -h build/zephyr/zephyr.elf | grep Entry
```

当前配置下入口是 `0x801010ec`，整个镜像链接在 `0x80100000`，而 `.bin` 是裸二进制，
**必须加载到链接地址**：

```text
dcache off
tftpboot 0x80100000 zephyr.bin
go 0x80100000
```

# 小结

目前驱动只实现了输入输出，中断部分（`pin_interrupt_configure`）返回 `-ENOTSUP`，后续可以
基于 `INTEN`、`INTTYPE_LEVEL`、`INT_POLARITY`、`PORTA_EOI` 等寄存器继续完善。
