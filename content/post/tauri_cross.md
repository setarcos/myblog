---
title: cross compile tauri
date: '2025-06-06'
tags:
    - software
---

使用 Rust 编写跨平台图形界面程序。

<!--more-->

# 简介

[Tauri](https://tauri.app/) 是一个跨平台桌面应用框架，使用 Rust 作为后端，前端基于 Web 技术（HTML/CSS/JS）。
相比 Electron，它更轻量、安全，通过 Rust 提供系统级功能，并支持 WebAssembly 优化性能。
适用于构建高效、小巧的桌面应用，兼容 Windows、macOS 和 Linux。

在 Linux 上可以使用 `npm create tauri-app@latest` 创建新的工程，使用 npm 进行项目管理，
那么是否可以在 Linux 进行交叉编译呢？官方网页上有交叉编译的介绍，目前还是实验性质，
我尝试了一下，将遇到的问题记录在这里。

# 构建交叉编译环境

首先要安装 rust 的交叉编译工具，并使用 `cargo-xwin` 作为编译工具，它会自动下载 Windows
环境的 SDK 和工具链：

```bash
$ rustup target add x86_64-pc-windows-msvc
$ cargo install --locked cargo-xwin
```
Linux 平台应该也需要一些依赖，官网只提到了 `llvm`，`lld`，由于我的电脑上工具比较全，有
机会用 Docker 查看一下完整的依赖。

还要安装 NSIS 作为安装包构建工具，这个比较麻烦，官网的做法在我电脑上行不通，我主要采用
源码编译的方式（void 发行版没有打包 nsis）：

```bash
$ wget https://prdownloads.sourceforge.net/nsis/nsis-3.08-src.tar.bz2
$ tar xfv nsis-3.08-src.tar.bz2
$ cd nsis-3.08-src
$ scons makensis SKIPPLUGINS=all SKIPUTILS=all
$ sudo cp build/urelease/makensis/makensis /usr/local/bin
```

这里只编译了 `makensis` 这个二进制文件，其它的内容从 tauri 的官网提取最可靠。

```bash
$ wget https://github.com/tauri-apps/binary-releases/releases/download/nsis-3/nsis-3.zip
$ unzip nsis-3.zip
$ sudo cp -a Include Contrib Include Stubs /usr/local/share/nsis/
```

经过这样配置就可以用下面的命令生成 Windows 平台的目标文件了：

```bash
$ npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```
