import comp from "C:/Users/bobcb/Desktop/Dd/vuepress-starter/docs/.vuepress/.temp/pages/image/about.html.vue"
const data = JSON.parse("{\"path\":\"/image/about.html\",\"title\":\"关于牛马程序员\",\"lang\":\"zh-CN\",\"frontmatter\":{},\"headers\":[{\"level\":2,\"title\":\"我们的使命\",\"slug\":\"我们的使命\",\"link\":\"#我们的使命\",\"children\":[]},{\"level\":2,\"title\":\"我们的价值观\",\"slug\":\"我们的价值观\",\"link\":\"#我们的价值观\",\"children\":[]},{\"level\":2,\"title\":\"联系我们\",\"slug\":\"联系我们\",\"link\":\"#联系我们\",\"children\":[]}],\"git\":{},\"filePathRelative\":\"image/about.md\"}")
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
