---
    layout: null
---

/**
 * 页面ready方法
 */
$(document).ready(function() {
    generateContent();
    renderComment();
});

/**
 * 侧边目录
 */
function generateContent() {
    var $mt = $('.toc');
    var toc = $(".post ul#markdown-toc").clone().get(0);
    $mt.each(function(i,o){
        $(o).html(toc);
    });
}

function renderComment() {
    var gittalk = new Gitalk({
        id: window.location.pathname,
        clientID: '{{site.comment.client_id}}',
        clientSecret: '{{site.comment.client_secret}}',
        owner: '{{site.github.username}}',
        repo: '{{site.comment.repo}}',
        admin: ['{{site.github.username}}'],
        perPage: 20,
        distractionFreeMode: false
    });
    gittalk.render('post-comment')
    $("#post-comment").removeClass('hidden');
}


