---
layout: post
title: 不用Build构建工具如何优雅使用Vue.js
tags: 前端 Vue NbTemplate 
categories: 前端
---

作为一名大多数时间花在后端的程序员对现在的前后端分离的架构表示不是很喜欢，因为项目特别小，有时候就几个页面，一个单机项目，这时候使用build工具项目的部署，开发都非常的繁琐，因为前后端都是自己干的，于是自己设计了一套适合后端程序员的前端模板，我们以Java为例，只需要把几个页面放在static目录中就可以进行前端开发了，写代码的方式也依然保持用构建工具开发的思路就可以了。

用这个模板开发前端需要用到的工具：
VScode 插件 es6-string-html 帮助字符串中的html,css 高亮.

如果你想直接看代码可以下拉Git仓库，这是我创建的模板,我给它取名NbTemplate,这里的`“NB”`不是	`“牛逼”`模板的意思而是No Build Template 的意思.

项目地址：[Github项目地址](https://github.com/bobcbui/NbTemplate) ， [Gitee项目地址](https://gitee.com/bobcbui/NbTemplate)
## 现在我们开始实践

### Step : 1
这里我们只要引入了Vue.js、VueRouter、Vuex、Axios就可以了，当然你也可以引入其他的库，但是我们现在只是演示，所以这些就足够了。

``` html
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>NbTemplate</title>
	<meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0">
	<script src="https://cdn.bootcdn.net/ajax/libs/vue/3.2.47/vue.global.min.js"></script>
	<script src="https://cdn.bootcdn.net/ajax/libs/vue-router/4.1.6/vue-router.global.js"></script>
	<script src="https://cdn.bootcdn.net/ajax/libs/vuex/4.1.0/vuex.global.js"></script>
	<script src="https://cdn.bootcdn.net/ajax/libs/axios/1.3.6/axios.js"></script>
	<style></style>
	<style id='PageStyle'></style>
</head>
<body>
	<div id="app" v-cloak>
		<router-view></router-view>
	</div>
</body>
<script type="module">
	const routes = [
		{
			path: '/', redirect:"home", component: () => import('./view/index.js'),
			children: [
				{
					path: '/', name:'home', redirect: 'message', component: () => import('./view/home.js'),
					children: [
						{
							path: "/message", name: "message", component: () => import('./view/message.js')
						},
						{
							path: "/more", name: "more", component: () => import('./view/more.js')
						},
						{
							path: "/member", name: "member", component: () => import('./view/member.js')
						},
						{
							path: "/group", name: "group", component: () => import('./view/group.js')
						},
						{
							path: "/me", name: "me", component: () => import('./view/me.js')
						}
					]
				},
				{
					path: "/member-message", name: "member-message", component: () => import('./view/member-message.js')
				},
				{
					path: "/group-message", name: "group-message", component: () => import('./view/group-message.js')
				},
				
			]
		}
	]

	const router = VueRouter.createRouter({
		history: VueRouter.createWebHashHistory(),
		routes,
	})

	const app = Vue.createApp({})

	let store = Vuex.createStore({
		state: {
			member:null,
		}
	})

	router.afterEach((to) => {
		// 这个地方是希望在js里写css的方式
        let matched = to.matched.find(item => item.path == to.fullPath)
        document.getElementById("PageStyle").textContent = ""
        if(matched.components){
            if(matched.components.default.style){
                document.getElementById("PageStyle").textContent = matched.components.default.style
                console.log("修改颜色了")
            }
        }
	})
	
	app.use(router)
	app.use(store)
	app.mount('#app')
	
</script>

</html>
```

### Step : 2 如何新增一个页面
我们只需要在view文件夹下新增一个js文件，然后在路由中引入就可以了，这里我们以home.js为例，如果你是在Vscode上开发你需要安装一个插件`es6-string-html`，字符串模板，这样你就可以在js文件中写html代码了，如果你不想安装插件，你也可以在html文件中写，但是这样会导致你的代码不够优雅，所以我推荐你安装插件。

这个页面我们演示了如何用一个.js 文件替换我们的.vue文件，如何引入一个自定义组件。

``` js
let style = // css
`
body,html{
        background: red;
}
`

let template = // html
`
<cNav title='我的'>
	<cModal buttonName='设置'>
        <button @click="logout" class='w-100'>退出登录</button>
	</cModal>
</cNav>
<div v-if="member!=null" class='p-10'>
名称：{{member.username}}<br>
账号：{{member.account}}<br>
</div>
`
import cModal from '../component/modal.js'
import cNav from '../component/nav.js'
export default {
	template: template,
	style:style,
	data: () => {
		return {
			
		}
	},
	components:{
		cNav, cModal
	},
	computed:{
		member(){
			return this.$store.state.member;
		}
	},
	destroyed() {

	},
	methods: {
		logout(){
			
		}
		
	},
	created() {
	
	}
}

```

### Step : 3 如何新增一个组件
我们可以看到，这新增一个页面和使用Build模式是一样的。

```js
let template = // html
`
<button @click='show = !show' class='h-100'>{{buttonName}}</button>
<div class='mode' v-if='show'>
	<div class='mode-body'>
		<div class='header p-10 border-b-1' style='background: rgb(255, 222, 252);'>
            <button style='width:100%;' @click='close()'>关闭</button>
        </div>
        <div class='body p-10' style='background: rgb(255, 248, 248);height:100%;text-align: left'>
		    <slot></slot>
        </div>
	</div>
</div>
`
export default {
    props: {
        buttonName:{
            type: String,
            default: '按钮'
        }
    },
    data: () => {
        return {
            show: false
        }
    },
    methods: {
        close(){
            this.show = false;
        },
        open(){
            this.show = true;
        }
    },
    template: template
}
```