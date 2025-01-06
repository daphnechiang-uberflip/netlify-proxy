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
      },
      redirect: 'manual',
      body: request.body,
    })

    const response = await fetch(proxyRequest);

    console.log('original response', response);

    if (response.status === 301 || response.status === 302) {
      // Handle redirection
      const location = response.headers.get('Location');
      if (location) {
        return Response.redirect(location, response.status);
      }
    }

    // Clone the response so we can modify headers
    const modifiedHeaders = new Headers(response.headers)

    // Handle Set-Cookie manually
    const setCookieHeader = response.headers.get('Set-Cookie')
    console.log('setCookieHeader', setCookieHeader);

    if (setCookieHeader) {
      const cookies = setCookieHeader.split(',') // Handle multiple cookies if comma-separated
      const modifiedCookies = cookies.map(cookie => {
        if (cookie.trim().startsWith('_MGZ_')) {
          // Modify the SameSite attribute only for _MGZ_
          if (cookie.includes('SameSite=')) {
            return cookie.replace(/SameSite=[a-zA-Z]+/, 'SameSite=None;')
          } else {
            return `${cookie};  path=/; secure; HttpOnly; SameSite=None;`
          }
        }

        console.log('new cookie', cookie);
        return cookie
      })

      // Replace Set-Cookie header with modified cookies
      modifiedHeaders.delete('Set-Cookie')
      modifiedCookies.forEach(modifiedCookie => {
        modifiedHeaders.append('Set-Cookie', modifiedCookie.trim())
      })
    }

    console.log('response with modified headers', response);

    // Return the modified response for non-redirect cases
    return new Response(response.body, {
      ...response,
      headers: modifiedHeaders,
    })
  }
}
