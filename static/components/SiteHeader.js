import { defineComponent, mountComponent } from '/static/core.js';
import { getPrimaryNavigation, loadNavigation } from '/static/data/navigation.js';
import NavSearch from '/static/components/NavSearch.js';

const SiteHeader = defineComponent({
    name: 'SiteHeader',
    components: { NavSearch },
    data() {
        return {
            navItems: [],
            menuOpen: false,
            isHome: document.body.classList.contains('home-page')
        };
    },
    async mounted() {
        try {
            this.navItems = getPrimaryNavigation(await loadNavigation());
        } catch (error) {
            console.warn('页头导航加载失败：', error);
        }
    },
    watch: {
        menuOpen(isOpen) {
            document.body.classList.toggle('menu-open', isOpen);
        }
    },
    beforeUnmount() {
        document.body.classList.remove('menu-open');
    },
    methods: {
        isCurrent(href) {
            const currentPath = window.location.pathname.replace(/index\.html$/, '');
            return href === currentPath || (href === '/' && currentPath === '/');
        },
        closeMenu() { this.menuOpen = false; }
    },
    template: `
        <div class="header-inner">
            <a class="logo" href="/" aria-label="返回首页">牛马程序员</a>
            <nav-search v-if="isHome" />
            <div class="header-left">
                <nav class="center-nav desktop-nav" aria-label="主导航">
                    <ul>
                        <li v-for="item in navItems" :key="item.href">
                            <a :href="item.href" :aria-current="isCurrent(item.href) ? 'page' : null">{{ item.title }}</a>
                        </li>
                    </ul>
                </nav>
            </div>
            <details v-if="!isHome" class="mobile-nav" :open="menuOpen">
                <summary aria-label="打开导航菜单" @click.prevent="menuOpen = !menuOpen">
                    <span class="mobile-nav-icon" aria-hidden="true"><span></span><span></span><span></span></span>
                </summary>
                <nav class="center-nav mobile-nav-panel" aria-label="移动端主导航">
                    <ul>
                        <li v-for="item in navItems" :key="item.href">
                            <a :href="item.href" :aria-current="isCurrent(item.href) ? 'page' : null" @click="closeMenu">{{ item.title }}</a>
                        </li>
                    </ul>
                </nav>
            </details>
        </div>
    `
});

mountComponent('site-header', SiteHeader);
