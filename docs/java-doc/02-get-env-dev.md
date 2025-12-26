# Java环境配置

## 什么是 Java 环境？

Java 环境类似于打开 Office 文档需要安装 Office 软件：编辑 Java 源文件需要编辑器（如 VSCode/IDEA），运行 Java 程序需要 JDK（Java Development Kit）。

开发环境（编辑器/IDE）：用于编写代码，例如 VSCode、IntelliJ IDEA、Eclipse。

运行环境（JDK）：包含 `java`、`javac` 等命令，用于运行和编译 Java 程序。常见发行版有 OpenJDK、AdoptOpenJDK、Oracle JDK、阿里/腾讯定制版等。

## 下载与安装

- 推荐使用 OpenJDK（或厂商发行版）。本教程以 OpenJDK 为例。
- JDK 下载： https://jdk.java.net/ 或厂商下载页（选择合适的版本，例如 17 或 21）。
- 编辑器：VSCode 下载 https://code.visualstudio.com/Download

安装建议：
- 推荐使用 ZIP/压缩包方式解压到简单路径，如 `D:\Java\jdk-21`，避免使用系统安装程序导致路径复杂或权限问题。

## 配置环境变量（GUI 方法）

1. 右键“此电脑” → 属性 → 高级系统设置 → 环境变量。
2. 在“系统变量”中新建变量：
	- 变量名：`JAVA_HOME`
	- 变量值：`D:\Java\jdk-21`（根据你的实际路径）
3. 编辑系统变量 `Path`，新增一条：`%JAVA_HOME%\bin`，并确保它在其他 `java` 路径之前。

保存后关闭所有命令行窗口再打开以使配置生效。

## 配置环境变量（PowerShell / 命令行方法）

使用 PowerShell 永久设置（当前用户）：

```powershell
setx JAVA_HOME "D:\Java\jdk-21"
```

注意：`setx` 修改后对当前进程无效，需要重新打开新的终端窗口才能看到变化。

如果需要临时在当前 PowerShell 会话中生效：

```powershell
$env:JAVA_HOME = 'D:\Java\jdk-21'
$env:Path = $env:JAVA_HOME + '\\bin;' + $env:Path
```

## 验证安装与排查命令

打开新的命令行或 PowerShell，运行：

```powershell
java -version
javac -version
where java        # Windows: 查看正在使用的 java 可执行路径
where javac
```

期望输出示例：

```
openjdk version "17" 2021-09-14
OpenJDK Runtime Environment (build 17+35-2724)
OpenJDK 64-Bit Server VM (build 17+35-2724, mixed mode, sharing)
javac 17
```

如果命令未找到或版本不对：

- 检查 `JAVA_HOME` 是否指向 JDK 根目录（不要指向 JRE 或 bin 目录）。
- 确认 `Path` 包含 `%JAVA_HOME%\bin`，并且该项排在其他旧 `java` 路径之前。
- 关闭并重新打开终端窗口或重启 IDE。

## 常见问题与解决方案

- 找不到 `java` 或 `javac`：确认 `JAVA_HOME` 与 `Path` 配置，使用 `where java` 查找可执行文件位置。
- 多个 JDK 并存：使用 `where java`/`where javac` 或 `Get-Command java` 来查看优先使用的路径，调整 `Path` 顺序或删除旧路径。
- 中文乱码/编码问题：确保源文件与 IDE 编码为 UTF-8，Windows 控制台可用 `chcp 65001` 切换到 UTF-8 编码。
- 端口/权限/防火墙问题：与 Java 本身无关，针对具体应用排查。
- 依赖下载慢或失败：配置阿里云 Maven 镜像或代理。

## 系统与开发环境小提示

- 显示文件扩展名与隐藏文件：在文件资源管理器“查看”中打开“文件扩展名”和“隐藏的项目”。
- 解决 VSCode 与系统快捷键冲突：调整输入法按键设置，或在 VSCode 中修改快捷键。
- VSCode Java：安装 `Extension Pack for Java`，如需在 VSCode 内指定 JDK，可在设置中配置 `java.home` 或在 `settings.json` 中添加：

```json
"java.home": "D:/Java/jdk-21"
```

## 参考与下一步

- 参考：VSCode Java 文档、OpenJDK 官方站点。
- 下一章：在 VSCode 中配置 Java 开发环境（参见 `03-dev-java-for-vscode.md`）。

---

**小贴士：** 推荐使用 VSCode 或 IDEA 编写 Java，并保持 JDK 版本为项目所需的最低版本（常见为 17 或 21）。