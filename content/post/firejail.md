---
title: using firejail as a restricted shell
date: '2025-03-15 01:32:55'
tags:
    - software
---

准备把我的云主机上开放给其他用户，为了限制这些用户的权限，必须选择一个可以
控制权限的 shell。

<!--more-->

# firejail

选择 firejail 主要还是经过对比，感觉它功能丰富，配置也比较简单。它利用 Linux
的命名空间、Seccomp BPF 等技术，隔离应用程序的文件系统、网络和进程。通过配置
文件支持为每个应用程序定制配置文件，定义允许访问的资源。

# 作为登陆 shll

本来应该可以直接把 firejail 作为用户的登陆 shell，但在应用后，用户登陆时显示
没有指定 shell，连接立即被断开。可是使用 `login.user` 指定 `--shell` 参数会提示
这个参数已经 deprecated。用 `default.profile` 指定 shell 参数也总是说格式不正确。

简单的解决办法是写一个脚本作为用户的缺省 shell，而这个脚本直接使用 firejail 来执行
bash。

```bash
#!/bin/bash
exec firejail /bin/bash
```
这样用户登陆的时候就执行了一个受限的 bash，限制的条件完全通过配置文件来决定。

# 支持 scp 等远程命令

但这样设置的结果是用户在远程无法通过 scp 或者 rsync 命令传输文件。开始还以为是某些
权限设置的问题，调整了很久都没有效果。深入了解了这些命令才发现，它们实际上是通过
缺省 shell 启动了远程的其它程序。而之前的脚本无法处理这种情况。

比如用户执行了 scp 之后，缺省 shell 实际会收到如下的命令行参数：
```text
-c /usr/lib/openssh/sftp-server
```
我写的脚本必须要处理这种情况。因此修改起来也比较简单，最后的脚本如下：
```bash
#!/bin/bash
exec firejail /bin/bash "$@"
```

# 支持使用其它 shell

这样带来的问题就是用户登陆后只能使用 bash。想使用其它的 shell，比如 zsh 的话就只能
自己登陆后运行或写到 `~/.bashrc` 中。firejail 的主要应用场景是在沙箱中运行不可信的
程序。所以缺省配置中对各种本地的配置文件都做了保护。比如 `.zshrc` 是无法修改的，这
对于使用 zsh 非常不便。相应的配置在 `disable-common.inc` 中，而这个文件在 `default.profile`
中被包含。简单的解决办法是取消这个包含文件，这样大部分的软件都可以正常使用了。

# 限制应用

限制一个程序也非常简单。比如要让用户无法使用 ssh，就只需要在配置文件中增加：
```text
blacklist /usr/bin/ssh
```
