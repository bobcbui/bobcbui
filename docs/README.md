<div style="padding:40px;text-align:center;border: 1px solid #ccccccff;border-radius: 8px;margin-top:20px;">
  <h2>{{ data.title }}</h2>
  <p>{{ data.desc }}</p>
</div>

<div class="vp-features" style="margin:0;border: 0">
  <a class="vp-feature" href="/page/study.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">📖 学习编程</h3>
    <p class="vp-feature-description">为了给社会输出高性价比技术人员, 我们在持续努力着。</p>
  </a>
  <a class="vp-feature" href="/page/dev.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">💻 软件开发</h3>
    <p class="vp-feature-description">5万牛马程序员为你的软件提供强大的技术支撑。</p>
  </a>
  <a class="vp-feature" href="/page/counselor.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">☁️ 云服务器</h3>
    <p class="vp-feature-description">跑路云成立10年还没有跑路的云服务器。</p>
  </a>
  <a class="vp-feature" href="/page/e-commerce.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">🛠️ 电商运营</h3>
    <p class="vp-feature-description">运营店铺累计仅亏损19万元。</p>
  </a>
  <a class="vp-feature" href="/page/media.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">📢 媒体运营</h3>
    <p class="vp-feature-description">牛马程序员为您提供人工智能运营服务。</p>
  </a>
  <a class="vp-feature" href="/page/outsource.html" style="text-decoration:none;color:inherit;">
    <h3 class="vp-feature-title">🤝 技术外包</h3>
    <p class="vp-feature-description">承接各类技术外包项目，30元~30万元项目完全就找牛马程序员。</p>
  </a>
</div>

<script setup>

import { onMounted, ref } from 'vue'

const array = [
  {"title": "牛马程序员带你成为真正的牛马", "desc": "低薪程序员培训基地，为社会输出更多高性价比的程序员。"},
  {"title": "学IT年薪过万就上牛马程序员", "desc": "目前已经培养了两个年薪过万的牛马程序员。"}
]

const data = ref({title: '', desc: ''})

onMounted(() => {
  const index = Math.floor(Math.random() * array.length)
  data.value = array[index]
})

</script>

