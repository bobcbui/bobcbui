import { defineComponent, mountPage } from '/static/core.js';
import { loadNavigation } from '/static/data/navigation.js';
import AppShell from '/static/components/AppShell.js';
import NavGroup from '/static/components/NavGroup.js';

const heroOptions = [
    { title: '学 IT 改命，先改掉熬夜不写注释的命', desc: '一个专门收留打工人、半吊子站长和深夜技术幻想家的赛博据点' },
    { title: '只要需求提得够离谱，方案就会显得很有创造力', desc: '这里有学习笔记、摸鱼工具、项目急救和一些写着写着就破防的复盘' },
    { title: '不保证年薪百万，至少保证梗味纯正', desc: '从卷王指南到黑心云，把技术人的苦中作乐尽量写得像回事' }
];

const HomePage = defineComponent({
    components: { AppShell, NavGroup },
    data() {
        return {
            hero: heroOptions[Math.floor(Math.random() * heroOptions.length)],
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
        this.onQuery = (event) => { this.query = event.detail || ''; };
        window.addEventListener('navigation:query', this.onQuery);
        try {
            this.groups = (await loadNavigation()).filter((group) => !['在线卖身', '赛博水军', 'ICU 防丢指南'].includes(group.name));
        } catch (error) {
            this.errorMessage = error.message;
        } finally {
            this.isLoading = false;
        }
    },
    beforeUnmount() {
        window.removeEventListener('navigation:query', this.onQuery);
    },
    template: `
        <app-shell page-class="home-main">
            <section class="hero-section">
                <h1 class="hero-title">{{ hero.title }}</h1>
                <p class="hero-desc">{{ hero.desc }}</p>
            </section>
            <section class="nav-grid" aria-label="网站导航" aria-live="polite">
                <template v-if="isLoading">
                    <div v-for="item in 6" :key="item" class="nav-group nav-skeleton" aria-hidden="true"></div>
                </template>
                <nav-group v-for="group in filteredGroups" :key="group.name" :group="group" />
                <p v-if="!isLoading && !errorMessage && !filteredGroups.length" class="nav-empty">没有找到匹配的导航入口。</p>
                <p v-if="errorMessage" class="nav-error">导航数据加载失败，请刷新重试。{{ errorMessage }}</p>
            </section>
        </app-shell>
    `
});

mountPage('#home-app', HomePage);
