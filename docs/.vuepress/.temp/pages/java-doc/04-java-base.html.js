import comp from "C:/Users/bobcb/Desktop/Dd/vuepress-starter/docs/.vuepress/.temp/pages/java-doc/04-java-base.html.vue"
const data = JSON.parse("{\"path\":\"/java-doc/04-java-base.html\",\"title\":\"\",\"lang\":\"zh-CN\",\"frontmatter\":{},\"headers\":[],\"git\":{},\"filePathRelative\":\"java-doc/04-java-base.md\"}")
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
