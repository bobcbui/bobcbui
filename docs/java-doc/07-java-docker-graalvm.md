
# Java 容器化与 GraalVM 原生镜像指南

本章介绍如何将 Java 应用打包为 Docker 镜像（可执行 jar）以及如何使用 GraalVM 的 `native-image` 构建原生可执行文件并打包成更小的镜像。适用于 Spring Boot、普通 Java 应用与微服务场景。

---

## 1. 准备：可执行 Jar（Spring Boot / fat-jar）

通过 Maven 或 Gradle 构建可执行 jar：

Maven:

```shell
mvn clean package
# 生成 target/my-app-1.0-SNAPSHOT.jar
```

Gradle:

```shell
./gradlew clean build
# 生成 build/libs/my-app-1.0-SNAPSHOT.jar
```

## 2. 基本 Dockerfile（运行时镜像）

简单、常用的多阶段构建 Dockerfile（基于 JDK 构建、JRE 运行）：

```dockerfile
# build stage
FROM maven:3.8.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

# runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/my-app-1.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

构建并运行：

```shell
docker build -t my-app:latest .
docker run -p 8080:8080 my-app:latest
```

此镜像包含标准 JRE，启动简单但体积较大（几十到几百 MB）。

---

## 3. 更小的运行时：使用 Distroless / Slim 镜像

将运行时替换为更小的基础镜像可以减小镜像体积，例如使用 `gcr.io/distroless/java17-debian11`：

```dockerfile
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -DskipTests package

FROM gcr.io/distroless/java17-debian11
COPY --from=build /app/target/my-app-1.0-SNAPSHOT.jar /app/app.jar
ENTRYPOINT ["/usr/bin/java","-jar","/app/app.jar"]
```

注意：distroless 镜像没有 shell，调试时需要用 build 阶段或临时镜像。

---

## 4. GraalVM 原生镜像概念与优点

GraalVM 的 `native-image` 可以把 Java 应用编译成独立的本地可执行文件，启动快、内存驻留小，适合无冷启动要求的微服务和命令行工具。缺点包括构建时间长、原生镜像体积（通常仍较小但包含静态链接）及对动态特性（反射、动态代理）需要显式配置。

推荐场景：延迟敏感的短生命周期服务、CLI 工具、资源受限环境。

---

## 5. 使用 GraalVM 构建原生镜像（本地或 Docker）

两种常见方法：在本地安装 GraalVM 并使用 `native-image`，或使用 GraalVM 提供的 Docker builder 镜像在容器内构建。

示例：使用 GraalVM 的 Docker builder（推荐，避免在本地安装大量依赖）

```dockerfile
# 1. build stage: use GraalVM builder image
FROM ghcr.io/graalvm/graalvm-ce:ol8-java17-23.0.2 as builder
WORKDIR /app
COPY . /app
RUN gu install native-image
RUN ./mvnw -DskipTests package
RUN native-image --no-fallback -jar target/my-app-1.0-SNAPSHOT.jar -H:Name=myapp

# 2. runtime: use minimal base
FROM gcr.io/distroless/cc
COPY --from=builder /app/myapp /usr/local/bin/myapp
ENTRYPOINT ["/usr/local/bin/myapp"]
```

说明：
- `--no-fallback` 可以避免生成回退 jar，减小体积，但需确保所有反射配置正确。
- 复杂框架（Spring Boot）需要额外配置或使用专门的扩展（Spring Native / Spring AOT）来生成原生镜像。

构建：

```shell
docker build -t myapp-native:latest .
docker run -p 8080:8080 myapp-native:latest
```

---

## 6. Spring Boot 与 GraalVM

Spring Boot 支持原生编译的路线包括 Spring Native（老方案）和 Spring AOT（Spring Boot 3.x 的原生支持）。要生成原生镜像：

- 使用 Spring Boot 3.x + spring-boot-maven-plugin 与 native-image 工具链，或
- 使用 Quarkus/ Micronaut 等对原生支持更成熟的框架以简化流程。

构建注意事项：
- 反射、代理、资源文件需在 `reflect-config.json` / `resource-config.json` 中声明，或使用 AOT 插件自动生成。
- 使用 `mvn -Pnative`（或 Gradle 的相应插件）触发原生编译（依赖项目配置）。

---

## 7. 常见问题与排查

- 构建失败（内存不足）：原生镜像构建占用大量内存，建议在 CI 或具有更多资源的构建主机 / Docker builder 中运行。
- 反射相关错误（NoSuchMethod/NoSuchField）：需要生成并包含反射配置文件，或通过框架的 AOT 插件自动配置。
- 运行时缺少文件：确保将必要的资源（配置、模板等）包含在 native-image 构建时的资源配置中。
- 启动参数：原生可执行文件可接受 JVM 无关参数，但无法使用 `-Xmx` 等 JVM 参数；需在构建时调优内存占用。

---

## 8. 参考与工具链

- GraalVM 官方：https://www.graalvm.org/
- Spring AOT / Spring Native 文档
- 使用 Docker builder 镜像可以更稳定地在 CI 中构建原生镜像。

> 小结：普通 Java 服务可通过多阶段 Dockerfile 打包为较小的运行时镜像；对启动时间和内存有严格要求时，可考虑 GraalVM 原生镜像，但需投入更多构建与配置工作。

