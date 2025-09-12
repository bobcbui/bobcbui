# 认识Java

Java就是一个电脑软件，这个电脑软件有Windows版本, 也有Mac版本, 还有Linux版本. 而过去主要系统就这些，所以Java是一种跨平台的编程语言（现在不那么是了）。

## 什么是电脑软件？

电脑软件通常是指可以在操作系统上运行的应用程序。在 Windows 下，最常见的格式是 `.exe` 文件，这是“可执行文件”（Executable File）的缩写。它们通常由 C/C++ 等编译型语言生成，直接运行在操作系统上。比如 QQ、微信等，用户只需要点击图标即可打开软件，进行聊天、输入文本等操作。

## java.exe 和普通 .exe 软件的区别

下载java后，打开文件夹里面的bin目录, 你会看到很多exe文件, 这些exe文件就是Java的各种工具, 其中最重要的就是java.exe, 其他的exe大多是为java.exe 提供帮助的.

## 用Java开发的软件是怎么运行的？
```java
# 第一步：编写Java代码并保存为`.java`文件。
# 第二步：使用`javac.exe`执行`.java`文件编译为字节码文件，生成`.class`文件。
javac.exe HelloWorld.java
# 第三步：使用`java.exe`命令运行`.class`文件，Java虚拟机（JVM）解释执行字节码。
java.exe HelloWorld
```

## 让Java在桌面上显示一个消息框

这是一个告诉Java在桌面显示一个消息看的内容, 把它拖拽到java.exe 上就可以在桌面显示一个消息.

```java
import javax.swing.JOptionPane;

public class HelloWorld {
    public static void main(String[] args) {
        JOptionPane.showMessageDialog(null, "HelloWorld");
    }
}
```


## 小结

现在我们知道Java就是一个电脑软件, 运行它的方式就是给它一段话, 它就可以根据你说的内容来运行, 显示出你想要的结果. 接下来的一段时间里, 我们就来学习如何写这段话, 也就是大家说的编程语言.

更多内容请继续学习后续章节。
