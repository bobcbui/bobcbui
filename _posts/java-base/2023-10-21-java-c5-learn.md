---
layout: post
title: Java基础：Java注释
tags: java learn 教程 Java基础教程
categories: Java文档
order: 5
---
Java注释是用于解释代码的语句，它们不会被编译器执行。注释对于提高代码的可读性和维护性非常重要，尤其是在团队合作和代码复用的情况下。Java提供了三种主要的注释方式：

1. **单行注释**:
   - 用两个斜杠 `//` 开始，仅对其后的内容进行注释。
   - 仅在当前行有效。
   - 例如:
     ```java
     // 这是一个单行注释
     int number = 10;  // 这里也是注释
     ```

2. **多行注释**:
   - 用 `/*` 开始和 `*/` 结束。
   - 可以跨越多行。
   - 通常用于对代码段进行说明或临时禁用一部分代码。
   - 例如:
     ```java
     /* 这是一个
     多行注释 */
     int number = 10;
     ```

3. **文档注释**:
   - 用 `/**` 开始和 `*/` 结束。
   - 主要用于生成Java文档（JavaDoc）。
   - 可以用来为类、方法、字段等添加描述性文本。
   - 支持一些特殊的注释标签，如 `@param`、`@return`、`@throws` 等。
   - 例如:
     ```java
     /**
      * 这是一个文档注释
      * @param args 命令行参数
      */
     public static void main(String[] args) {
         // ...
     }
     ```

正确使用注释可以极大地提高代码的可读性和维护性，特别是对于复杂的业务逻辑和算法。值得注意的是，虽然注释很有用，但过多的注释或不必要的注释可能会使代码变得杂乱无章，因此需要适度地使用注释。