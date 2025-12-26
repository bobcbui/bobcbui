
# 快速使用第三方库（以 Guava 为例）

本节展示如何在 Java 项目中快速引入并使用第三方库。示例使用 Google Guava，演示依赖声明、示例代码与运行方式（Maven / Gradle）。

---

## 1. 添加依赖

Maven (pom.xml)：

```xml
<dependency>
	<groupId>com.google.guava</groupId>
	<artifactId>guava</artifactId>
	<version>31.1-jre</version>
</dependency>
```

Gradle (build.gradle)：

```groovy
dependencies {
	implementation 'com.google.guava:guava:31.1-jre'
}
```

添加后使用 IDE 同步或在命令行运行 `mvn compile` / `./gradlew build` 下载依赖。

---

## 2. 示例代码

创建 `src/main/java/com/example/ExampleGuava.java`：

```java
package com.example;

import com.google.common.collect.ImmutableList;
import com.google.common.base.Joiner;

public class ExampleGuava {
		public static void main(String[] args) {
				ImmutableList<String> list = ImmutableList.of("apple", "banana", "cherry");
				String joined = Joiner.on(", ").join(list);
				System.out.println("Joined: " + joined);
		}
}
```

运行：
- 在 IDE 中直接运行 `ExampleGuava`；或
- 使用 Maven Exec 插件：

```xml
<!-- 在 pom.xml 中添加 exec 插件配置（只需添加一次） -->
<build>
	<plugins>
		<plugin>
			<groupId>org.codehaus.mojo</groupId>
			<artifactId>exec-maven-plugin</artifactId>
			<version>3.0.0</version>
			<configuration>
				<mainClass>com.example.ExampleGuava</mainClass>
			</configuration>
		</plugin>
	</plugins>
</build>
```

然后运行:

```shell
mvn compile exec:java
```

或使用 Gradle:

```shell
./gradlew run --args=''
```

（需要在 `build.gradle` 中添加 `application` 插件并指定 `mainClass`。）

---

## 3. 小贴士

- 总是通过构建工具（Maven/Gradle）管理依赖，避免手动拷贝 jar。
- 使用 `mvn dependency:tree` 或 `./gradlew dependencies` 检查传递依赖与冲突。
- 在生产中锁定依赖版本并在 CI 中缓存仓库以提高稳定性。

---

> 以上示例展示了如何在几分钟内把第三方库引入到项目并运行示例代码。需要我把示例改为其他常用库（Jackson、Lombok、Log4j）吗？

