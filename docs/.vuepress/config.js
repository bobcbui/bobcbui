import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { shikiPlugin } from '@vuepress/plugin-shiki'

export default defineUserConfig({
  lang: 'zh-CN', // 语言改为中文

  title: '牛马程序员', // 标题改为中文
  description: '为了帮助更多企业培养和便宜好用高效、实用的程序员，我们一直在不断努力培养出成千上万的牛马程序员。', // 描述改为中文

  theme: defaultTheme({
    logo: '/images/favicon.png', // 使用中文logo
    navbar: [{
      text: '首页',
      link: '/'
    }, {
      text: 'Java',
      link: '/java-doc/01-get-java-started.md'
    }, {
      text: '关于我',
      link: '/about.md'
    }],
    sidebar: {
      '/java-doc/': [
        {
          text: '认识Java',
          link: '/java-doc/01-get-java-started.md'
        },
        {
          text: 'Java环境配置',
          link: '/java-doc/02-get-env-dev.md'
        },
        {
          text: '在VSCode中开发Java',
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
        },
        {
          text: 'Java JDK 版本介绍',
          link: '/java-doc/999-java-release.md'
        }

      ],
      '/python-doc/': [
        {
          text: 'Python入门14',
          link: '/python-doc/2.md'
        }
      ]
    }, // 可以添加更多中文页面

  }),

  bundler: viteBundler(),

  // plugins 数组可以为空或添加其他插件
  plugins: [
    shikiPlugin({
      // 配置项
      langs: ['ts', 'json', 'vue', 'md', 'bash', 'diff', 'java'],
    }),
  ],
})

