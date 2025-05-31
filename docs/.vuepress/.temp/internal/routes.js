export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/about.html", { loader: () => import(/* webpackChunkName: "about.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/about.html.js"), meta: {"title":"关于牛马程序员"} }],
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":""} }],
  ["/java-doc/01-get-java-started.html", { loader: () => import(/* webpackChunkName: "java-doc_01-get-java-started.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/01-get-java-started.html.js"), meta: {"title":"认识Java从一个普通的电脑软件开始"} }],
  ["/java-doc/02-get-env-dev.html", { loader: () => import(/* webpackChunkName: "java-doc_02-get-env-dev.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/02-get-env-dev.html.js"), meta: {"title":""} }],
  ["/java-doc/03-dev-java-for-vscode.html", { loader: () => import(/* webpackChunkName: "java-doc_03-dev-java-for-vscode.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/03-dev-java-for-vscode.html.js"), meta: {"title":"Java教程"} }],
  ["/java-doc/04-java-base.html", { loader: () => import(/* webpackChunkName: "java-doc_04-java-base.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/04-java-base.html.js"), meta: {"title":""} }],
  ["/java-doc/05-lib-manage.html", { loader: () => import(/* webpackChunkName: "java-doc_05-lib-manage.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/05-lib-manage.html.js"), meta: {"title":""} }],
  ["/java-doc/06-springboot-started.html", { loader: () => import(/* webpackChunkName: "java-doc_06-springboot-started.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/06-springboot-started.html.js"), meta: {"title":""} }],
  ["/java-doc/07-get-general.html", { loader: () => import(/* webpackChunkName: "java-doc_07-get-general.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/07-get-general.html.js"), meta: {"title":""} }],
  ["/java-doc/08-fast-learn-lib.html", { loader: () => import(/* webpackChunkName: "java-doc_08-fast-learn-lib.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/08-fast-learn-lib.html.js"), meta: {"title":""} }],
  ["/java-doc/09-java-dev-skill.html", { loader: () => import(/* webpackChunkName: "java-doc_09-java-dev-skill.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/java-doc/09-java-dev-skill.html.js"), meta: {"title":""} }],
  ["/python-doc/1.html", { loader: () => import(/* webpackChunkName: "python-doc_1.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/python-doc/1.html.js"), meta: {"title":"关于牛马程序员"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"D:/AProject/bobcbui/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
]);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateRoutes) {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
  }
  if (__VUE_HMR_RUNTIME__.updateRedirects) {
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ routes, redirects }) => {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  })
}
