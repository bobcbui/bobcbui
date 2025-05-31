# 在 VSCode 中配置 Java 开发环境

## 1. 安装 VSCode

前往 [Visual Studio Code 官网](https://code.visualstudio.com/) 下载并安装最新版 VSCode。

## 2. 安装 Java JDK

请先完成 JDK 的安装和环境变量配置（参考上一节“开发工具与环境”）。

## 3. 安装 Java 扩展包

打开 VSCode，进入扩展（Extensions）面板，搜索并安装 **Extension Pack for Java**（由 Microsoft 提供），它会自动安装以下常用扩展：
- Extension Pack for Java

## 4. 创建和运行 Java 项目

1. 按下 `Ctrl+Shift+P`，输入 `Java: Create Java Project`，选择合适的模板创建项目。
2. 新建 `.java` 文件，输入代码。
3. 右上角点击“运行”按钮或右键选择“Run Java”即可运行。

## 5. 常见问题

- 如果提示找不到 JDK，请检查 JDK 是否安装并配置了环境变量。
- 电脑安装的JDK必须大于或等于Java17。
- 使用Zip安装java , 不要使用安装程序来安装(可能出现未知问题)。

---

**参考资料：**
- [VSCode 官方 Java 教程](https://code.visualstudio.com/docs/languages/java)
- [Java 扩展包文档](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)