window.MEILP = window.MEILP || {};

/**
 * Client-side router for platform views.
 * Uses hash routes so the static site works on GitHub Pages, Netlify, embedded
 * iframes, and direct file opening.
 */
class Router {
  constructor({ routes = {}, eventBus = null } = {}) {
    this.routes = routes;
    this.eventBus = eventBus;
    this.currentRoute = null;
    this.handleRouteChange = this.handleRouteChange.bind(this);
  }

  start() {
    window.addEventListener("hashchange", this.handleRouteChange);
    this.handleRouteChange();
  }

  stop() {
    window.removeEventListener("hashchange", this.handleRouteChange);
  }

  navigate(routeName, params = {}) {
    const hash = this.buildHash(routeName, params);
    if (window.location.hash === hash) {
      this.handleRouteChange();
      return;
    }

    window.location.hash = hash;
  }

  buildHash(routeName, params = {}) {
    const searchParams = new URLSearchParams(params);
    const query = searchParams.toString();
    return query ? `#/${routeName}?${query}` : `#/${routeName}`;
  }

  parseHash(hash = window.location.hash) {
    const cleanHash = hash.replace(/^#\/?/, "");
    if (!cleanHash) {
      return { name: "home", params: {} };
    }

    const [path, queryString = ""] = cleanHash.split("?");
    const params = Object.fromEntries(new URLSearchParams(queryString));
    return {
      name: path || "home",
      params
    };
  }

  handleRouteChange() {
    const route = this.parseHash();
    this.currentRoute = route;

    if (this.eventBus) {
      this.eventBus.emit("router:navigated", route);
    }

    const handler = this.routes[route.name];
    if (typeof handler === "function") {
      handler(route.params, route);
    }
  }
}

window.MEILP.Router = Router;
