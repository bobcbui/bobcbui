<template><div><h1 id="在-vscode-中配置-java-开发环境" tabindex="-1"><a class="header-anchor" href="#在-vscode-中配置-java-开发环境"><span>在 VSCode 中配置 Java 开发环境</span></a></h1>
<h2 id="_1-安装-vscode" tabindex="-1"><a class="header-anchor" href="#_1-安装-vscode"><span>1. 安装 VSCode</span></a></h2>
<p>前往 <a href="https://code.visualstudio.com/" target="_blank" rel="noopener noreferrer">Visual Studio Code 官网</a> 下载并安装最新版 VSCode。</p>
<h2 id="_2-安装-java-jdk" tabindex="-1"><a class="header-anchor" href="#_2-安装-java-jdk"><span>2. 安装 Java JDK</span></a></h2>
<p>请先完成 JDK 的安装和环境变量配置（参考上一节“开发工具与环境”）。</p>
<h2 id="_3-安装-java-扩展包" tabindex="-1"><a class="header-anchor" href="#_3-安装-java-扩展包"><span>3. 安装 Java 扩展包</span></a></h2>
<p>打开 VSCode，进入扩展（Extensions）面板，搜索并安装 <strong>Extension Pack for Java</strong>（由 Microsoft 提供），它会自动安装以下常用扩展：</p>
<ul>
<li>Extension Pack for Java</li>
</ul>
<h2 id="_4-创建和运行-java-项目" tabindex="-1"><a class="header-anchor" href="#_4-创建和运行-java-项目"><span>4. 创建和运行 Java 项目</span></a></h2>
<ol>
<li>按下 <code v-pre>Ctrl+Shift+P</code>，输入 <code v-pre>Java: Create Java Project</code>，选择合适的模板创建项目。</li>
<li>新建 <code v-pre>.java</code> 文件，输入代码。</li>
<li>右上角点击“运行”按钮或右键选择“Run Java”即可运行。</li>
</ol>
<h2 id="_5-常见问题" tabindex="-1"><a class="header-anchor" href="#_5-常见问题"><span>5. 常见问题</span></a></h2>
<ul>
<li>如果提示找不到 JDK，请检查 JDK 是否安装并配置了环境变量。</li>
<li>电脑安装的JDK必须大于或等于Java17。</li>
<li>使用Zip安装java , 不要使用安装程序来安装(可能出现未知问题)。</li>
</ul>
<hr>
<p><strong>参考资料：</strong></p>
<ul>
<li><a href="https://code.visualstudio.com/docs/languages/java" target="_blank" rel="noopener noreferrer">VSCode 官方 Java 教程</a></li>
<li><a href="https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack" target="_blank" rel="noopener noreferrer">Java 扩展包文档</a></li>
</ul>
</div></template>


