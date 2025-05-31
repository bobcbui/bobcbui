import comp from "C:/Users/bobcb/Desktop/Dd/vuepress-starter/docs/.vuepress/.temp/pages/get-started copy.html.vue"
const data = JSON.parse("{\"path\":\"/get-started%20copy.html\",\"title\":\"快速开始\",\"lang\":\"en-US\",\"frontmatter\":{},\"headers\":[{\"level\":2,\"title\":\"页面\",\"slug\":\"页面\",\"link\":\"#页面\",\"children\":[]},{\"level\":2,\"title\":\"内容\",\"slug\":\"内容\",\"link\":\"#内容\",\"children\":[]},{\"level\":2,\"title\":\"配置\",\"slug\":\"配置\",\"link\":\"#配置\",\"children\":[]},{\"level\":2,\"title\":\"布局与自定义\",\"slug\":\"布局与自定义\",\"link\":\"#布局与自定义\",\"children\":[]}],\"git\":{},\"filePathRelative\":\"get-started copy.md\"}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
