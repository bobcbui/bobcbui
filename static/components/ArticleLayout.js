import { defineComponent } from '/static/core.js';

export default defineComponent({
    name: 'ArticleLayout',
    template: `
        <article class="article-layout">
            <slot></slot>
            <footer class="article-footer">
                <span>牛马程序员</span>
                <a class="article-back" href="/">返回首页</a>
            </footer>
        </article>
    `
});
