import comp from "D:/AProject/bobcbui/docs/.vuepress/.temp/pages/index.html.vue"
const data = JSON.parse("{\"path\":\"/\",\"title\":\"\",\"lang\":\"zh-CN\",\"frontmatter\":{},\"headers\":[],\"git\":{\"updatedTime\":1748672565000,\"contributors\":[{\"name\":\"Bobcbui\",\"username\":\"Bobcbui\",\"email\":\"bobcbui@outlook.com\",\"commits\":1,\"url\":\"https://github.com/Bobcbui\"}],\"changelog\":[{\"hash\":\"3869c2c75ee0a79e5e893637260f6a648b937378\",\"time\":1748672565000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"啊啊啊\"}]},\"filePathRelative\":\"README.md\"}")
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
