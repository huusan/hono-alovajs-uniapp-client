import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { hac } from '../src/index'
import type { App } from './server'

// 1. 创建 alova 实例
const alova = createAlova({
  baseURL: 'http://localhost:3999',
  requestAdapter: adapterFetch(),
  responded: (response) => response.json(),
})

// 2. 创建 Hono 客户端
const client = hac<App>(alova)

console.log('--- 创建一个新用户 ---')
const creationResponse = await client.users.$alova.$post({
  json: {
    name: 'test',
    email: 'test@example.com',
    age: 18,
  },
})
console.info('创建用户响应:', creationResponse)

console.log('\n--- 获取所有用户 (使用命名 Method) ---')
// 3. 为 Method 命名
const getUsersMethod = client.users.$alova.$get(
  {},
  {
    name: 'user-list',
  },
)
const users = await getUsersMethod
console.info('所有用户:', users)

console.log('\n--- 获取单个用户 (使用缓存) ---')
// 4. 使用 cacheFor 设置缓存
const getSingleUserMethod = client.users[':id'].$alova.$get(
  {
    param: {
      id: '1',
    },
  },
  {
    cacheFor: 5 * 60 * 1000, // 缓存5分钟
  },
)

let singleUser = await getSingleUserMethod
console.info('第一次获取ID为1的用户:', singleUser)
// 再次调用，这次会命中缓存
singleUser = await getSingleUserMethod
console.info('第二次获取ID为1的用户 (来自缓存):', singleUser)

console.log('\n--- 更新用户 (传递 meta 数据) ---')
// 5. 在 Method 配置中传递 meta 数据
const updateUserMethod = client.users[':id'].$alova.$put(
  {
    param: { id: '1' },
    json: {
      age: 40,
    },
  },
  {
    meta: {
      authRole: 'admin', // 假设这个请求需要管理员权限
    },
  },
)
console.info('更新用户的 Method 配置:', updateUserMethod.config)
const updateResponse = await updateUserMethod
console.info('更新用户响应:', updateResponse)

console.log('\n--- 手动发送请求 ---')
// 6. 创建一个 Method 实例但不立即发送
const deleteUserMethod = client.users[':id'].$alova.$delete(
  {
    param: {
      id: '0',
    },
  },
  {
    name: 'delete-user-method',
  },
)
// 手动调用 send 方法发送请求
const deleteResponse = await deleteUserMethod.send()
console.info('删除用户响应:', deleteResponse)
