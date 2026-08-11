(() => {
  const categoryOrder = ["Java", "Python", "TypeScript", "AI", "其他"];
  const topicLabels = {
    llm: "LLM",
    pytorch: "PyTorch",
    evaluation: "模型评测",
    deployment: "模型部署"
  };

  function getText(node, selector) {
    return node.querySelector(selector)?.textContent.trim() || "";
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function sortCategories(categories) {
    return [...categories].sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      const safeA = aIndex === -1 ? categoryOrder.length : aIndex;
      const safeB = bIndex === -1 ? categoryOrder.length : bIndex;
      return safeA - safeB || a.localeCompare(b, "zh-CN");
    });
  }

  function parseBlogMap(xmlText) {
    const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
    if (documentNode.querySelector("parsererror")) {
      throw new Error("博客地图 XML 格式错误");
    }

    return Array.from(documentNode.querySelectorAll("blogMap > article"))
      .map((article) => ({
        title: getText(article, "title"),
        url: getText(article, "url"),
        date: getText(article, "date"),
        year: getText(article, "year"),
        category: getText(article, "category") || "其他",
        topic: getText(article, "topic"),
        summary: getText(article, "summary")
      }))
      .filter((article) => article.title && article.url)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function buildArticleLink(article) {
    const link = createElement("a", "blog-directory-item");
    link.href = article.url;

    const main = createElement("span", "blog-directory-item-main");
    const meta = createElement("span", "blog-directory-item-meta");
    const time = createElement("time", "", article.date);
    time.dateTime = article.date;
    meta.append(time);

    if (article.topic) {
      meta.append(createElement("span", "blog-directory-topic", topicLabels[article.topic] || article.topic));
    }

    main.append(meta, createElement("strong", "", article.title));
    if (article.summary) {
      main.append(createElement("small", "", article.summary));
    }

    const arrow = createElement("span", "blog-directory-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    link.append(main, arrow);
    return link;
  }

  function initBlogMap(root) {
    const source = root.dataset.source || "/blog-map.xml";
    const status = root.querySelector("[data-blog-status]");
    const controls = root.querySelector("[data-blog-controls]");
    const filters = root.querySelector("[data-blog-filters]");
    const search = root.querySelector("[data-blog-search]");
    const results = root.querySelector("[data-blog-results]");
    if (!status || !controls || !filters || !search || !results) {
      console.warn("博客地图组件缺少必要的 DOM 节点。", root);
      return;
    }

    let articles = [];
    let activeCategory = "全部";
    let query = "";

    function renderFilters() {
      const counts = articles.reduce((result, article) => {
        result.set(article.category, (result.get(article.category) || 0) + 1);
        return result;
      }, new Map());
      const categories = ["全部", ...sortCategories(counts.keys())];

      filters.replaceChildren(...categories.map((category) => {
        const count = category === "全部" ? articles.length : counts.get(category);
        const button = createElement("button", "blog-directory-filter", `${category} ${count}`);
        button.type = "button";
        button.dataset.category = category;
        button.setAttribute("aria-pressed", String(category === activeCategory));
        button.addEventListener("click", () => {
          activeCategory = category;
          filters.querySelectorAll("button").forEach((item) => {
            item.setAttribute("aria-pressed", String(item.dataset.category === activeCategory));
          });
          renderResults();
        });
        return button;
      }));
    }

    function renderResults() {
      const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
      const visibleArticles = articles.filter((article) => {
        const matchesCategory = activeCategory === "全部" || article.category === activeCategory;
        const searchText = `${article.title} ${article.summary} ${article.category} ${article.topic}`.toLocaleLowerCase("zh-CN");
        return matchesCategory && (!normalizedQuery || searchText.includes(normalizedQuery));
      });

      if (!visibleArticles.length) {
        const empty = createElement("p", "blog-directory-empty", "没有找到匹配的文章，请尝试其他关键词或分类。");
        results.replaceChildren(empty);
        status.textContent = `共 ${articles.length} 篇，当前没有匹配结果`;
        return;
      }

      const grouped = visibleArticles.reduce((result, article) => {
        if (!result.has(article.category)) result.set(article.category, []);
        result.get(article.category).push(article);
        return result;
      }, new Map());

      const groups = sortCategories(grouped.keys()).map((category) => {
        const groupArticles = grouped.get(category);
        const section = createElement("section", "blog-directory-group");
        const heading = createElement("div", "blog-directory-group-heading");
        heading.append(
          createElement("h3", "", category),
          createElement("span", "", `${groupArticles.length} 篇`)
        );
        const list = createElement("div", "blog-directory-list");
        list.append(...groupArticles.map(buildArticleLink));
        section.append(heading, list);
        return section;
      });

      results.replaceChildren(...groups);
      status.textContent = normalizedQuery || activeCategory !== "全部"
        ? `共 ${articles.length} 篇，当前显示 ${visibleArticles.length} 篇`
        : `共收录 ${articles.length} 篇文章`;
    }

    fetch(source, { headers: { Accept: "application/xml" } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((xmlText) => {
        articles = parseBlogMap(xmlText);
        if (!articles.length) throw new Error("博客地图中没有文章");
        renderFilters();
        renderResults();
        controls.hidden = false;
      })
      .catch((error) => {
        console.warn("博客地图加载失败：", error);
        status.textContent = "博客地图暂时无法加载，请刷新页面重试。";
        results.replaceChildren(createElement("p", "blog-directory-error", "读取博客地图失败。你仍可以通过站点导航访问其他内容。"));
      });

    search.addEventListener("input", (event) => {
      query = event.target.value;
      renderResults();
    });
  }

  document.querySelectorAll("[data-blog-map]").forEach(initBlogMap);
})();
