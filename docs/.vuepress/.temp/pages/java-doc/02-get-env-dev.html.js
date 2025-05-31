import comp from "C:/Users/bobcb/Desktop/Dd/vuepress-starter/docs/.vuepress/.temp/pages/java-doc/02-get-env-dev.html.vue"
const data = JSON.parse("{\"path\":\"/java-doc/02-get-env-dev.html\",\"title\":\"\",\"lang\":\"zh-CN\",\"frontmatter\":{},\"headers\":[],\"git\":{},\"filePathRelative\":\"java-doc/02-get-env-dev.md\"}")
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
