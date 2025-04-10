---
title: Font Fallback
date: '2025-03-03 09:39:45'
tags:
    - linux
---

让终端可以显示的更美观。

<!--more-->

# 字体问题

只从更换到 alacritty 作为主要的终端模拟器之后，一直对它很满意，唯一遇到的问题是部分字形无法
显示，例如 💻 是一个电脑的图标，但在我之前的终端上显示不出来。但这种字形平时很少遇到，网页
上显示也都正常，就一直没有管它。究其根源就是这些字形在我目前使用的字体文件中没有定义，所以
无法显示。

# 字体 Fallback

最近又试用了 ghostty，它却可以正常显示这些字形，于是萌生了提升 alacritty 体验的想法。经过调研
发现 alacritty 没有字体 fallback 的设置，只能依赖系统的设置。解决的办法就是创建一个字体配置文件：
`.config/fontconfig/fonts.conf`，内容如下：


```xml
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <alias>
    <family>JetBrains Mono</family>
    <prefer>
      <family>JetBrains Mono</family>
      <family>Noto Color Emoji</family>
    </prefer>
  </alias>
    <alias>
    <family>JetBrains Mono Bold</family>
    <prefer>
      <family>JetBrains Mono Bold</family>
      <family>Noto Color Emoji</family>
    </prefer>
  </alias>
    <alias>
    <family>JetBrains Mono Italic</family>
    <prefer>
      <family>JetBrains Mono Italic</family>
      <family>Noto Color Emoji</family>
    </prefer>
  </alias>
</fontconfig>
```
这里定义了我如果使用 `JetBrains Mono` 字体的时候，如果遇到不能显示的字形，就要使用
`Noto Color Emoji` 字体来显示。设置之后重启 alacritty 就可以正确显示之前缺失的字形了。

# 存在的问题

* `Noto Color Emoji` 是我为了这次调整新安装的字体，不知道有什么办法可以知道 ghostty
使用的什么字体，ghostty 甚至不依赖系统的字体设置。
* alacritty 对字体的 ligature 没有支持，ghostty 支持的就很好。
