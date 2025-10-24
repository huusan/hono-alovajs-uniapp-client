import { serialize } from 'hono/utils/cookie'
import {
  buildSearchParams,
  deepMerge,
  handleForm,
  removeIndexString,
  replaceUrlParam,
  upperMethodFirstLetter,
} from './utils'
import type { AlovaMethodCreateConfig } from './types'
import type { Alova, AlovaGenerics } from 'alova'
import type { ClientRequestOptions, ValidationTargets } from 'hono'
import type { FormValue } from 'hono/types'

export class AlovaRequestImpl<A extends Alova<AlovaGenerics>> {
  private url: string
  private method:
    | 'Get'
    | 'Post'
    | 'Put'
    | 'Delete'
    | 'Head'
    | 'Options'
    | 'Patch'
  private queryParams: URLSearchParams | undefined = undefined
  private pathParams: Record<string, string> = {}
  private rBody: BodyInit | Record<string, any> | undefined
  private cType: string | undefined = undefined
  private ins: A

  constructor(url: string, method: string, ins: A) {
    this.url = url
    this.method = upperMethodFirstLetter(method.toLowerCase())
    this.ins = ins
  }

  async apply(
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    config?: AlovaMethodCreateConfig<AlovaGenerics<any, any, any, any, any>>,
    options?: ClientRequestOptions,
  ) {
    if (args) {
      if (args.query) {
        this.queryParams = buildSearchParams(args.query)
      }

      if (args.form) {
        this.rBody = handleForm(args.form)
      }

      if (args.json) {
        this.rBody = JSON.stringify(args.json)
        this.cType = 'application/json'
      }

      if (args.param) {
        this.pathParams = args.param
      }
    }

    const headerValues: Record<string, string> = {
      ...args?.header,
      ...(typeof options?.headers === 'function'
        ? await options.headers()
        : options?.headers),
      ...config?.headers,
    }

    if (args?.cookie) {
      const cookies: string[] = []
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push(serialize(key, value, { path: '/' }))
      }
      headerValues.Cookie = cookies.join(',')
    }

    if (this.cType) {
      headerValues['Content-Type'] = this.cType
    }

    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = `${url}?${this.queryParams.toString()}`
    }

    const finalConfig = deepMerge<
      AlovaMethodCreateConfig<AlovaGenerics<any, any, any, any, any>>
    >(config ?? {}, {
      headers: headerValues,
    })

    const setBody =
      this.method !== 'Get' &&
      this.method !== 'Head' &&
      this.method !== 'Options'

    if (setBody) {
      return this.ins[this.method](url, this.rBody, finalConfig)
    } else {
      return this.ins[this.method](url, finalConfig)
    }
  }
}

// this ClientRequestImpl is copied from hono

export class ClientRequestImpl {
  private url: string
  private method: string
  private queryParams: URLSearchParams | undefined = undefined
  private pathParams: Record<string, string> = {}
  private rBody: BodyInit | Record<string, any> | undefined
  private cType: string | undefined = undefined

  constructor(url: string, method: string) {
    this.url = url
    this.method = method
  }
  fetch = async (
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    opt?: ClientRequestOptions,
  ) => {
    if (args) {
      if (args.query) {
        this.queryParams = buildSearchParams(args.query)
      }

      if (args.form) {
        this.rBody = handleForm(args.form)
      }

      if (args.json) {
        this.rBody = JSON.stringify(args.json)
        this.cType = 'application/json'
      }

      if (args.param) {
        this.pathParams = args.param
      }
    }

    let methodUpperCase = this.method.toUpperCase()

    const headerValues: Record<string, string> = {
      ...args?.header,
      ...(typeof opt?.headers === 'function'
        ? await opt.headers()
        : opt?.headers),
    }

    if (args?.cookie) {
      const cookies: string[] = []
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push(serialize(key, value, { path: '/' }))
      }
      headerValues.Cookie = cookies.join(',')
    }

    if (this.cType) {
      headerValues['Content-Type'] = this.cType
    }

    const headers = new Headers(headerValues ?? undefined)
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = `${url}?${this.queryParams.toString()}`
    }
    methodUpperCase = this.method.toUpperCase()
    const setBody = methodUpperCase !== 'GET' && methodUpperCase !== 'HEAD'

    // Pass URL string to 1st arg for testing with MSW and node-fetch
    // Handle different body types for Uniapp vs standard web environment
    const isUniappEnvironment = typeof globalThis !== 'undefined' && 'uni' in globalThis
    const requestBody = setBody ? this.rBody : undefined
    
    if (isUniappEnvironment && typeof requestBody === 'object' && requestBody !== null) {
      // For Uniapp, pass the form object directly
      return (opt?.fetch || fetch)(url, {
        body: requestBody as any,
        method: methodUpperCase,
        headers,
        ...opt?.init,
      })
    } else {
      // Standard web environment
      return (opt?.fetch || fetch)(url, {
        body: requestBody as BodyInit,
        method: methodUpperCase,
        headers,
        ...opt?.init,
      })
    }
  }
}
