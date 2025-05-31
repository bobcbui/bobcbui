export const themeData = JSON.parse("{\"logo\":\"/image/favicon.png\",\"navbar\":[{\"text\":\"首页\",\"link\":\"/\"},{\"text\":\"Java教程\",\"link\":\"/java-doc/01-get-java-started.md\"},{\"text\":\"关于我\",\"link\":\"/about.md\"}],\"sidebar\":{\"/java-doc/\":[{\"text\":\"认识Java从一个电脑软件开始\",\"link\":\"/java-doc/01-get-java-started.md\"},{\"text\":\"开发工具与环境\",\"link\":\"/java-doc/02-get-env-dev.md\"},{\"text\":\"Java在VSCode中开发\",\"link\":\"/java-doc/03-dev-java-for-vscode.md\"},{\"text\":\"Java语言基础\",\"link\":\"/java-doc/04-java-base.md\"},{\"text\":\"第三方包管理\",\"link\":\"/java-doc/05-lib-manage.md\"},{\"text\":\"SpringBoot入门\",\"link\":\"/java-doc/06-springboot-started.md\"},{\"text\":\"Java进阶\",\"link\":\"/java-doc/07-get-general.md\"},{\"text\":\"如何快速熟悉一个库\",\"link\":\"/java-doc/08-fast-learn-lib.md\"},{\"text\":\"开发技巧\",\"link\":\"/java-doc/09-java-dev-skill.md\"}]},\"locales\":{\"/\":{\"selectLanguageName\":\"English\"}},\"colorMode\":\"auto\",\"colorModeSwitch\":true,\"repo\":null,\"selectLanguageText\":\"Languages\",\"selectLanguageAriaLabel\":\"Select language\",\"sidebarDepth\":2,\"editLink\":true,\"editLinkText\":\"Edit this page\",\"lastUpdated\":true,\"contributors\":true,\"contributorsText\":\"Contributors\",\"notFound\":[\"There's nothing here.\",\"How did we get here?\",\"That's a Four-Oh-Four.\",\"Looks like we've got some broken links.\"],\"backToHome\":\"Take me home\",\"openInNewWindow\":\"open in new window\",\"toggleColorMode\":\"toggle color mode\",\"toggleSidebar\":\"toggle sidebar\"}")

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateThemeData) {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ themeData }) => {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  })
}
