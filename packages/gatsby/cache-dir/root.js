import { createElement } from "react"
import { Router, Route } from "react-router-dom"
import { ScrollContext } from "gatsby-react-router-scroll"
import {
  shouldUpdateScroll,
  attachToHistory,
  init as navigationInit,
} from "./navigation"
import history from "./history"
import { apiRunner } from "./api-runner-browser"
import syncRequires from "./sync-requires"
import pages from "./pages.json"
import loader from "./loader"
import { hot } from "react-hot-loader"
import JSONStore from "./json-store"

import * as ErrorOverlay from "react-error-overlay"

// Report runtime errors
ErrorOverlay.startReportingRuntimeErrors({
  onError: () => {},
  filename: `/commons.js`,
})
ErrorOverlay.setEditorHandler(errorLocation =>
  window.fetch(
    `/__open-stack-frame-in-editor?fileName=` +
      window.encodeURIComponent(errorLocation.fileName) +
      `&lineNumber=` +
      window.encodeURIComponent(errorLocation.lineNumber || 1)
  )
)

if (window.__webpack_hot_middleware_reporter__ !== undefined) {
  // Report build errors
  window.__webpack_hot_middleware_reporter__.useCustomOverlay({
    showProblems(type, obj) {
      if (type !== `errors`) {
        ErrorOverlay.dismissBuildError()
        return
      }
      ErrorOverlay.reportBuildError(obj[0])
    },
    clear() {
      ErrorOverlay.dismissBuildError()
    },
  })
}

navigationInit()

// Call onRouteUpdate on the initial page load.
apiRunner(`onRouteUpdate`, {
  location: history.location,
  action: history.action,
})

const AltRouter = apiRunner(`replaceRouterComponent`, { history })[0]

const Root = () =>
  createElement(
    AltRouter ? AltRouter : Router,
    {
      basename: __PATH_PREFIX__,
      history: !AltRouter ? history : undefined,
    },
    createElement(
      ScrollContext,
      { shouldUpdateScroll },
      createElement(Route, {
        // eslint-disable-next-line react/display-name
        render: routeProps => {
          attachToHistory(routeProps.history)
          const { pathname } = routeProps.location
          const pageResources = loader.getResourcesForPathname(pathname)
          const isPage = !!(pageResources && pageResources.component)
          if (isPage) {
            return createElement(JSONStore, {
              pages,
              ...routeProps,
              pageResources,
            })
          } else {
            const dev404Page = pages.find(p => /^\/dev-404-page/.test(p.path))
            return createElement(Route, {
              key: `404-page`,
              // eslint-disable-next-line react/display-name
              component: props =>
                createElement(
                  syncRequires.components[dev404Page.componentChunkName],
                  {
                    pages,
                    ...routeProps,
                  }
                ),
            })
          }
        },
      })
    )
  )

// Let site, plugins wrap the site e.g. for Redux.
const WrappedRoot = apiRunner(`wrapRootComponent`, { Root }, Root)[0]

export default hot(module)(WrappedRoot)
