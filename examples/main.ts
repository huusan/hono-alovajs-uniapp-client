import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { hac } from '../src/index'
import type { App } from './server'

const alova = createAlova({
  baseURL: 'http://localhost:3999',
  requestAdapter: adapterFetch(),
  responded: (response) => response.json(),
})

const client = hac<App>(alova)

const creationResponse = await client.users.$alova.$post({
  json: {
    name: 'test',
    email: 'test@example.com',
    age: 18,
  },
})

console.info('Creation response:', creationResponse)

const users = await client.users.$alova.$get()

console.info('All users:', users)

const singleUser = await client.users[':id'].$alova.$get({
  param: {
    id: '1',
  },
})

console.info('Single user with id 1:', singleUser)
