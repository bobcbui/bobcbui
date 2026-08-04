import { defineComponent, mountPage } from '/static/core.js';
import { loadNavigation } from '/static/data/navigation.js';
import NavGroup from '/static/components/NavGroup.js';

const HomePage = defineComponent({
    name: 'HomePage',
    components: { NavGroup },
    data() {
        return {
            groups: [],
            query: '',
            isLoading: true,
            errorMessage: ''
        };
    },
    computed: {
        filteredGroups() {
            const keyword = this.query.trim().toLocaleLowerCase();
            if (!keyword) return this.groups;

            return this.groups.map((group) => {
                const matchesGroup = `${group.name} ${group.desc}`.toLocaleLowerCase().includes(keyword);
                const items = group.items.filter((item) => item.title.toLocaleLowerCase().includes(keyword));
                return matchesGroup ? group : { ...group, items };
            }).filter((group) => group.items.length);
        }
    },
    async mounted() {
        this.onShortcut = (event) => {
            if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                const tag = document.activeElement?.tagName;
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    event.preventDefault();
                    document.querySelector('#site-search')?.focus();
                }
            }
        };
        document.addEventListener('keydown', this.onShortcut);
        try {
            this.groups = (await loadNavigation()).filter((group) => !['在线卖身', '赛博水军', 'ICU 防丢指南'].includes(group.name));
        } catch (error) {
            this.errorMessage = error.message;
        } finally {
            this.isLoading = false;
        }
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onShortcut);
    },
    methods: {
        searchWeb() {
            const keyword = this.query.trim();
            if (keyword) window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank', 'noopener');
        }
    },
    template: `
        <main class="home-main">
            <div class="home-layout">
                <aside class="side-rail" aria-label="网站目录">
                    <div class="side-rail-inner">
                        <div v-for="group in groups" :key="group.name" class="side-group">
                            <h2><span aria-hidden="true">{{ group.emoji }}</span>{{ group.name }}</h2>
                            <a v-for="(item, index) in group.items" :key="item.title + index" :href="item.href">{{ item.title }}</a>
                        </div>
                    </div>
                </aside>

                <section class="home-content">
                    <section class="hero-section">
                        <div class="hero-copy">
                            <h1 class="hero-title">欢迎来到<span>牛马程序员</span> 👋</h1>
                            <p class="hero-desc">一个收留打工人、半吊子站长和深夜技术幻想家的赛博据点。今天也要带着 Bug<br class="desktop-break"> 优雅上班。</p>
                        </div>
                        <div class="hero-badge">⚡ 本站已稳定运行</div>
                    </section>

                    <form class="content-search" role="search" @submit.prevent="searchWeb">
                        <span class="search-icon" aria-hidden="true">⌕</span>
                        <label class="sr-only" for="site-search">筛选本站导航</label>
                        <input id="site-search" v-model="query" type="search" placeholder="筛选本站导航（按 / 聚焦）" autocomplete="off">
                        <button type="submit">百度搜索</button>
                    </form>

                    <section class="stats-grid" aria-label="站点统计">
                        <article class="stat-card"><span class="stat-icon">🔧</span><div><strong>20</strong><small>导航入口</small></div></article>
                        <article class="stat-card"><span class="stat-icon">▤</span><div><strong>5</strong><small>实用工具</small></div></article>
                        <article class="stat-card"><span class="stat-icon">🎮</span><div><strong>3</strong><small>摸鱼游戏</small></div></article>
                        <article class="stat-card"><span class="stat-icon">▯</span><div><strong>8</strong><small>内容文章</small></div></article>
                    </section>

                    <section class="nav-grid" aria-label="网站导航" aria-live="polite">
                        <template v-if="isLoading">
                            <div v-for="item in 6" :key="item" class="nav-group nav-skeleton" aria-hidden="true"></div>
                        </template>
                        <nav-group v-for="group in filteredGroups" :key="group.name" :group="group" />
                        <p v-if="!isLoading && !errorMessage && !filteredGroups.length" class="nav-empty">没有找到匹配的导航入口。</p>
                        <p v-if="errorMessage" class="nav-error">导航数据加载失败，请刷新重试。{{ errorMessage }}</p>
                    </section>
                </section>
            </div>
        </main>
    `
});

mountPage('#home-app', HomePage);
