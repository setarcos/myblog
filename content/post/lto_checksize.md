---
title: LTO slim breaks cmake check_type_size
date: '2025-12-07 2:33:53'
tags:
    - programming
    - loongarch
---

在 Loongarch 平台编译 swi_prolog 失败，经过分析发现是 cmake 的问题，还牵扯到 gcc lto
的实现问题。
<!--more-->

# 问题发现

`swi_prolog` 在 Loongarch 上编译的时候，出现 `SIZEOF_VOIDP` 没有定义的情况，而这个宏
是在 cmake 中赋值，相关代码可以简化如下：
```
cmake_minimum_required(VERSION 3.10)
project(VoidPointerTest)
include(CheckTypeSize)

SET(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)
check_type_size("void *" SIZEOF_VOIDP)

message(STATUS "SIZEOF_VOIDP = ${SIZEOF_VOIDP}")
```
把其中的 `SET` 去掉可以解决问题，但具体的原因更加复杂一些。

# cmake 检查类型大小原理

cmake 检查类型大小的时候，是通过编译一个测试程序，然后分析获得的二进制。上面代码中
设置目标为静态库，目的是为了防止 Windows 平台上的反病毒系统误报。毕竟频繁编译小程序
有点符合病毒的行为模式。cmake 的测试程序可以简化成下面的代码：
```c
#define SIZE (sizeof(void *))
static char info_size[] =  {'I', 'N', 'F', 'O', ':', 's','i','z','e','[',
  ('0' + ((SIZE / 10000)%10)),
  ('0' + ((SIZE / 1000)%10)),
  ('0' + ((SIZE / 100)%10)),
  ('0' + ((SIZE / 10)%10)),
  ('0' +  (SIZE    % 10)),
  ']',
#ifdef KEY
  ' ','k','e','y','[', KEY, ']',
#endif
  '\0'};

int main(int argc, char *argv[])
{
  int require = 0;
  require += info_size[argc];
  (void)argv;
  return require;
}
```

编译生产目标代码后，可以用 `strings` 命令查看。应可以看到`INFO:size[00008]`这样的内容。

# 类型大小检测失败原因

在开始测试的时候，我并没能用简单代码重现这个现象。所以问题应该出在 `swi_prolog` 使用的
编译参数上。经过排查，当使用 `-flto=auto` 的时候，Loongarch 平台的生成代码就没有 `INFO`
部分，而同样的编译参数，在 x86 平台却可以正确包含 `INFO`。

开始我以为是不同平台上 LTO 的算法不同，但测试好几个程序都没有发现 LTO 的区别。
继续看 cmake 的源码，测试程序中的 `KEY` 是个平台相关的定义，在常规平台上都有明确声明，
但在 Loongarch 平台是没有定义的。如果也给 Loongarch 平台增加相应的定义，前面的问题就
消失了。

原来最后问题的关键是字符串数组的长度。当数组长度比较小的时候，gcc 会将其优化为 mov 指令，
数组数据就不会出现数据区。而只有数组长度大于某个阈值，才会作为字符串常量保存。如果不使用
LTO 或者使用 `lfat-lto-objects` 的话，无论数组长度多少，都会在 `.rodata` 部分导出相应的
符号。

# 解决方法

在编译 `swi_prolog` 的时候加上 `lfat-lto-objects` 就可以解决问题。也许这个应该算是 cmake
的一个 bug，它应该确保自己的算法在任何平台上、任何编译参数下都可以正常工作。


