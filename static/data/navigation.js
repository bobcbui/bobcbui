let navigationPromise;

export function loadNavigation() {
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

export function getPrimaryNavigation(groups) {
    return groups
        .flatMap((group) => group.items)
        .filter((item) => item.href.startsWith('/page/'));
}
