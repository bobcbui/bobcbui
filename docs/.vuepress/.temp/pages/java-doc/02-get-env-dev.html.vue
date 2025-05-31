<template><div><h1 id="开发工具与环境" tabindex="-1"><a class="header-anchor" href="#开发工具与环境"><span>开发工具与环境</span></a></h1>
<h2 id="什么是-java-环境配置" tabindex="-1"><a class="header-anchor" href="#什么是-java-环境配置"><span>什么是 Java 环境配置？</span></a></h2>
<p>Java 环境配置，就是把 <code v-pre>java.exe</code> 等工具设置为在电脑任意地方都可以运行，并且让其他软件知道 Java 的安装位置。当我们配置好 Java 环境后，比如 QQ、IDE 等软件就能自动找到你的 Java 安装目录，无需手动指定路径。</p>
<h2 id="配置-java-home" tabindex="-1"><a class="header-anchor" href="#配置-java-home"><span>配置 JAVA_HOME</span></a></h2>
<ol>
<li>安装好 JDK 后，找到 JDK 的安装路径，例如：<code v-pre>C:\Program Files\Java\jdk-21</code></li>
<li>右键“此电脑” → 属性 → 高级系统设置 → 环境变量</li>
<li>在“系统变量”中新建变量：
<ul>
<li>变量名：<code v-pre>JAVA_HOME</code></li>
<li>变量值：<code v-pre>C:\Program Files\Java\jdk-21</code>（根据你的实际安装路径填写）</li>
</ul>
</li>
</ol>
<h2 id="配置-path" tabindex="-1"><a class="header-anchor" href="#配置-path"><span>配置 Path</span></a></h2>
<ol>
<li>在“系统变量”中找到 <code v-pre>Path</code>，点击编辑</li>
<li>新增一条：<code v-pre>%JAVA_HOME%\bin</code></li>
<li>确认保存</li>
</ol>
<h2 id="验证配置" tabindex="-1"><a class="header-anchor" href="#验证配置"><span>验证配置</span></a></h2>
<p>打开命令行（Win+R 输入 <code v-pre>cmd</code>），输入：</p>
<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh"><pre v-pre><code><span class="line"><span class="token function">java</span> <span class="token parameter variable">-version</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre v-pre><code><span class="line">openjdk version "17" 2021-09-14</span>
<span class="line">OpenJDK Runtime Environment (build 17+35-2724)</span>
<span class="line">OpenJDK 64-Bit Server VM (build 17+35-2724, mixed mode, sharing)</span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果能正确输出版本号，说明配置成功。</p>
<hr>
<p><strong>小贴士：</strong></p>
<ul>
<li>推荐使用 <a href="https://code.visualstudio.com/" target="_blank" rel="noopener noreferrer">Visual Studio Code</a> 作为 Java 开发工具，并安装 Java 扩展包。</li>
<li>也可以使用 IntelliJ IDEA、Eclipse 等 IDE。</li>
</ul>
</div></template>


