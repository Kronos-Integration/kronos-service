import Service from "./service.mjs";

/**
 * Config providing service
 * Dispatches config requests to services
 * or preserves them until a maching service becomes avaliable
 */
export default class ServiceConfig extends Service {
  /**
   * @return {string} 'config'
   */
  static get name() {
    return "config";
  }

  constructor(...args) {
    super(...args);

    Object.defineProperties(this, {
      preservedConfigs: { value: new Map() }
    });
  }

  /**
   * set config entry 
   * @param key 
   * @param value 
   */
  async setEntry(key, value) {
    /*
    const path = key.split(/\./);
    const name = path.shift();
    const s = this.owner.services[name];
    if (s === undefined) {

    }

    let c = config;

    do {
      let slot = path.shift();
      if (path.length === 0) {
        c[slot] = listener.fd;
        break;
      }
      c = c[slot];
    } while (true);
    */
  }

  /**
   *
   * @param {Array|Object} config
   */
  async configure(config) {
    const update = async (name, c) => {
      const s = this.owner.services[name];
      if (s === undefined) {
        delete c.name;
        this.preservedConfigs.set(name, c);
      } else {
        return s.configure(c);
      }
    };

    if (config === undefined) {
      return;
    }

    await Promise.all(
      Array.isArray(config)
        ? config.map(c => update(c.name, c))
        : Object.entries(config).map(([k, v]) => update(k, v))
    );
  }

  /**
   * We always start immediate
   * @return {boolean} true
   */
  get autostart() {
    return true;
  }

  get name() {
    return "config";
  }
}
