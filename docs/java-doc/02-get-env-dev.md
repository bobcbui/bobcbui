# 开发工具与环境

## 什么是 Java 环境配置？

Java 环境配置，就是把 `java.exe` 等工具设置为在电脑任意地方都可以运行，并且让其他软件知道 Java 的安装位置。当我们配置好 Java 环境后，比如 QQ、IDE 等软件就能自动找到你的 Java 安装目录，无需手动指定路径。

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