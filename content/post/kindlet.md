---
title: Writing a kindlet
date: '2018-03-15 09:30:19'
tags:
    - programming
---

Kindle 提供了一个 Java 的编程接口，有点类似于网页的 Applet，于是
我就尝试如何写一个程序放上去。

<!--more-->

# 基本流程

Kindlet 的主要类库是 KDK，可以从 Kindle 里面直接拷贝出来，位置是

```bash
$ /opt/amazon/ebook/lib/Kindlet-1.2.jar
```

编写一个 Main.java

```java
package test;

import com.amazon.kindle.kindlet.AbstractKindlet;
import com.amazon.kindle.kindlet.KindletContext;
import com.amazon.kindle.kindlet.ui.KTextArea;

public class Main  extends AbstractKindlet {

    private KindletContext ctx;

    public void create(KindletContext context) {
            this.ctx = context;
    }

    public void start() {
            try {
                    ctx.getRootContainer().add(new KTextArea("Hello World!"));
            } catch (Throwable t) {
                    t.printStackTrace();
            }
    }
}
```

设置 CLASSPATH 包含 KDK，然后就可以直接用 javac 编译代码，但这里要
指定 java 的版本：

```bash
$ javac -target 1.4 -source 1.4 Main.java
```

再写一个 MANIFEST.MF 文件，注意 `Main-Class` 的部分

```text
Manifest-Version: 1.0
Main-Class: test.Main
Implementation-Title: Hello
Implementation-Version: 0.1
Implementation-Vendor: Setarcos
SDK-Specification-Version: 1.0
SDK-Extension-Name: com.amazon.kindle.kindlet
Toolbar-Mode: persistent
Font-Size-Mode: point
```

使用 jar 命令打包（Main.class 放到 test 目录，因为包名称是 test）：

```bash
$ jar cvmf MANIFEST.MF hello.jar test
```

最后用 jarsigner 打包：

```bash
$ jarsigner -sigalg SHA1withDSA -keystore developer.keystore -storepass \
password hello.jar dktest
$ jarsigner -sigalg SHA1withDSA -keystore developer.keystore -storepass \
password hello.jar ditest
$ jarsigner -sigalg SHA1withDSA -keystore developer.keystore -storepass \
password hello.jar dntest
```

将 `hello.jar` 改名为 `hello.azw2` 拷贝到 `documents` 目录就可以了。

# 遇到的坑

遇到的大部分问题在网上都能找到答案，但很多时候是不知道自己犯了什么错误，
因此花了一整天才把一切搞定。

1. java 编译的时候要指定版本
2. MANIFEST 的内容，最后根据 KUAL 里面的修改
3. jar 打包的格式原来也不熟悉，目录结构需要按照包的层级保存
4. 签名的部分花了最久的时间，-sigalg 参数的问题没有在网上看到过

# 关于签名

签名可以通过 keytool 生成新的签名信息，然后把和系统中的签名信息融合在
一起。但其实最方便的还是用 test 用户来签名，将来把程序拷贝给别人也可以用。
签名文件保存在系统的如下目录：

```bash
/var/local/java/keystore/developer.keystore
```

如果要融合签名信息，也可以使用 keytool 命令：

```bash
$ keytool -importkeystore -srckeystore developer-to-import.keystore\
-destkeystore developer.keystore
```

系统签名文件的密码是 `password`，三个签名的别名前缀 `dk`，`di`，`dn`
分别代表 `kindle`，`interacitve`，`network` 三个权限，一般用三个签名
都签一遍就好了。

开始的时候我的签名总不好使，对比了 KUAL 签名后的 MANIFEST 之后发现它是
用 SHA1 算法，因此加上 -sigalg 再签名就 OK 了。
