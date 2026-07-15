import { defineComponent } from '/static/core.js';

export default defineComponent({
    name: 'NavSearch',
    data() {
        return { query: '' };
    },
    mounted() {
        this.onShortcut = (event) => {
            if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                const tag = document.activeElement?.tagName;
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    event.preventDefault();
                    this.$refs.input?.focus();
                }
            }
            if (event.key === 'Escape' && document.activeElement === this.$refs.input) {
                this.clear();
                this.$refs.input?.blur();
            }
        };
        document.addEventListener('keydown', this.onShortcut);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onShortcut);
    },
    methods: {
        updateQuery() {
            window.dispatchEvent(new CustomEvent('navigation:query', { detail: this.query }));
        },
        clear() {
            this.query = '';
            this.updateQuery();
        },
        searchWeb() {
            const keyword = this.query.trim();
            if (keyword) window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank', 'noopener');
        }
    },
    template: `
        <form class="home-header-search" role="search" @submit.prevent="searchWeb">
            <label class="sr-only" for="site-navigation-search">筛选本站导航</label>
            <input ref="input" id="site-navigation-search" v-model="query" type="search" placeholder="筛选本站导航（按 / 聚焦）" autocomplete="off" @input="updateQuery">
            <button v-if="query" class="nav-search-clear" type="button" aria-label="清空搜索" @click="clear">×</button>
            <button type="submit" aria-label="使用百度搜索">⌕</button>
        </form>
    `
});
