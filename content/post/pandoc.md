---
title: using pandoc to convert latex to docx
date: '2018-06-26 19:32:55'
tags:
    - software
---

由于我比较习惯使用 latex 写自己的各种文档，而提交的时候又往往需要 Word 格式，
有一个合适的转换器就变得非常必要了。

<!--more-->

# 简介

将 latex 转换成 Word 格式的需求不断涌现，印象比较深的是 2011 年提交文稿的那次。
当时也是找了很多工具，最后使用了 tex4ht 工具，将文稿转换为 html，然后用自己
写的一些过滤脚本进行处理，最后才导入 Word。整个过程是比较痛苦而且错误百出的，
结果直到今天依然没有非常理想的工具。

最近又有了难以躲过的转换格式需求，pandoc 软件进入了我的视野，通过查看手册
发现 pandoc 简直是一个万能转换器，而我只是尝试了对 doc 的支持。

# 初使用

用它转换文件格式非常容易，不用配置脚本也没有复杂的开关选项。对于转换 latex
到 docx 只要如下的命令：

```bash
$ pandoc -f latex -t docx source.tex -o output.docx
```

不用解释就可以了解这个命令的使用方法，而且给我的第一感觉就是非常的快，甚至
比使用 latex 生成 pdf 文件的速度还快。唯一发现的问题是表格支持不太好，但表格
在我的文档中使用不多，手动调整一下就好了。

# 转换论文

这次的主要任务是转换科技论文，pandoc 又一次给我了惊喜，大部分公式和图片都
很好的进行转换，只有几个问题需要关注：

1. pdf 格式的文件支持不好，必须先转换为 png 格式。
2. matrix 公式支持不好
3. 公式里面自定义的 argmax 命令不支持
4. 公式和图没有编号

感觉 pandoc 并没有使用 latex 作为后端，而是用自己的解释器来分析文档，因此
稍微复杂一些的 latex 指令就无法支持了。虽然还没有尝试，估计 pgf 系列包都
不会支持的很好。

没有编号的问题比较大，交叉引用全部都失效了，这次我都通过手工修改了。网上看到
好像有过滤器可以做类似的事情，但语法格式都不是标准的 latex，我就只好放弃了。

# 参考文献

我开始以为参考文献是不被支持的，结果一个简单的过滤器就可以解决一半问题。

```bash
$ sudo apt-get install pandoc-citeproc
$ pandoc -f latex -t docx source.tex --bibliography=mybib.bibtex -o output.docx
```

这样是可以生成参考文献，但是格式不符合要求。经过网络搜索才知道还需要一个
格式描述文件（citation style language）[ieee.csl](https://github.com/citation-style-language/styles/blob/master/ieee.csl)。下载这个文件之后用如下命令就可以
搞定参考文献了。

```bash
$ pandoc -f latex -t docx source.tex --bibliography=mybib.bibtex --csl=ieee.csl -o output.docx
```
