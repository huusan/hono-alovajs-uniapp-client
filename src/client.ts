import { AlovaRequestImpl, ClientRequestImpl } from './request-impl'
import {
  buildSearchParams,
  deepMerge,
  mergePath,
  replaceUrlParam,
  upperMethodFirstLetter,
} from './utils'
import type { Callback, Client } from './types'
import type { Alova, AlovaGenerics } from 'alova'
import type { ClientRequestOptions } from 'hono'
import type { HonoBase } from 'hono/hono-base'
import type { UnionToIntersection } from 'hono/utils/types'

const createProxy = (callback: Callback, path: string[]) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== 'string' || key === 'then') {
        return
      }
      return createProxy(callback, [...path, key])
    },
    apply(_1, _2, args) {
      return callback({
        path,
        args,
      })
    },
  })
  return proxy
}

export const hac = <
  T extends HonoBase<any, any, any>,
  A extends Alova<AlovaGenerics<any, any, any, any, any>> = Alova<
    AlovaGenerics<any, any, any, any, any>
  >,
>(
  alova: A,
  options?: ClientRequestOptions,
) =>
  createProxy(function proxyCallback(opts) {
    const parts = [...opts.path]
    const lastParts = parts.slice(-3).toReversed()

    // allow calling .toString() and .valueOf() on the proxy
    if (lastParts[0] === 'toString') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.toString() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.toString()
      return proxyCallback.toString()
    }

    if (lastParts[0] === 'valueOf') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.valueOf() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.valueOf()
      return proxyCallback
    }

    let method = ''
    if (/^\$/.test(lastParts[0] as string)) {
      const last = parts.pop()
      if (last) {
        method = last.replace(/^\$/, '')
      }
    }

    const baseUrl = alova.options.baseURL || '/'
    const path = parts.join('/')
    const url = mergePath(baseUrl, path)

    if (method === 'url') {
      let result = url
      if (opts.args[0]) {
        if (opts.args[0].param) {
          result = replaceUrlParam(url, opts.args[0].param)
        }
        if (opts.args[0].query) {
          result = `${result}?${buildSearchParams(opts.args[0].query).toString()}`
        }
      }
      return new URL(result)
    }

    // =============the code above is copied from hono============

    const penultimate = lastParts[1]

    if (penultimate === '$alova' && method) {
      const alovaMethod = upperMethodFirstLetter(method)
      const path = parts.slice(0, -1).join('/')

      const alovaRequest = new AlovaRequestImpl(path, alovaMethod, alova)
      return alovaRequest.apply(opts.args[0], opts.args[1], options)
    }

    // =============the code below is copied from hono============

    const req = new ClientRequestImpl(url, method)
    if (method) {
      options ??= {}
      const args = deepMerge<ClientRequestOptions>(options, { ...opts.args[1] })
      return req.fetch(opts.args[0], args)
    }
    return req
  }, []) as UnionToIntersection<Client<T>>
