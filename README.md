# Hono meets Alova.js

Bring end-to-end type-safety to your alova.js requests, with the power of Hono.

`hono-alovajs-uniapp-client` allows you to call your Hono backend APIs in a type-safe way, just like tRPC, but without being tied to React. It works seamlessly with alova.js and its adapters for Vue, React, Svelte, and more.

## Features

- ✅ End-to-end type-safety
- ✅ Works with any alova.js adapter (`@alova/adapter-uniapp`, `@alova/adapter-fetch`, etc.)
- ✅ Auto-completion for API routes
- ✅ Handles `FormData` for file uploads

## Installation

```bash
npm install alova @huusan/hono-alovajs-uniapp-client
# or pnpm or yarn
```

Depending on your environment, you will also need an alova adapter:

- **For Web (fetch):** `npm install @alova/adapter-fetch`
- **For Uniapp:** `npm install @alova/adapter-uniapp`

## Usage

### 1. Define your Hono Backend

First, define your API routes in Hono.

```typescript
// server/app.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/hello', (c) => {
    return c.json({ message: 'Hello!' })
  })
  .post('/posts', async (c) => {
    const body = await c.req.json()
    // ... create post
    return c.json(body, 201)
  })
  // Route for pagination
  .get('/todos', (c) => {
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '10';
    // ... query data based on page and limit
    return c.json({
      data: [{ id: 1, title: 'Todo 1' }],
      meta: { total: 100, page: Number(page), limit: Number(limit) }
    });
  })
  // Route for form submission
  .post('/form', (c) => c.json({ success: true }))
  // Route for captcha
  .get('/captcha', (c) => c.json({ captcha: '1234' }))


export type AppType = typeof app
```

### 2. Create the Alova Instance and Hono Client

On the client-side, create an alova instance with the appropriate adapter, then pass it to `hac`.

```typescript
import fetchAdapter from '@alova/adapter-fetch'; // or uniappAdapter
// src/api.ts
import { createAlova } from 'alova';
import { hac } from 'hono-alovajs-client';
import type { AppType } from '../server/app'; // Import your Hono app type

// 1. Create alova instance
const alovaInstance = createAlova({
  baseURL: 'http://localhost:3000',
  adapter: fetchAdapter(),
});

// 2. Create the Hono client
export const hc = hac<AppType>(alovaInstance);
```

### 3. Make Type-Safe API Calls

You can now call your backend APIs with full type-safety and auto-completion.

**Using with `await`:**

```typescript
async function getHello() {
  const res = await hc.hello.$alova.get();
  // `res` is typed as `{ message: string }`
  console.log(res.message);
}
```

**Passing Alova Custom Options:**

You can pass alova's method configurations as the second argument to the request function to use features like `transformData`, `localCache`, etc.

```typescript
async function getAndTransformHello() {
  const method = hc.hello.$alova.get(
    {}, // Hono specific options, like `query`, `form`, `json`, `header`, `param`
    {
      // Alova specific options
      transformData: (data) => {
        return `Transformed: ${data.message}`;
      },
      localCache: 3600 * 1000, // Cache for 1 hour
    }
  );

  const res = await method;
  // `res` is now typed as `string`
  console.log(res); // "Transformed: Hello!"
}
```

## Advanced Usage (with `vue-alova`)

### Pagination Example

Use `usePagination` to handle pagination logic, which automatically manages page numbers and data.

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

### Form Submission Example

Use `useForm` to easily manage form state and submission.

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
  alert('Submitted successfully!');
});
</script>
```

### For Uniapp

When using with Uniapp, simply use `@alova/adapter-uniapp` when creating your alova instance. The rest of the usage is the same. The default entry point is fully compatible.

```typescript
import uniappAdapter from '@alova/adapter-uniapp';

const alovaInstance = createAlova({
  baseURL: 'https://your.api.com',
  adapter: uniappAdapter(),
});
```

**Using `useRequest` in Uniapp:**

You can seamlessly use `useRequest` from `vue-alova` in your Uniapp (Vue 3) projects.

```vue
<!-- pages/index/index.vue -->
<script setup>
import { useRequest } from 'vue-alova';
import { hc } from '@/api'; // Assuming your hc instance is in @/api.ts

const { data, loading, error } = useRequest(hc.hello.$alova.get());
</script>

<template>
  <view>
    <view v-if="loading">Loading...</view>
    <view v-if="error">Error: {{ error.message }}</view>
    <view v-if="data">Message from server: {{ data.message }}</view>
  </view>
</template>
```

**Uploading Files in Uniapp:**

`hono-alovajs-client` handles `FormData` automatically. In Uniapp, you can pass a file path, and it will be converted to an `UploadFileOption` object.

```typescript
// In your page or component
async function uploadImage() {
  // Choose an image from local files
  const chooseRes = await uni.chooseImage({ count: 1 });
  const filePath = chooseRes.tempFilePaths[0];

  // Assuming you have an /upload route on your Hono backend
  const res = await hc.upload.$alova.post({
    form: {
      file: filePath, // Pass the file path directly
    },
  });

  console.log('Upload success:', res);
}
```

That's it! Enjoy end-to-end type-safety with Hono and Alova.js.

## License

[MIT](./LICENSE) License © 2025 [huusan](https://github.com/huusan)
