---
layout: post
title: Java基础：环境配置
tags: java learn 教程 Java基础教程
categories: java-learn
---
### 什么是Java开发环境？
Java 开发环境是用于开发、测试和运行 Java 应用程序的一套工具和设置的集合。这个环境包括以下关键组件和工具：

* Java Development Kit (JDK)：JDK 是 Java 开发的核心组件，它包括 Java 编译器（javac）、Java 运行时环境（JRE）、标准 Java 类库等。开发者使用 JDK 来编写和编译 Java 代码。JDK 还包括了 Java 的开发工具，如 javac 编译器和 java 运行时环境。

* 集成开发环境（IDE）：IDE 是开发 Java 应用程序的集成开发环境，提供了代码编辑、调试、构建和部署工具，以及其他功能，以提高开发效率。一些流行的 Java IDE 包括 VSCode、Eclipse、IDEA、NetBeans。

* 构建工具：构建工具用于自动化构建和管理 Java 项目。Apache Maven 和 Gradle 是两个常用的 Java 构建工具，它们可以处理项目依赖、编译代码、运行测试等任务。

### Java运行环境：Windows环境配置
0. 下载和安装 Java：

    访问 Oracle 官方网站或 OpenJDK 网站，从中下载最新的 Java JRE 版本。你可以选择 Oracle JDK 或 OpenJDK，具体取决于你的需求和偏好。

    运行下载的安装程序。按照安装程序的指示进行操作。通常情况下，你只需按照默认设置进行安装即可。安装过程将为你设置环境变量。

0. 检查 Java 安装：

    * 打开命令提示符（Command Prompt）或 PowerShell。

    * 运行以下命令来检查 Java 是否已成功安装：
        ```
        java -version
        ```
    如果你看到 Java 的版本信息，说明 Java 已成功安装。


0. 配置环境变量：

    Java 安装程序通常会自动配置系统环境变量，但你也可以手动检查和配置。这些环境变量包括 JAVA_HOME 和 PATH：

    * `JAVA_HOME`： 变量指向你的 Java 安装目录。例如，C:\Program Files\Java\jdk1.8.0_251。
    * `PATH`： 变量应包含 Java 可执行文件的路径。例如，%JAVA_HOME%\bin。

    你可以通过以下方式手动配置这些环境变量：

    右键单击"计算机"（或"此电脑"，取决于你的 Windows 版本）并选择"属性"。
    在左侧面板中，点击"高级系统设置"。
    在"系统属性"对话框中，点击"高级"选项卡。
    在"环境变量"下，编辑或创建 JAVA_HOME 变量，并将其值设置为 Java 安装目录。
    在系统变量列表中，找到 Path 变量，然后编辑它，将 %JAVA_HOME%\bin 添加到变量值的末尾，用分号分隔。
    保存所有更改并关闭对话框。

0. 验证配置：

    按键 `Win + R` 输入 `cmd`

    在面板中输入 `java -version` 然后回车。

### Java运行环境：Linux环境配置


### Java开发环境


### Java开发环境：VSCode

