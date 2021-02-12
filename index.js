require('dotenv').config()

const express = require('express')
const session = require('express-session')
const { ExpressOIDC } = require('@okta/oidc-middleware')

const hostUrl = process.env.LAMBDA_TASK_ROOT ? process.env.HOST_URL_LAMBDA : process.env.HOST_URL_LOCAL

const absPathPrefix =
  (process.env.LAMBDA_TASK_ROOT ? process.env.ABSOLUTE_PATH_PREFIX : '') || ''

const app = express()

app.use(
  session({
    secret: process.env.APP_SECRET,
    resave: true,
    saveUninitialized: false,
  })
)

const loginRedirectUri = `${hostUrl}${absPathPrefix}/authorization-code/callback`
console.log({ loginRedirectUri })
const oidc = new ExpressOIDC({
  issuer: `${process.env.OKTA_ORG_URL}/oauth2/default`,
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  appBaseUrl: hostUrl,
  scope: 'openid profile',
  loginRedirectUri,
  routes: {
    loginCallback: {
      // afterCallback: `${absPathPrefix}/where-is-it`,
      afterCallback: `${absPathPrefix}/whizzo`,
    },
  },
})

const ensureAuthenticated = oidc.ensureAuthenticated(`${absPathPrefix}/login`)

app.use(oidc.router)

const port = process.env.PORT || 8080

app.get('/where-is-it', ensureAuthenticated, require('./where-is-it'))
app.use('/', (req, res) => res.redirect(`${absPathPrefix}/where-is-it`))

if (process.env.LAMBDA_TASK_ROOT) {
  const serverlessExpress = require('aws-serverless-express')
  const server = serverlessExpress.createServer(app)
  exports.handler = (event, context) =>
    serverlessExpress.proxy(server, event, context)
} else {
  app.listen(port, () => console.log(`Listening on port ${port}`))
}
