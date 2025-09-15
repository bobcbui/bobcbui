# 认识Java

Java就是一个电脑软件，这个软件有Windows版本, 也有Mac版本, 还有Linux版本. 而过去主要就这些系统，所以Java是一种跨平台的编程语言（现在不那么是了）。

## Java可以做什么?
Java和其他软件不一样，我们可以用这个软件再做一个软件, 它是一个没有操作界面的软件， 你需要给它一段话, 它会根据你说的内容来运行, 显示出你想要的结果.

你可以给Java一段话, 让它在桌面上显示一个消息框，这文本我们通常称它为`Java程序`.

**比如：**
``` java
import javax.swing.JOptionPane;

public class HelloWorld {
    public static void main(String[] args) {
        JOptionPane.showMessageDialog(null, "HelloWorld");
    }
}
```
上面这个`Java程序`只是一个简单弹出一个对话框，我们可以通过复杂的描述来实现更丰富的功能，比如实现一个类似QQ,微信软件。

## 小结

现在我们知道Java就是一个电脑软件, 运行它的方式就是给它一段话, 它就可以根据你说的内容来运行, 显示出你想要的结果. 接下来的一段时间里, 我们就来学习如何写这段话, 也就是大家说的编程语言.

更多内容请继续学习后续章节。
