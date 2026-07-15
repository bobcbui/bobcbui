import { createApp, defineComponent } from 'vue';

export { createApp, defineComponent };

export function mountComponent(selector, component) {
    const mount = () => {
        document.querySelectorAll(selector).forEach((element) => {
            if (element.dataset.vueMounted) return;

            createApp(component).mount(element);
            element.dataset.vueMounted = 'true';
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
        return;
    }

    mount();
}

export function mountPage(selector, options) {
    const element = document.querySelector(selector);
    if (!element || element.dataset.vueMounted) return null;

    const app = createApp(options);
    app.config.errorHandler = (error) => {
        console.error('页面组件加载失败：', error);
    };
    app.mount(element);
    element.dataset.vueMounted = 'true';
    return app;
}
