import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { shikiPlugin } from '@vuepress/plugin-shiki'
import fs from 'fs'
import path from 'path'

// 辅助函数：自动获取文件夹下的所有 md 文件并排序
const getSidebar = (folder) => {
  const folderPath = path.resolve(__dirname, '../', folder); // 这里的 ../ 指向你的 docs 根目录
  if (!fs.existsSync(folderPath)) return [];

  return fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith('.md') && file.toLowerCase() !== 'readme.md')
    .sort((a, b) => {
      // 按照文件名开头的数字排序（例如 01-, 02-）
      const n1 = parseInt(a.split('-')[0]);
      const n2 = parseInt(b.split('-')[0]);
      return n1 - n2;
    })
    .map((file) => `/${folder}/${file}`);
}

export default defineUserConfig({
  lang: 'zh-CN', // 语言改为中文

  title: '牛马程序员', // 标题改为中文
  description: '为了帮助更多企业培养和便宜好用高效、实用的程序员，我们一直在不断努力培养出成千上万的牛马程序员。', // 描述改为中文

  theme: defaultTheme({
    logo: '/favicon.ico',
    lastUpdated: false,
    contributors: false,
    navbar: [{
      text: '首页',
      link: '/'
    },
    {
      text: '学习编程',
      link: '/page/study.md'
    },
    {
      text: '软件开发',
      link: '/page/dev.md'
    },
    {
      text: '媒体运营',
      link: '/page/media.md'
    },
    {
      text: '其他服务',
      children: [
        {
          text: '电商运营',
          link: '/page/e-commerce.md'
        },
        {
          text: '云服务器',
          link: '/page/counselor.md'
        },
        {
          text: '技术外包',
          link: '/page/outsource.md'
        }
      ]
    },
    {
      text: '关于我',
      link: '/about.md'
    }
    ],
    sidebar: {
      '/java-doc/': getSidebar('java-doc'),
      '/blog/': getSidebar('log-blog'),
      '/log-python/': getSidebar('log-python'),
      '/log-aicode/': getSidebar('log-aicode'),
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

