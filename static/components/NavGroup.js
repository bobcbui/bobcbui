import { defineComponent } from '/static/core.js';

export default defineComponent({
    name: 'NavGroup',
    props: {
        group: { type: Object, required: true },
        maxItems: { type: Number, default: 6 }
    },
    data() {
        return { expanded: false };
    },
    computed: {
        visibleItems() {
            return this.expanded ? this.group.items : this.group.items.slice(0, this.maxItems);
        },
        hasMore() { return this.group.items.length > this.maxItems; }
    },
    template: `
        <article class="nav-group">
            <div class="nav-group-header">
                <span class="nav-group-emoji" aria-hidden="true">{{ group.emoji }}</span>
                <h2 class="nav-group-title">{{ group.name }}</h2>
                <p v-if="group.desc" class="nav-group-desc">{{ group.desc }}</p>
            </div>
            <div class="nav-group-links">
                <a v-for="item in visibleItems" :key="item.href" :href="item.href">{{ item.title }}</a>
            </div>
            <button v-if="hasMore" class="nav-group-toggle" type="button" @click="expanded = !expanded">
                {{ expanded ? '收起入口' : '展开全部入口' }}
            </button>
        </article>
    `
});
