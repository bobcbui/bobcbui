import comp from "D:/AProject/bobcbui/docs/.vuepress/.temp/pages/index.html.vue"
const data = JSON.parse("{\"path\":\"/\",\"title\":\"\",\"lang\":\"zh-CN\",\"frontmatter\":{},\"headers\":[],\"git\":{\"updatedTime\":1748680007000,\"contributors\":[{\"name\":\"Bobcbui\",\"username\":\"Bobcbui\",\"email\":\"bobcbui@outlook.com\",\"commits\":5,\"url\":\"https://github.com/Bobcbui\"}],\"changelog\":[{\"hash\":\"fff1ceb795f2ac1d7c974e33d7dbbecd92bdbca1\",\"time\":1748680007000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"111\"},{\"hash\":\"4e681ee3d97a89bb669462ac582380eea490d470\",\"time\":1748679400000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"11\"},{\"hash\":\"d44bc8be1adcfb3ba6a93a1ca0199a2a1ed44ea0\",\"time\":1748678264000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"111\"},{\"hash\":\"760892a464db94ab8a9655d47fd23cc02cdccf54\",\"time\":1748677859000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"111\"},{\"hash\":\"3869c2c75ee0a79e5e893637260f6a648b937378\",\"time\":1748672565000,\"email\":\"bobcbui@outlook.com\",\"author\":\"Bobcbui\",\"message\":\"啊啊啊\"}]},\"filePathRelative\":\"README.md\"}")
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
