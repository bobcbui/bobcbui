
# Java 库与依赖管理

本章介绍两种常见的 Java 依赖管理方式：将第三方 jar 放到项目 `lib` 目录手动引入，以及使用 Maven 自动管理依赖和构建。

---

## 1. 使用 `lib` 目录手动引入（适合小项目或无构建工具时）

1. 在项目根目录创建 `lib` 文件夹，把需要的第三方 `.jar` 文件放入该目录。
2. 在命令行编译时通过 `-cp`（或 `-classpath`）指定类路径：

```shell
javac -cp "lib/*;." -d out src\com\example\App.java
java -cp "lib/*;out" com.example.App
```

说明：Windows 下类路径使用分号 `;` 分隔，Unix/macOS 使用冒号 `:`。`lib/*` 表示引入 `lib` 下所有 jar。

优点：简单直观，无需构建工具。缺点：手动管理依赖版本、传递依赖困难，不适合复杂项目。

---

## 2. 使用 Maven 管理依赖（推荐用于大多数 Java 项目）

Maven 是常用的构建与依赖管理工具，它使用 `pom.xml` 描述项目、依赖与构建生命周期。

### 创建基本 `pom.xml`

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
				 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
				 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
				 http://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<groupId>com.example</groupId>
	<artifactId>my-app</artifactId>
	<version>1.0-SNAPSHOT</version>
	<properties>
		<maven.compiler.source>17</maven.compiler.source>
		<maven.compiler.target>17</maven.compiler.target>
	</properties>
	<dependencies>
		<!-- 示例：添加 Guava 依赖 -->
		<dependency>
			<groupId>com.google.guava</groupId>
			<artifactId>guava</artifactId>
			<version>31.1-jre</version>
		</dependency>
	</dependencies>
</project>
```

### 常用 Maven 命令

```shell
mvn clean           # 清理构建产物
mvn compile         # 编译源代码
mvn test            # 运行测试
mvn package         # 打包（生成 jar）
mvn dependency:tree # 查看依赖树，排查冲突
```

Maven 会自动下载依赖并处理传递依赖，解决了手工管理 `lib` 的诸多问题。

---

## 3. 将本地 jar 加入 Maven 项目

如果某些 jar 不在远程仓库，可以：

- 方式一（临时运行时添加）：把 jar 放到项目的 `lib`，并在 `pom.xml` 中通过 `system` 作用域引用（不推荐，因为不可移植）。
- 方式二（推荐）：把 jar 安装到本地 Maven 仓库：

```shell
mvn install:install-file -Dfile=path/to/foo.jar -DgroupId=com.example -DartifactId=foo -Dversion=1.0 -Dpackaging=jar
```

安装后即可像普通依赖那样在 `pom.xml` 中声明并使用。

---

## 4. 常见问题与排查

- 依赖冲突（版本冲突）：使用 `mvn dependency:tree` 查找冲突依赖，必要时使用 `<dependencyManagement>` 或 `<exclusions>` 排除。
- 下载依赖慢或失败：配置镜像（如阿里云 Maven 镜像）或使用代理；在 `~/.m2/settings.xml` 中配置 `<mirrors>`。
- 构建失败找不到类：确认 `scope` 是否正确（`provided` 表示运行时由容器提供，不会打包到最终 jar）。
- 想把 Maven 产物作为可运行 jar：使用 `maven-assembly-plugin` 或 `maven-shade-plugin` 生成可执行 fat/uber jar。

---

## 5. 快速最佳实践

- 小项目可以用 `lib` 临时管理依赖，但推荐尽早迁移到 Maven/Gradle。
- 使用 `mvn dependency:tree` 和 CI 自动构建保证依赖稳定性。
- 在公司内部搭建或使用可信镜像来加速依赖下载并保证可用性。

---

> 本章概览了手动 `lib` 管理与 Maven 管理依赖的差异与实践，推荐在真实项目中使用 Maven（或 Gradle）以提高可维护性。

