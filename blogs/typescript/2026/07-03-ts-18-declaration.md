---
layout: special-post
title: 为 JavaScript 库补 TypeScript 声明
date: 2026-07-03
category: TypeScript
---

声明文件是使用者理解库 API 的地图，准确性比覆盖所有内部细节更重要。

![为 JavaScript 库补 TypeScript 声明动态示意图](images/07-03-ts-18-declaration.svg)

## 为什么值得理解

声明文件描述 JavaScript 库的公共 API，让 TypeScript 使用者获得检查和补全。声明必须匹配真实运行行为，否则错误的类型比没有类型更危险。

## 工作原理

.d.ts 可以声明模块、函数、类和全局扩展，泛型保留调用关系。package.json 的 types 与 exports 需要让不同模块解析模式找到同一套声明。

## 实战场景

为一个返回 Promise 的 JavaScript SDK 补声明时，应覆盖选项、错误和事件回调，并用类型测试验证推断，而不是描述内部辅助函数。

## 常见误区

不要用 declare module '*' 压掉所有缺失声明，也不要把可能返回 undefined 的函数标成必有值。默认导出与命名导出必须与运行时一致。

## 实践清单

- 声明公共 API 而不是内部变量。
- 用类型测试验证声明可用。
- 保持声明和真实运行时同步。
- 让静态类型与真实运行时数据保持一致
- 将关键约束纳入类型检查和自动化测试

## 动手练习

选择一个小 JavaScript 模块手写声明，添加合法与应报错的类型用例。分别用 NodeNext 和 bundler 模式检查包入口。

## 小结

学习“为 JavaScript 库补 TypeScript 声明”时，类型只是表达约束的工具。只有把运行时校验、状态变化和实际构建结果一起验证，才能真正降低错误率，并让类型在需求演进中持续帮助团队。
