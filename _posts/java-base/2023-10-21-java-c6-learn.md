---
layout: post
title: Java基础：Java 对象和类
tags: java learn 教程 Java基础教程
categories: java-learn
order: 6
---
在Java中，对象和类是面向对象编程的核心概念。理解这两个概念对于编写有效的Java代码至关重要。

### 类

类是对象的蓝图或原型。它定义了创建对象的数据和行为（即属性和方法）。在Java中，类是用关键字 `class` 来声明的。

一个类可以包含以下元素：
- **字段（属性）**: 表示对象的状态。
- **方法**: 表示对象的行为。
- **构造器**: 用于创建对象。
- **块**: 用于初始化代码。
- **嵌套类和接口**。

例如，定义一个简单的 `Car` 类：
```java
public class Car {
    // 字段
    String brand;
    int year;

    // 构造器
    public Car(String brand, int year) {
        this.brand = brand;
        this.year = year;
    }

    // 方法
    public void display() {
        System.out.println("Brand: " + brand + ", Year: " + year);
    }
}
```

### 对象

对象是类的实例。当你使用类的定义创建一个实际的、具体的东西时，那就创建了一个对象。对象拥有类定义的所有属性和行为。

要创建一个类的实例，你需要使用关键字 `new` 和类的构造器。

例如，根据上面的 `Car` 类创建一个对象：
```java
public class TestCar {
    public static void main(String[] args) {
        // 创建对象
        Car myCar = new Car("Toyota", 2020);

        // 调用对象的方法
        myCar.display();
    }
}
```

在这个例子中，`myCar` 是一个对象，它是 `Car` 类的实例。它具有品牌和年份这两个属性，还有一个显示这些信息的方法。

### 重要概念

- **封装**: 将数据（属性）和代码（方法）捆绑到一起。
- **继承**: 从另一个类继承特性，促进代码复用。
- **多态**: 通过父类引用指向子类对象，实现不同形式的方法。

理解对象和类是深入掌握Java编程的基础，也是理解面向对象编程的关键。