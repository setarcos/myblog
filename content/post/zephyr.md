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
description: Phytium pe220x-gpio controller

compatible: "phytium,pe220x-gpio"

include: gpio-controller.yaml

properties:
  reg:
    type: array
    required: true

  ngpios:
    type: int
    required: true
```

这个文件告诉Zephyr：这是一个使用标准 GPIO 语义的 GPIO 控制器。

## 设备树节点

在 `dts/arm64/phytium/pe2204.dtsi` 的 soc 部分，增加一个 GPIO 的节点，这里只定义了 GPIO4，其它
端口都可以类似定义。

```dts
gpio4: gpio@28038000 {
        compatible = "phytium,pe220x-gpio";
        reg = <0x00 0x28038000 0x00 0x1000>;
        ngpios = <32>;
        status = "okay";
        gpio-controller;
        #gpio-cells = <2>;
};
```
## 驱动编写

驱动的编写主要基于飞腾的数据手册，目前仅实现了 GPIO 的输入输出，没有写中断控制。
基本的代码框架都是大模型完成，但大模型对于 MMIO 的操作不是很理解，给我增添不少麻烦。

```c
static int pe220x_gpio_init(const struct device *dev)
{
    const struct pe220x_gpio_config *cfg = dev->config;
    struct pe220x_gpio_data *data = dev->data;

    DEVICE_MMIO_MAP(dev, K_MEM_CACHE_NONE);

    /* save the mapped address */
    data->base_addr = DEVICE_MMIO_GET(dev);
    /* cache for the DR and DIR register */
    data->pin_dr = sys_read32(data->base_addr + GPIO_DR);
    data->pin_dir = sys_read32(data->base_addr + GPIO_DDR);

    return 0;
}
```
这里是设备的初始化部分，建立了设备寄存器的内存映射，之后就应该可以顺利的访问寄存器了。
可大模型偏偏每次使用的时候都用 `DEVICE_MMIO_GET` 重新获取地址，造成内存访问错误。其余
代码不贴出来了，没有什么难度。

## Kconfig配置

为了让操作系统知道这个添加的驱动，还需要改写相应的配置。首先要增加一个
`drivers/gpio/Kconfig.pe220x` 文件。内容如下：

```kconfig
config GPIO_PE220X
    bool "PE220x GPIO controller"
    depends on GPIO
```

并在 `drivers/gpio/Kconfig` 增加一行 `source "drivers/gpio/Kconfig.pe220x"`
还需要在 `drivers/gpio/CMakeLists.txt` 中也增加一行：

```cmake
zephyr_library_sources_ifdef(CONFIG_GPIO_PE220X     gpio_pe220x.c)
```

# 上层应用

首先要增加一个 dts 的 overlay 文件对处理器管脚进行设置，这个文件要和开发板同名（e2000q_demo.overlay），下面示例配置了 GPIO4_13，具体 pinmux 参数也是参考了 SDK 的代码。

```dts
#include <zephyr/dt-bindings/pinctrl/phytium-pe2204-pinctrl.h>

&pinctrl {
	gpio4_13_default: gpio4_13_default {
		pinmux = <PHYTIUM_PINMUX(FIOPAD_AA47_REG0_OFFSET, FIOPAD_FUNC6)>;
	};
};
```

在 C 语言中使用标准的 GPIO API 就可以使用这个驱动了：

```c
const struct device *gpio = DEVICE_DT_GET(DT_NODELABEL(gpio4));

gpio_pin_configure(gpio, 13, GPIO_OUTPUT_ACTIVE);
gpio_pin_set(gpio, 13, 1);
```

另外配置文件中要增加 GPIO 相关设置：

```text
CONFIG_GPIO=y
CONFIG_GPIO_PE220X=y
```

如果需要更多的调试信息，比如查看 printk 的输出，还需要增加如下设置：

```text
CONFIG_LOG_PRINTK=n
CONFIG_PRINTK=y
CONFIG_LOG=y
CONFIG_LOG_MAX_LEVEL=4
CONFIG_DEBUG_INFO=y
```
