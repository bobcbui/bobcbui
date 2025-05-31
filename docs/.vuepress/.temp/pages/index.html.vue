<template><div><br>
<ClientOnly>
    <Swiper
      :modules="[Navigation, Pagination]"
      :navigation="true"
      :pagination="{ clickable: true }"
      style="width:100%;max-width:900px;margin:0 auto 32px;border-radius:12px;overflow:hidden;"
    >
      <SwiperSlide>
        <img src="/images/1.png" alt="banner1" style="width:100%;" data-zoom="false" />
      </SwiperSlide>
      <SwiperSlide>
        <img src="/images/2.png" alt="banner2" style="width:100%;" data-zoom="false" />
      </SwiperSlide>
    </Swiper>
  </ClientOnly>
  <div class="vp-features">
    <a class="vp-feature" href="/get-started.html" style="text-decoration:none;color:inherit;">
      <h3 class="vp-feature-title">📖 学习编程</h3>
      <p class="vp-feature-description">为了给社会输出高性价比技术人员, 我们在持续努力着。</p>
    </a>
    <div class="vp-feature">
      <h3 class="vp-feature-title">💻 软件开发</h3>
      <p class="vp-feature-description">5万牛马程序员为你的软件提供强大的技术支撑。</p>
    </div>
    <div class="vp-feature">
      <h3 class="vp-feature-title">☁️ 云服务器</h3>
      <p class="vp-feature-description">跑路云成立10年还没有跑路的云服务器。</p>
    </div>
    <div class="vp-feature">
      <h3 class="vp-feature-title">🛠️ 技术支持</h3>
      <p class="vp-feature-description">提供专业的技术解答与服务，助力开发者高效成长。</p>
    </div>
    <div class="vp-feature">
      <h3 class="vp-feature-title">📢 媒体运营</h3>
      <p class="vp-feature-description">牛马程序员为您提供人工智能运营服务。</p>
    </div>
    <div class="vp-feature">
      <h3 class="vp-feature-title">🤝 技术外包</h3>
      <p class="vp-feature-description">承接各类技术外包项目，30元~30万元项目完全就找牛马程序员。</p>
    </div>
  </div>
<p>这是首页内容。更多详情请查阅<a href="https://vuejs.press/reference/default-theme/frontmatter.html#home-page" target="_blank" rel="noopener noreferrer">首页文档</a>。</p>
</div></template>


<script setup>
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination } from 'swiper/modules'
</script>