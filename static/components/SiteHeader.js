// Vue 3 Header Component
const SiteHeader = {
  template: `
    <header class="site-header">
      <div class="header-inner container">
        <a class="logo" href="/" aria-label="返回首页">牛马程序员</a>
        <div class="header-left">
          <nav class="center-nav desktop-nav" aria-label="主导航">
            <ul>
              <li><a href="/page/study.html">卷王指南</a></li>
              <li><a href="/page/dev.html">牛马法宝</a></li>
              <li><a href="/page/counselor.html">ICU防丢指南</a></li>
              <li><a href="/page/outsource.html">在线卖身</a></li>
              <li><a href="/page/e-commerce.html">破产电商</a></li>
              <li><a href="/page/media.html">赛博水军</a></li>
              <li><a href="/page/about.html">关于牛马</a></li>
              <li><a href="/page/blog.html">摸鱼日记</a></li>
            </ul>
          </nav>
          <details class="mobile-nav">
            <summary aria-label="打开导航菜单">
              <span></span>
              <span></span>
              <span></span>
            </summary>
            <nav class="center-nav mobile-nav-panel" aria-label="移动端主导航">
              <ul>
                <li><a href="/page/study.html">卷王指南</a></li>
                <li><a href="/page/dev.html">牛马法宝</a></li>
                <li><a href="/page/counselor.html">ICU防丢指南</a></li>
                <li><a href="/page/outsource.html">在线卖身</a></li>
                <li><a href="/page/e-commerce.html">破产电商</a></li>
                <li><a href="/page/media.html">赛博水军</a></li>
                <li><a href="/page/about.html">关于牛马</a></li>
                <li><a href="/page/blog.html">摸鱼日记</a></li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  `
};
