# Java环境配置

## 什么是 Java 环境？

Java 环境和PPT, Excel，MP3,MP4 这些一样， 要打开或创建excel文件就需要安装Office, WPS而安装这些软件的过程就是Excel环境配置。

Java环境配置就是运行java文件和编辑Java文件的一些软件和系统设置，Java环境又区分编辑Java文件的环境和运行Java文件的环境。

编辑Java的环境就是一些文本编辑器，例如VSCODE, IDEA， 这些软件可以很好的编辑Java文件。

运行Java的环境就需要JDK(Java Development Kitx)即Java开发工具包， 其实就是一个软件。

> 所谓java的跨平台就是JDK这个软件在windows, linux ， mac上都可以安装上，所以你写的java文件可以在这些设备上运行。

## 下载JDK和编辑器
本教程用了OpenJDK 和 VSCode编辑器

JDK下载地址：
[https://jdk.java.net/java-se-ri/21](https://jdk.java.net/java-se-ri/21)

VSCode下载地址：
[https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)

## Java运行环境配置的目的

1. 下载JDK后把用解压工具打开Java放到`D:\Java\jdk-21`目录,这个jdk-21文件夹就是Java软件目录，我们叫它JAVA_HOME，打开文件夹你可以看到下面这样子的目录。
   ```
   D:\Java\jdk-21
     |--bin
     |--conf
     |--include
     |--jmods
     |--legal
     |--lib
     .....
   ```

2. 我们现在打开bin文件夹，在里面我们可以看到java.exe 这个就是java软件了，双击他就可以运行了，但是只会闪一下就没了，因为你没有告诉它要干什么。

3. 现在我们要配置JAVA_HOME, PATH，配置JAVA_HOME 的目的是告诉别的软件你的JAVA安装在哪，配置Path, 是希望Windows 知道你的java.exe， javac.exe 等程序在哪。

## 配置 JAVA_HOME 和 Path 环境变量

1. 右键“此电脑” → 属性 → 高级系统设置 → 环境变量。
2. 在“系统变量”中新建变量：
   - 变量名：`JAVA_HOME`
   - 变量值：`D:\Java\jdk-21`（请根据你的实际安装路径填写）
3. 在“系统变量”中找到 `Path`，点击编辑。
4. 新增一条：`%JAVA_HOME%\bin`或`D:\Java\jdk-21\bin`（后面这种的缺点就是你更新java后要改两个地方）
5. 点击确定就可以了。

## 验证配置

打开命令行（Win+R 输入 `cmd`），输入：

```sh
java -version
```

```
openjdk version "17" 2021-09-14
OpenJDK Runtime Environment (build 17+35-2724)
OpenJDK 64-Bit Server VM (build 17+35-2724, mixed mode, sharing)
```

如果能正确输出版本号，说明配置成功。

---
**小贴士：**  
- 推荐使用 [Visual Studio Code](https://code.visualstudio.com/) 作为 Java 开发工具，并安装 Java 扩展包。
- 也可以使用 IntelliJ IDEA、Eclipse 等 IDE。