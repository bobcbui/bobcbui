<template><div><h1 id="认识java从一个普通的电脑软件开始" tabindex="-1"><a class="header-anchor" href="#认识java从一个普通的电脑软件开始"><span>认识Java从一个普通的电脑软件开始</span></a></h1>
<p>当我们在 Windows 系统中使用电脑时，经常会接触到各种各样的软件，比如 QQ、微信、浏览器等。这些软件大多数是通过双击一个图标（通常是 <code v-pre>.exe</code> 文件）来启动的。对于初学者来说，理解这些软件的本质和 Java 程序的关系，是学习编程的第一步。</p>
<h2 id="什么是电脑软件" tabindex="-1"><a class="header-anchor" href="#什么是电脑软件"><span>什么是电脑软件？</span></a></h2>
<p>电脑软件通常是指可以在操作系统上运行的应用程序。在 Windows 下，最常见的格式是 <code v-pre>.exe</code> 文件，这是“可执行文件”（Executable File）的缩写。它们通常由 C/C++ 等编译型语言生成，直接运行在操作系统上。比如 QQ、微信等，用户只需要点击图标即可打开软件，进行聊天、输入文本等操作。</p>
<h2 id="java-软件和普通-exe-软件的区别" tabindex="-1"><a class="header-anchor" href="#java-软件和普通-exe-软件的区别"><span>Java 软件和普通 .exe 软件的区别</span></a></h2>
<p>Java 软件和传统的 <code v-pre>.exe</code> 软件有一些不同：</p>
<ul>
<li>普通应用程序（如 QQ、微信）通常是 <code v-pre>QQ.exe</code> <code v-pre>微信.exe</code> 文件，直接在 Windows 上运行。</li>
<li>Java这个软件是一个<code v-pre>java.exe</code> 的文件, 你不能直接通过点击来运行, 你可以给它一段话,告诉它怎么来运行, 比如让它在电脑上显示一个消息框, 或者让它帮你去某某网站上下载一些视频。</li>
</ul>
<h2 id="让java在桌面上显示一个消息框" tabindex="-1"><a class="header-anchor" href="#让java在桌面上显示一个消息框"><span>让Java在桌面上显示一个消息框</span></a></h2>
<p>着是一个告诉Java在桌面显示一个消息看的内容, 把它拖拽到java.exe 上就可以在桌面显示一个消息.</p>
<div class="language-java line-numbers-mode" data-highlighter="prismjs" data-ext="java"><pre v-pre><code><span class="line"><span class="token keyword">import</span> <span class="token import"><span class="token namespace">javax<span class="token punctuation">.</span>swing<span class="token punctuation">.</span></span><span class="token class-name">JOptionPane</span></span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">HelloWorld</span> <span class="token punctuation">{</span></span>
<span class="line">    <span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">[</span><span class="token punctuation">]</span> args<span class="token punctuation">)</span> <span class="token punctuation">{</span></span>
<span class="line">        <span class="token class-name">JOptionPane</span><span class="token punctuation">.</span><span class="token function">showMessageDialog</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> <span class="token string">"HelloWorld"</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line">    <span class="token punctuation">}</span></span>
<span class="line"><span class="token punctuation">}</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结"><span>小结</span></a></h2>
<p>现在我们知道Java就是一个电脑软件, 运行它的方式就是给它一段话, 它就可以根据你说的内容来运行, 显示出你想要的结果. 接下来的一段时间里, 我们就来学习如何写这段话, 也就是大家说的编程语言.</p>
<p>更多内容请继续学习后续章节。</p>
</div></template>


