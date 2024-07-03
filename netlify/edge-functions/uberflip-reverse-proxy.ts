// import uberflipRedirects from '../../src/variables/uberflip-redirects.json' assert { type: 'json' }

const pathRegex = /^.*\/hub?/
const proxyUrl = 'https://read.uberflip.com/hub'
// const locale = Deno.env.get('GATSBY_LOCALE')
const hostHeaders = {
  us: 'uberflip-proxy.netlify.app',
//   gb: 'construction.autodesk.co.uk',
//   eu: 'construction.autodesk.eu',
//   au: 'construction.autodesk.com.au',
//   nz: 'construction.autodesk.co.nz',
//   jp: 'construction.autodesk.co.jp',
}
// const hostHeader = hostHeaders[locale]
const hostHeader = hostHeaders.us
// const resourceCenterRedirects = uberflipRedirects[locale]

export default async (request: Request) => {
  if (hostHeader) {
    // Remove bad strings from the url like 'javascript;' that wind up getting
    // seen as needing a trailing slash. NOTE: ORDER MATTERS HERE!
    const sanitizeableStrings = ['javascript;:', 'javascript;']
    const cleanedRequestUrl = sanitizeableStrings.reduce(
      (acc, curr) => acc.replace(curr, ''),
      request.url
    )
    const newUrl = new URL(cleanedRequestUrl)
    const url = `${newUrl.origin}${newUrl.pathname}`
    const qs = newUrl.search

    // Check a datasource of Uberflip redirects for the incoming request url
    // and redirect accordingly if there is a match
    // const uberflipRedirect = resourceCenterRedirects.find((r: {from: string}) =>
    //   cleanedRequestUrl.includes(`/resources${r.from}`)
    // )

    // if (uberflipRedirect) {
    //   return Response.redirect(uberflipRedirect.to + qs, 301)
    // }

    let path = url.replace(pathRegex, proxyUrl)
    path = `${path}${qs}`

    const proxyRequest = new Request(path, {
      ...request,
      method: request.method,
      headers: {
        ...request.headers,
        'X-Forwarded-Host': hostHeader,
        'X-Original-Host': hostHeader,
        'X-Netlify-Hostname': hostHeader,
        'X-Forwarded-For': request.headers.get('X-Forwarded-For') || request.headers.get('X-Real-IP') || request.ip || '',
        'X-Forwarded-Proto': request.headers.get('X-Forwarded-Proto') || 'http',
        'X-Forwarded-Port': request.headers.get('X-Forwarded-Port') || '80',
        'Connection': 'keep-alive',
        // 'User-Agent': request.headers.get('User-Agent'),
      },
      redirect: request.redirect,
      body: request.body,
    })

    const response = await fetch(proxyRequest)

    return response
  }
}
