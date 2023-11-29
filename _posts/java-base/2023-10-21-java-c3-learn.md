---
layout: post
title: Java基础：第一个Java程序
tags: java learn 教程 Java基础教程
categories: java-learn
order: 3
---

创建第一个Java程序是一个简单且激动人心的步骤。以下是一个基本的Java程序的步骤和代码示例。

1. **安装Java开发工具包 (JDK)**: 在开始编写任何Java代码之前，您需要确保已经安装了Java开发工具包 (JDK)。可以从Oracle官网下载并安装。

2. **设置环境变量**: 安装JDK后，可能需要设置环境变量，以便在命令行中轻松运行Java程序。

3. **编写代码**:
   - 创建一个文本文件，并将其命名为 `HelloWorld.java`。
   - 打开该文件，并编写以下Java代码：

     ```java
     public class HelloWorld {
         public static void main(String[] args) {
             System.out.println("Hello, World!");
         }
     }
     ```

    这段代码定义了一个名为 `HelloWorld` 的类，它包含一个 `main` 方法。这是Java程序的入口点。`System.out.println("Hello, World!");` 语句用于在控制台输出文本 "Hello, World!"。

4. **编译代码**:
   - 打开命令行工具。
   - 导航到保存 `HelloWorld.java` 文件的目录。
   - 运行以下命令来编译程序：`javac HelloWorld.java`。这将生成一个名为 `HelloWorld.class` 的字节码文件。

5. **运行程序**:
   - 在同一目录中，运行命令 `java HelloWorld`。
   - 如果一切顺利，您将在控制台看到输出：“Hello, World!”

恭喜！您刚刚创建并运行了您的第一个Java程序。随着您继续学习Java，您将开始探索更复杂的概念和构建更高级的程序。