(() => {
  let navigationPromise;

  const siteHeaderTemplate = `
        <div class="header-inner">
            <a class="logo" href="/" aria-label="返回首页">牛马程序员</a>
            <div class="header-left">
                <nav class="center-nav desktop-nav" aria-label="主导航">
                    <ul>
                        <template x-for="item in navItems" :key="item.href">
                            <li><a :href="item.href" :aria-current="isCurrent(item.href) ? 'page' : null" x-text="item.title"></a></li>
                        </template>
                    </ul>
                </nav>
            </div>
            <div class="header-status"><span aria-hidden="true"></span>持续学习</div>
            <details class="mobile-nav" :open="menuOpen">
                <summary aria-label="打开导航菜单" @click.prevent="menuOpen = !menuOpen">
                    <span class="mobile-nav-icon" aria-hidden="true"><span></span><span></span><span></span></span>
                </summary>
                <nav class="center-nav mobile-nav-panel" aria-label="移动端主导航">
                    <ul>
                        <template x-for="item in navItems" :key="item.href">
                            <li><a :href="item.href" :aria-current="isCurrent(item.href) ? 'page' : null" @click="closeMenu" x-text="item.title"></a></li>
                        </template>
                    </ul>
                </nav>
            </details>
        </div>`;

  function loadNavigation() {
    if (navigationPromise) return navigationPromise;

    navigationPromise = fetch('/nav.xml').then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const documentNode = new DOMParser().parseFromString(await response.text(), 'text/xml');
      const parserError = documentNode.querySelector('parsererror');
      if (parserError) throw new Error('导航数据格式错误');

      return Array.from(documentNode.querySelectorAll('group')).map((group) => ({
        name: group.getAttribute('name') || '未分类',
        emoji: group.getAttribute('emoji') || '🔗',
        desc: group.getAttribute('desc') || '',
        items: Array.from(group.querySelectorAll('item')).map((item) => ({
          href: item.getAttribute('href') || '#',
          title: item.textContent.trim()
        }))
      }));
    }).catch((error) => {
      navigationPromise = undefined;
      throw error;
    });

    return navigationPromise;
  }

  async function loadGitHubTrends() {
    const today = new Date();
    const since = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startDate = since.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);
    const query = encodeURIComponent(`created:${startDate}..${endDate}`);
    const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=5`, {
      headers: { Accept: 'application/vnd.github+json' }
    });

    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);

    const data = await response.json();
    return (data.items || []).map((repo) => ({
      name: repo.full_name,
      url: repo.html_url,
      description: repo.description || '暂无项目简介',
      language: repo.language || '多语言',
      stars: repo.stargazers_count || 0
    }));
  }

  document.querySelectorAll('site-header').forEach((element) => {
    element.innerHTML = siteHeaderTemplate;
  });

  document.addEventListener('alpine:init', () => {
    Alpine.data('siteHeader', () => ({
      navItems: [],
      menuOpen: false,
      init() {
        this.$watch('menuOpen', (isOpen) => {
          document.body.classList.toggle('menu-open', isOpen);
        });

        loadNavigation().then((groups) => {
          this.navItems = groups.map((group) => ({
            title: group.name,
            href: group.items[0]?.href || '#'
          }));
        }).catch((error) => {
          console.warn('页头导航加载失败：', error);
        });
      },

      isCurrent(href) {
        const currentPath = window.location.pathname;
        return href === currentPath || (href === '/' && currentPath === '/');
      },

      closeMenu() {
        this.menuOpen = false;
      }
    }));

    Alpine.data('homePage', () => ({
      groups: [],
      query: '',
      isLoading: true,
      errorMessage: '',
      trendingRepos: [],
      trendsLoading: true,
      trendsError: '',
      dailyEnglish: {
        date: new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date()),
        title: 'Small Steps, Real Progress',
        text: 'Small steps build reliable systems. Read one page, write one example, and review one mistake today. Progress becomes easier to notice when the action is small enough to repeat.',
        translation: '小步前进，才能建立可靠的系统。今天读一页资料、写一个例子，再复盘一个错误。当行动小到可以重复，进步就更容易被看见。',
        words: [
          { term: 'reliable', meaning: '可靠的' },
          { term: 'review', meaning: '复盘；回顾' },
          { term: 'repeat', meaning: '重复' }
        ]
      },

      get filteredGroups() {
        const keyword = this.query.trim().toLocaleLowerCase();
        if (!keyword) return this.groups;

        return this.groups.map((group) => {
          const matchesGroup = `${group.name} ${group.desc}`.toLocaleLowerCase().includes(keyword);
          const items = group.items.filter((item) => item.title.toLocaleLowerCase().includes(keyword));
          return matchesGroup ? group : { ...group, items };
        }).filter((group) => group.items.length);
      },

      async init() {
        this.loadTrends();
        try {
          this.groups = (await loadNavigation()).filter((group) => !['在线卖身', '赛博水军', 'ICU 防丢指南'].includes(group.name));
        } catch (error) {
          this.errorMessage = error.message;
        } finally {
          this.isLoading = false;
        }
      },

      async loadTrends() {
        try {
          this.trendingRepos = await loadGitHubTrends();
        } catch (error) {
          this.trendsError = 'GitHub 趋势暂时无法加载';
          console.warn('GitHub 趋势加载失败：', error);
        } finally {
          this.trendsLoading = false;
        }
      },

      formatStars(value) {
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
      },

      focusShortcut(event) {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          event.preventDefault();
          document.querySelector('#site-search')?.focus();
        }
      },

      searchWeb() {
        const keyword = this.query.trim();
        if (keyword) window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank', 'noopener');
      }
    }));

    Alpine.data('navGroup', (group) => ({
      group,
      expanded: false,
      maxItems: 6,

      get visibleItems() {
        return this.expanded ? this.group.items : this.group.items.slice(0, this.maxItems);
      },

      get hasMore() {
        return this.group.items.length > this.maxItems;
      }
    }));
  });
})();
