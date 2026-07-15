import { defineComponent, mountPage } from '/static/core.js';
import ArticleLayout from '/static/components/ArticleLayout.js';

const ContentPage = defineComponent({
    name: 'ContentPage',
    components: { ArticleLayout }
});

mountPage('#content-page', ContentPage);
