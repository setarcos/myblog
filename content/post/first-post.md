---
title: Hello Hyde
date: '2013-12-13 18:46:00'
tags:
    - software
---

第一次尝试使用比较流行的静态网页生成工具，记录一下基本操作过程和感受。

<!--more-->

# 安装

安装 hyde 还是比较容易的，首先安装 pip，好像大部分 python 用户都喜欢用这个安装工具：

```bash
# apt-get install python-pip
```

之后安装 hyde 就比较简单了，直接 `$ pip install hyde` 就可以，而且也会自动解决依赖关系。

# 配置

建立一个新的项目可以直接用下面的命令：

```bash
$ hyde -s myhyde create
```

这会使用缺省的 layout 布局页面，myhyde 就是项目的目录，里面的内容就已经是一个完整的网站源码了，之后只要在 myhyde 目录执行 `$ hyde serve` 就可以在 *localhost:8080* 上看到网站的效果了。

对网站的配置实际上就是对这个示例代码的阅读、理解和修改的过程。逐步修改配置文件 *site.yaml*，页面布局脚本 *layout/\*.j2*，和最终 content 目录中的 html 文件，以使网站代码符合我的应用。我把整个过程都通过 git 版本控制系统记录了下来，成为另外一个学习笔记。

页面布局脚本是 [Jinja][1] 模板，它的网站上有详细的[文档][2]可以参考。[Hyde][3]的主页上也包含了很多有价值的配置文档。有关 Markdown 的语法结构，可以参考[这个][4]。

# 问题

目前虽然网站已经可以上线，但还是有一些问题没有解决：

1. css 还要继续学习，一些样式还需要调整。

2. 代码列表和行内代码没有很好的区分，好像还需要额外的过滤器。
(Edit: 增加 Markdown 的 codehilite 扩展，就可以比较好的区分代码列表和行内代码了。)

[1]: http://jinja.pocoo.org/
[2]: http://jinja.pocoo.org/docs/templates/
[3]: http://hyde.github.io
[4]: http://daringfireball.net/projects/markdown/syntax 