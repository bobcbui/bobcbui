import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  lang: 'zh-CN', // 语言改为中文

  title: '牛马程序员', // 标题改为中文
  description: '为了帮助更多企业培养和便宜好用高效、实用的程序员，我们一直在不断努力培养出成千上万的牛马程序员。', // 描述改为中文

  theme: defaultTheme({
    logo: '/public/image/favicon.png', // 使用中文logo
    navbar: [{
      text: '首页',
      link: '/'
    }, {
      text: 'Java教程',
      link: '/java-doc/01-get-java-started.md'
    }, {
      text: '关于我',
      link: '/about.md'
    }],
    sidebar: {
      '/java-doc/': [
        {
          text: '认识Java从一个电脑软件开始', 
          link: '/java-doc/01-get-java-started.md'
        },
        {
          text: '开发工具与环境', 
          link: '/java-doc/02-get-env-dev.md'
        },
        {
          text: 'Java在VSCode中开发', 
          link: '/java-doc/03-dev-java-for-vscode.md'
        },
        {
          text: 'Java语言基础', 
          link: '/java-doc/04-java-base.md',
        },
        {
          text: '第三方包管理', 
          link: '/java-doc/05-lib-manage.md',
        },
        {
          text: 'SpringBoot入门', 
          link: '/java-doc/06-springboot-started.md',
        },
        {
          text: 'Java进阶', 
          link: '/java-doc/07-get-general.md',
        },
        {
          text: '如何快速熟悉一个库', 
          link: '/java-doc/08-fast-learn-lib.md'
        },
        {
          text: '开发技巧', 
          link: '/java-doc/09-java-dev-skill.md',
        }

      ],
    }, // 可以添加更多中文页面
  }),

  bundler: viteBundler(),

  // plugins 数组可以为空或添加其他插件
  plugins: [
    // 这里不再使用 carouselPlugin
  ],
})

