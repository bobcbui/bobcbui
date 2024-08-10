---
layout: post
title: Java基础：Java 修饰符
tags: java learn 教程 Java基础教程
categories: Java文档
order: 9
---
在Java中，修饰符主要分为两类：访问控制修饰符和非访问控制修饰符。它们用于定义类、变量、方法和构造器的访问类型及其行为。

### 访问控制修饰符
访问控制修饰符决定了类及其成员的可见性和访问范围。

1. **public**: 类、方法、构造器或变量被声明为public，意味着它可以从任何其他类访问。
2. **protected**: 当成员被声明为protected，它可以被同一包内的任何其他类以及不同包中的子类访问。
3. **default** (无修饰符): 如果未指定任何访问修饰符，则使用默认访问控制级别，这意味着它只能被同一包内的类访问。
4. **private**: 当成员被声明为private，它只能在声明它的类中访问。

### 非访问控制修饰符
非访问控制修饰符用于实现其他功能，例如继承、封装等。

1. **static**: 用于创建类方法和类变量。
2. **final**: 用于修饰类、方法和变量。final类不能被继承，final方法不能被重写，final变量的值一旦被赋值后不能被改变。
3. **abstract**: 用于创建抽象类和抽象方法。抽象类不能被实例化，抽象方法必须在子类中提供实现。
4. **synchronized** 和 **volatile**: 用于线程的上下文中。
   - **synchronized**: 用于线程安全，确保多个线程不同时访问同一个资源或代码块。
   - **volatile**: 用于让一个变量在多个线程中可见。

### 示例

- **public class**:
  ```java
  public class MyClass {
      // ...
  }
  ```

- **private variable**:
  ```java
  public class MyClass {
      private int myVar;
      // ...
  }
  ```

- **static method**:
  ```java
  public class MyClass {
      public static void myMethod() {
          // ...
      }
  }
  ```

- **final variable**:
  ```java
  public class MyClass {
      final int maxVal = 10;
      // ...
  }
  ```

了解并正确使用这些修饰符对于编写结构化、高效且安全的Java程序非常重要。它们有助于提高代码的封装性、灵活性和维护性。