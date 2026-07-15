import { defineComponent } from '/static/core.js';

export default defineComponent({
    name: 'AppShell',
    props: { pageClass: { type: String, default: '' } },
    template: '<main :class="pageClass"><slot></slot></main>'
});
