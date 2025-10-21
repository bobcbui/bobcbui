# Java环境配置

## 什么是 Java 环境？

Java 环境和PPT, Excel，MP3,MP4 这些一样， 要打开或创建excel文件就需要安装Office/WPS，而安装这些软件的过程就是Excel环境的安装配置。

Java环境又区分编辑Java文件的环境（开发环境）和运行Java文件的环境（生产环境）。

编辑Java的环境就是一些文本编辑器，例如VSCODE, IDEA，记事本， 这些软件可以编辑Java文件。

运行Java的环境就需要JDK(Java Development Kit)即Java开发工具包， 阿里，腾讯, 华为， Oracle, 微软都开发了JDK, 我们可以使用自己喜欢的公司开发的JDK。

## 下载JDK和编辑器
本教程用了OpenJDK 和 VSCode编辑器

JDK下载地址：
[https://jdk.java.net/java-se-ri/21](https://jdk.java.net/java-se-ri/21)

VSCode下载地址：
[https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)

## Java运行环境

1. 下载JDK后用解压工具打开Java放到`D:\Java\jdk-21`目录,这个jdk-21文件夹就是Java软件目录，我们叫它JAVA_HOME，打开文件夹你可以看到下面这样子的目录。
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

2. 我们现在打开bin文件夹，在里面我们可以看到java.exe 这个就是java软件了，双击他就可以运行了，但是只会闪一下就没了，因为你没有告诉它要干什么， 给它一个.java后缀的文件才可以运行。

3. 现在我们要配置JAVA_HOME, PATH，配置JAVA_HOME 的目的是告诉别的软件你的JAVA安装在哪，配置Path, 是希望Windows 知道你的java.exe， javac.exe 等程序在哪。

### 配置 JAVA_HOME 和 Path 环境变量

1. 右键“此电脑” → 属性 → 高级系统设置 → 环境变量。
2. 在“系统变量”中新建变量：
   - 变量名：`JAVA_HOME`
   - 变量值：`D:\Java\jdk-21`（请根据你的实际安装路径填写）
3. 在“系统变量”中找到 `Path`，点击编辑。
4. 新增一条：`%JAVA_HOME%\bin`。
5. 点击确定就可以了。

### 验证配置

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


## 系统环境设置
一些学习开发前需要设置的系统环境。

**1. 显示文件后缀名， 显示隐藏的文件和文件夹**
   1. 步骤一：打开文件资源管理器，点击“查看”选项卡，然后点击“选项”。

   ![显示文件后缀名](/images/java-doc/show-file-name-and-hidefile.png)

   2. 勾选“文件扩展名”复选框。

   ![显示文件后缀名](/images/java-doc/show-file-name-and-hidefile2.png)

**3. 设置Windows快捷键Ctrl+.和vscode冲突问题**

   1. 右键输入法图标，选择“按键配置”。

   ![设置Windows快捷键Ctrl+.和vscode冲突问题](/images/java-doc/setting-vscode-ctrl-key.png)

   2. 中/英文标点切换，选择“无”。

   ![设置Windows快捷键Ctrl+.和vscode冲突问题](/images/java-doc/setting-vscode-ctrl-key-2.png)


## 开发环境配置
[Java开发环境设置](/java-doc/03-dev-java-for-vscode.html)

---
**小贴士：**  
- 推荐使用 [Visual Studio Code](https://code.visualstudio.com/) 作为 Java 开发工具，并安装 Java 扩展包。
- 也可以使用 IntelliJ IDEA、Eclipse 等 IDE。