# Java基础语法与第一个程序

## 第一个Java程序


Java程序一般以类为单位，主入口为 `main` 方法。除了控制台输出，还可以用弹窗显示结果，推荐初学者体验 `JOptionPane` 图形界面弹窗。

下面是最经典的 HelloWorld 示例（弹窗方式）：


```java
import javax.swing.JOptionPane;

public class HelloWorld {
    public static void main(String[] args) {
        JOptionPane.showMessageDialog(null, "Hello, World!");
    }
}
```

> 说明：JOptionPane 是 Java 标准库中的弹窗工具类，需导入 `javax.swing.JOptionPane`。


**运行方式（Java 17 及以上）**

1. 保存为 `HelloWorld.java`
2. 打开命令行，进入文件所在目录
3. 直接运行：
   ```shell
   java HelloWorld.java
   ```
4. 输出结果：
   ```
   Hello, World!
   ```

> 说明：Java 11 及以上版本支持直接运行源文件，无需先编译。推荐使用 Java 17 或更高版本学习。

---


## 注释

注释是写给其他开发者或未来自己的说明性文字，Java 编译器不会处理注释内容。合理、清晰的注释能帮助理解代码逻辑，方便维护和协作，避免遗忘细节。


```java
// import 的意思是导入, 这里导入比如写好的代码,用于后续使用.
// // 注释是单行注释的意思
import javax.swing.JOptionPane;

/**
 * 这个是多行注释
 */
public class HelloWorld {
    public static void main(String[] args) {
        JOptionPane.showMessageDialog(null, "Hello, World!");
        /*
        这里也是多行注释,
        但是上面的是文档注释,用于给代码写文档使用
         */

        // 你好

        // 在吗?

    }
}
```


## 变量与数据类型

Java常用数据类型：

- 整型：`byte`、`short`、`int`、`long`
- 浮点型：`float`、`double`
- 字符型：`char`
- 布尔型：`boolean`
- 引用类型：类、接口、数组

示例：
```java
int age = 18;
double price = 99.5;
char grade = 'A';
boolean isActive = true;
String name = "Tom";
```

## 运算符

- 算术运算符：`+ - * / % ++ --`
- 关系运算符：`== != > < >= <=`
- 逻辑运算符：`&& || !`
- 赋值运算符：`= += -= *= /= %=`
- 位运算符：`& | ^ ~ << >> >>>`

## 流程控制

**条件语句**
```java
if (age > 18) {
    JOptionPane.showMessageDialog(null, "成年人");
} else {
    JOptionPane.showMessageDialog(null, "未成年人");
}

switch (grade) {
    case 'A':
        JOptionPane.showMessageDialog(null, "优秀");
        break;
    case 'B':
        JOptionPane.showMessageDialog(null, "良好");
        break;
    default:
        JOptionPane.showMessageDialog(null, "其他");
}
```

**循环语句**
```java
for (int i = 0; i < 5; i++) {
    JOptionPane.showMessageDialog(null, i);
}

int j = 0;
while (j < 5) {
    JOptionPane.showMessageDialog(null, j);
    j++;
}

do {
    JOptionPane.showMessageDialog(null, j);
    j++;
} while (j < 10);
```

## 方法

方法定义与调用：
```java
public int sum(int a, int b) {
    return a + b;
}

int result = sum(3, 5);
```

## 类与对象

类定义与对象创建：
```java
public class Person {
    String name;
    int age;

    public void sayHello() {
    JOptionPane.showMessageDialog(null, "Hello, " + name);
    }
}

Person p = new Person();
p.name = "Alice";
p.age = 20;
p.sayHello();
```

## 继承与多态

继承：
```java
public class Animal {
    public void eat() {
        JOptionPane.showMessageDialog(null, "动物吃饭");
    }
}

public class Dog extends Animal {
    public void eat() {
        JOptionPane.showMessageDialog(null, "狗吃骨头");
    }
}

Animal a = new Dog();
a.eat(); // 输出：狗吃骨头
```

## 接口

接口定义与实现：
```java
public interface Flyable {
    void fly();
}

public class Bird implements Flyable {
    public void fly() {
    JOptionPane.showMessageDialog(null, "鸟在飞");
    }
}
```

## 异常处理

异常捕获与抛出：
```java
try {
    int x = 10 / 0;
} catch (ArithmeticException e) {
    JOptionPane.showMessageDialog(null, "除零错误");
} finally {
    JOptionPane.showMessageDialog(null, "结束");
}
```

## 常用类库

字符串处理、集合、IO等：
```java

String s = "hello";
JOptionPane.showMessageDialog(null, s.length());

List<String> list = new ArrayList<>();
list.add("A");
list.add("B");

for (String item : list) {
    JOptionPane.showMessageDialog(null, item);
}
```