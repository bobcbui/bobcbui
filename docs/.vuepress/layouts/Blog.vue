<script setup>
defineOptions({ name: 'Blog' })
import { useBlogType } from '@vuepress/plugin-blog/client'

const blog = useBlogType('default')
</script>

<template>
  <div>
    <h1>最新文章</h1>

    <article v-for="page in blog.pages" :key="page.key">
      <h2>
        <RouterLink :to="page.path">
          {{ page.title }}
        </RouterLink>
      </h2>
      <p>{{ page.frontmatter.date }}</p>
    </article>

    <div style="margin-top: 24px">
      <RouterLink
        v-if="blog.pagination.hasPrev"
        :to="blog.pagination.prevLink"
      >
        上一页
      </RouterLink>

      <RouterLink
        v-if="blog.pagination.hasNext"
        :to="blog.pagination.nextLink"
        style="margin-left: 16px"
      >
        下一页
      </RouterLink>
    </div>
  </div>
</template>
