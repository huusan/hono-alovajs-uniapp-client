# Hono 与 Alova.js 的邂逅

[![npm](https://img.shields.io/npm/v/@huusan/hono-alovajs-uniapp-client.svg)](https://npmjs.com/package/@huusan/hono-alovajs-uniapp-client)
[![Unit Test](https://github.com/huusan/hono-alovajs-client/actions/workflows/unit-test.yml/badge.svg)](https://github.com/huusan/hono-alovajs-client/actions/workflows/unit-test.yml)

借助 Hono 的强大功能，为你的 alova.js 请求带来端到端的类型安全。

`hono-alovajs-client` 允许你以类型安全的方式调用 Hono 后端 API，就像 tRPC 一样，但不受限于 React。它能与 alova.js 及其 Vue、React、Svelte 等适配器无缝协作。

## 功能特性

- ✅ 端到端类型安全
- ✅ 适用于任何 alova.js 适配器（`@alova/adapter-uniapp`、`@alova/adapter-fetch` 等）
- ✅ API 路由自动补全
- ✅ 支持 `FormData` 文件上传

## 安装

```bash
npm install alova @huusan/hono-alovajs-uniapp-client
# 或 pnpm 或 yarn
```

根据你的环境，你还需要一个 alova 适配器：

- **Web (fetch):** `npm install @alova/adapter-fetch`
- **Uniapp:** `npm install @alova/adapter-uniapp`

## 使用

### 1. 定义你的 Hono 后端

首先，在 Hono 中定义你的 API 路由。

```typescript
// server/app.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/hello', (c) => {
    return c.json({ message: 'Hello!' })
  })
  .post('/posts', async (c) => {
    const body = await c.req.json()
    // ... 创建文章
    return c.json(body, 201)
  })
  // 用于分页的路由
  .get('/todos', (c) => {
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '10';
    // ... 根据 page 和 limit 查询数据
    return c.json({
      data: [{ id: 1, title: 'Todo 1' }],
      meta: { total: 100, page: Number(page), limit: Number(limit) }
    });
  })
  // 用于表单提交的路由
  .post('/form', (c) => c.json({ success: true }))
  // 用于验证码的路由
  .get('/captcha', (c) => c.json({ captcha: '1234' }))


export type AppType = typeof app
```

### 2. 创建 Alova 实例和 Hono 客户端

在客户端，使用合适的适配器创建一个 alova 实例，然后将其传递给 `hac`。

```typescript
import fetchAdapter from '@alova/adapter-fetch'; // 或 uniappAdapter
// src/api.ts
import { createAlova } from 'alova';
import { hac } from '@huusan/hono-alovajs-uniapp-client';
import type { AppType } from '../server/app'; // 导入你的 Hono 应用类型

// 1. 创建 alova 实例
const alovaInstance = createAlova({
  baseURL: 'http://localhost:3000',
  adapter: fetchAdapter(),
});

// 2. 创建 Hono 客户端
export const hc = hac<AppType>(alovaInstance);
```

### 3. 进行类型安全的 API 调用

现在你可以通过完全的类型安全和自动补全来调用你的后端 API。

**使用 `await`:**

```typescript
async function getHello() {
  const res = await hc.hello.$alova.get();
  // `res` 的类型是 `{ message: string }`
  console.log(res.message);
}
```

**传递 Alova 自定义参数:**

你可以将 alova 的方法配置作为第二个参数传递给请求方法，以使用 `transformData`、`localCache` 等功能。

```typescript
async function getAndTransformHello() {
  const method = hc.hello.$alova.get(
    {}, // Hono apecifc options, like `query`, `form`, `json`, `header`, `param`
    {
      // Alova specific options
      transformData: (data) => {
        return `Transformed: ${data.message}`;
      },
      localCache: 3600 * 1000, // 缓存1小时
    }
  );

  const res = await method;
  // `res` 的类型现在是 `string`
  console.log(res); // "Transformed: Hello!"
}
```

## 高级用法 (结合 `vue-alova`)

### 分页请求示例

使用 `usePagination` 来处理分页逻辑，它会自动管理页码和数据。

```vue
<script setup>
import { usePagination } from 'vue-alova';

const {
  data,
  page,
  isLastPage,
  loading,
  next,
} = usePagination(
  (page, limit) => hc.todos.$alova.get({ query: { page: String(page), limit: String(limit) } }),
  {
    total: res => res.meta.total,
    data: res => res.data,
    initialPage: 1,
    initialPageSize: 10,
  }
);
</script>
```

### 表单提交示例

使用 `useForm` 来轻松管理表单状态和提交。

```vue
<script setup>
import { useForm } from 'vue-alova';

const {
  form,
  send,
  loading,
  onSuccess,
} = useForm(
  (formData) => hc.form.$alova.post({ json: formData }),
  {
    initialForm: {
      username: '',
      password: '',
    }
  }
);

onSuccess(() => {
  alert('提交成功!');
});
</script>
```


### 针对 Uniapp

与 Uniapp 一起使用时，只需在创建 alova 实例时使用 `@alova/adapter-uniapp`。其余用法相同。默认入口完全兼容。

```typescript
import uniappAdapter from '@alova/adapter-uniapp';

const alovaInstance = createAlova({
  baseURL: 'https://your.api.com',
  adapter: uniappAdapter(),
});
```

**在 Uniapp 中使用 `useRequest`:**

你可以在 Uniapp (Vue 3) 项目中无缝使用 `vue-alova` 的 `useRequest`。

```vue
<!-- pages/index/index.vue -->
<script setup>
import { useRequest } from 'vue-alova';
import { hc } from '@/api'; // 假设你的 hc 实例在 @/api.ts

const { data, loading, error } = useRequest(hc.hello.$alova.get());
</script>

<template>
  <view>
    <view v-if="loading">加载中...</view>
    <view v-if="error">错误: {{ error.message }}</view>
    <view v-if="data">来自服务器的消息: {{ data.message }}</view>
  </view>
</template>
```

**在 Uniapp 中上传文件:**

`hono-alovajs-client` 可以自动处理 `FormData`。在 Uniapp 中，你可以像下面这样传递文件路径，它会被转换成一个 `UploadFileOption` 对象。

```typescript
// 在你的页面或组件中
async function uploadImage() {
  // 从本地选择图片
  const chooseRes = await uni.chooseImage({ count: 1 });
  const filePath = chooseRes.tempFilePaths[0];

  // 假设你的 Hono 后端有一个 /upload 路由
  const res = await hc.upload.$alova.post({
    form: {
      file: filePath, // 直接传递文件路径
    },
  });

  console.log('Upload success:', res);
}
```

就是这样！享受 Hono 和 Alova.js 带来的端到端类型安全吧。

## License

[MIT](./LICENSE) License © 2025 [huusan](https://github.com/huusan)
