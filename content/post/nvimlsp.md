---
title: Using Kickstart.NeoVIM
date: '2025-03-06 2:18:52'
tags:
    - software, vim
---

一直不是 LSP（Language Server Protocol）的粉丝，总觉得配置比较麻烦，但最近
试用了 kickstart.nvim，LSP 开箱可用，感觉还是有一些帮助的。

<!--more-->

# kickstart.nvim 简介

kickstart.nvim 是一个单文件的 Neovim 配置文件，包含大量注释和最常用的插件配置。
最方便的在于可以自动安装缺失的插件。只要网络环境允许，安装了它的配置文件之后，
只要启动 nvim 就可以自动完成后续的配置。项目地址：[kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim)。

# 初使用

在安装了 kickstart.nvim 之后，立刻做了一些自己习惯键位的设置，并调整了部分插件，
的确感觉比较省心。我做的修改可以在我的 github 中找到：[my nvim config](https://github.com/setarcos/kickstart.nvim)。

# 日常维护

插件系统使用 Lazy.nvim，需要更新插件的时候可以执行 `:Lazy`，根据菜单可以选择更新（Update）、
清理（Clean）等等。LSP 使用 Mason.nvim，也可以执行 `:Mason` 看到类似的菜单。

# 主要用法

一个对新手很有帮助的插件是 which-key.nvim，可以通过浮动窗口提示可用的命令按键。
比如在命令状态下按下 g 键，它就会提示你后续可以按的按键，下面代码是部分提示内容：
```
d -> LSP: [G]to [D]efinition
D -> LSP: [G]to [D]eclaration
I -> LSP: [G]to [I]mplementation
```
LSP 的功能也比较强大，比如可以在整个工程内进行变量改名：`<leader>rn`，还有一个是 Code Action，
通过 `<leader>ca` 启动，具体能实现的功能由 LSP 本身来决定。

# LSP 配置

不同 LSP 的配置还不同。比如在使用 lua_ls 的时候，用 Code Action 功能关闭了对某个建议的提示，
后续找了半天没有找到从哪里恢复设置。结果最后发现保存在了 `~/.config/.luarc.json` 这个文件中。
而 pylsp 的设置需要在 nvim 的配置文件中进行修改。具体其它一些用法还要在将来逐渐领会。
