---
title: using ffmpeg to stablize a video
date: '2020-04-15 22:08:53'
tags:
    - software
---

手持拍摄的视频总会抖动，使用 Linux 的现成工具就可以进行修补。

<!--more-->

首先将视频转换为图像文件：

```bash
$ ffmpeg -i ../INPUT.MP4 DSC_%03d.png
```

从图像中找到一个子图像用来对比，尽量小一点的图像便于快速定位，但必要要保证
图像有一定的特点，可以在视频中唯一定位。

接下来利用 ImageMagick 进行子图像的定位：

```bash
$ compare -metric RMSE -subimage-search big.png sub.png k.png
```

其中命令中的最后一个参数是具有定位信息的结果图像，在这里可以忽略。

编写一个简单的命令脚本将每次的定位结果写入到文件中：

```bash
$ for i in DSC_* ; do compare -metric RMSE -subimage-search $i sub.png k.png 2>> log.txt; echo >> log.txt; done
$ cat log.txt | awk '{print $4}' > pos.txt
```

pos.txt 中的坐标值就是子图像在每个视频帧的位置，然后编写一个小脚本对视频帧进行
剪裁。这里我用了 python 以增加扩展性，也许将来可以把全部内容写到一个程序中。

最后用 ffmpeg 将图像再编码成视频。

```bash
$ ffmpeg -f image2 -i pic%03d.png test.mp4
```
