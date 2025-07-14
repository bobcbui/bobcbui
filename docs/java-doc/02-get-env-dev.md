# Java环境配置

## 什么是 Java 环境？

Java 环境和PS, PPT, Excel这些一样， 要打开或创建excal 文件就需要安装office, WPS这些软件就是Excel的环境。

Java环境就是运行java文件的一些软件和系统配置，java环境又区分编辑Java文件的环境和运行Java的环境。

编辑Java的环境就是一些文本编辑器，例如VSCODE, IDEA， 这些软件可以很好的编辑Java文件。

运行Java的环境就需要JDK(Java Development Kitx)即Java开发工具包， 启示就是一个软件。

> 所谓java的跨平台就是JDK这个软件在windows, linux ， mac上都可以安装上，所以你写的java文件可以在这些设备上运行。

## 下载JDK和编辑器
这里用了OpenJDK 和 VSCode编辑器

JDK下载地址：[https://jdk.java.net/java-se-ri/21](https://jdk.java.net/java-se-ri/21)

VSCode下载地址：[https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)

## 配置 JAVA_HOME

1. 安装好 JDK 后，找到 JDK 的安装路径，例如：`C:\Program Files\Java\jdk-21`
2. 右键“此电脑” → 属性 → 高级系统设置 → 环境变量
3. 在“系统变量”中新建变量：
   - 变量名：`JAVA_HOME`
   - 变量值：`C:\Program Files\Java\jdk-21`（根据你的实际安装路径填写）

## 配置 Path

1. 在“系统变量”中找到 `Path`，点击编辑
2. 新增一条：`%JAVA_HOME%\bin`
3. 确认保存

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