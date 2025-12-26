
# Spring Boot 入门

本章以 Spring Boot 为例，介绍如何快速创建、运行和调试一个简单的 Spring Boot 应用，包含 Maven/Gradle 命令、示例 Controller 代码与常见问题排查。

---

## 1. 什么是 Spring Boot

Spring Boot 是 Spring 生态的快速启动框架，提供约定优于配置的项目结构、自动配置和内嵌服务器，使你可以用最少的样板代码快速构建独立运行的 Java 服务。

## 2. 创建项目（推荐使用 start.spring.io）

1. 打开 https://start.spring.io/，选择：
   - Project: Maven / Gradle
   - Language: Java
   - Spring Boot 版本（选择稳定 LTS，如 2.7.x 或 3.x，注意 JDK 版本要求）
   - 添加依赖：`Spring Web`（用于构建 REST 服务），可选 `Spring Data JPA`, `H2`, `DevTools` 等。
2. 下载生成的 zip，解压并在 IDE（IntelliJ/VSCode）中打开。

## 3. 示例：最小可运行的 REST Controller

创建 `src/main/java/com/example/demo/HelloController.java`：

```java
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
	@GetMapping("/hello")
	public String hello() {
		return "Hello, Spring Boot!";
	}
}
```

项目入口（通常由生成器创建）：

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}
}
```

## 4. 构建与运行

Maven:

```shell
mvn clean package
mvn spring-boot:run   # 直接运行（开发时常用）
```

Gradle:

```shell
./gradlew clean build
./gradlew bootRun      # 直接运行
```

打包后运行（可执行 jar）：

```shell
java -jar target/my-app-1.0-SNAPSHOT.jar   # Maven
java -jar build/libs/my-app-1.0-SNAPSHOT.jar  # Gradle
```

应用默认监听 8080 端口，访问 `http://localhost:8080/hello` 可见返回结果。

## 5. 常见问题与排查

- 应用不启动 / 报错找不到类：检查 `spring-boot-starter` 依赖是否存在并成功编译。
- 端口冲突（8080 被占用）：在 `application.properties` 中修改 `server.port=9090`，或关闭占用进程。
- JDK 版本不兼容：Spring Boot 3.x 要求 JDK 17 及以上，确保 `JAVA_HOME` 与 IDE 设置一致。
- 热重载无效：安装并启用 `spring-boot-devtools`，并确保 IDE 不在 `target`/`build` 外部运行编译产物。
- 依赖下载慢或失败：配置 Maven 镜像（`~/.m2/settings.xml`）或 Gradle 代理。

## 6. 开发与调试技巧

- 使用 `spring-boot-devtools` 获取热重载与快速重启体验（开发依赖）。
- 在 IDE 中设置断点，使用 `mvn spring-boot:run` / `bootRun` 启动后即可远程调试或本地调试。
- 使用 `application.properties` 或 `application.yml` 管理不同环境的配置（`spring.profiles.active=dev`）。
- 使用 Actuator（`spring-boot-starter-actuator`）查看健康检查、指标与环境信息（仅生产时谨慎开启敏感接口）。

## 7. 打包、容器化与部署

- 使用 `spring-boot-maven-plugin` 或 Gradle 的 `bootJar` 生成可执行 jar。
- 常见部署方式：直接运行 jar、Docker 镜像（基于 JRE / JDK 的基础镜像）、云平台（如 AWS Elastic Beanstalk、Heroku、Azure App Service）。

示例 Dockerfile（最简）：

```dockerfile
FROM eclipse-temurin:17-jre
COPY target/my-app-1.0-SNAPSHOT.jar /app/app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

---

> 小结：使用 Spring Boot 可以快速搭建可运行的服务，推荐通过 `start.spring.io` 生成项目骨架并在开发时使用 `spring-boot-devtools` 提高效率。生产环境需关注 JDK 版本、依赖管理与配置隔离。

