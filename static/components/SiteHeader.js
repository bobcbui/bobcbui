(() => {
  const siteHeaderMarkup = `
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
  `.trim();

  function createSiteHeader() {
    const template = document.createElement('template');
    template.innerHTML = siteHeaderMarkup;
    return template.content.firstElementChild;
  }

  function replaceSiteHeader(mountPoint) {
    if (!(mountPoint instanceof HTMLElement)) {
      return;
    }

    mountPoint.replaceWith(createSiteHeader());
  }

  function renderSiteHeaders() {
    document.querySelectorAll('site-header').forEach((mountPoint) => {
      replaceSiteHeader(mountPoint);
    });
  }

  if ('customElements' in window && !window.customElements.get('site-header')) {
    class SiteHeaderElement extends HTMLElement {
      connectedCallback() {
        replaceSiteHeader(this);
      }
    }

    window.customElements.define('site-header', SiteHeaderElement);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSiteHeaders, { once: true });
  } else {
    renderSiteHeaders();
  }
})();
