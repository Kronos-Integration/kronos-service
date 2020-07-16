import ServiceLogger from "./service-logger.mjs";
import ServiceConfig from "./service-config.mjs";
import { InitializationContext } from "./initialization-context.mjs";

/**
 * Provide services and hold service configuration.
 * By default a service provider has two build in services
 * 'logger' and 'config'.
 *
 * @param {Class} serviceLoggerClass where the logging houtd go
 * @param {Class} serviceConfigClass where the config comes from
 */
export default function ServiceProviderMixin(
  superclass,
  serviceLoggerClass = ServiceLogger,
  serviceConfigClass = ServiceConfig
) {
  return class ServiceProvider extends superclass {
    interceptorFactories = {};
    serviceFactories = {};
    services = {};

    constructor(config) {
      const ic = new InitializationContext();

      super(Array.isArray(config) ? config[0] : config, ic);

      ic.logLevel = this.logLevel;
      ic.serviceProvider = this;

      // let our own logging go into the logger service
      const loggerService = new serviceLoggerClass(undefined, ic);
      this.registerService(loggerService);

      // register config service and let it know about the initial config
      const configService = new serviceConfigClass(undefined, ic);
      this.registerService(configService);

      this.registerService(this);

      ic.resolveOutstandingEndpointConnections();

      configService.configure(config);
    }

    async execute(command) {
      if (Array.isArray(command)) {
        return Promise.all(command.map(c => this.execute(c)));
      }

      if (command.action === "list") {
        return Object.keys(this.services)
          .map(name => this.services[name])
          .map(s =>
            command.options ? s.toJSONWithOptions(command.options) : s.toJSON()
          );
      }

      const service = this.services[command.service];

      if (service === undefined) {
        throw new Error(`Unknown service: ${command.service}`);
      }

      //console.log("CONNECTIONS",[...service.endpoints.log.connections()].map(c=>c.identifier));

      switch (command.action) {
        case "get":
          return service.toJSONWithOptions(command.options);

        case "start":
          return service.start();

        case "stop":
          return service.stop();

        case "restart":
          return service.restart();

        default:
          throw new Error(`Unknown command: ${command.action}`);
      }
    }

    /** by default be our own owner */
    get owner() {
      return this;
    }

    registerInterceptorFactory(factory) {
      this.interceptorFactories[factory.name] = factory;
      this.emit("interceptorFactoryRegistered", factory);
      return factory;
    }

    unregisterInterceptorFactory(factory) {
      delete this.interceptorFactories[factory.name];
    }

    instantiateInterceptor(def)
    {
      let factory, options;
      
      switch(typeof def) {
       case 'string': {
         factory = this.interceptorFactories[def];  
       break;
       case 'object':
         factory = this.interceptorFactories[def.type];
         options = def;
      }

      if(factory) {
        return new factory(def, options);
      }
    }
 
    async registerServiceFactory(factory) {
      this.serviceFactories[factory.name] = factory;
      this.emit("serviceFactoryRegistered", factory);
      return factory;
    }

    async unregisterServiceFactory(factory) {
      delete this.serviceFactories[factory.name];
    }

    async registerService(service) {
      this.services[service.name] = service;
      return service;
    }

    async unregisterService(serviceName) {
      const service = this.services[serviceName];

      await service.stop();
      delete this.services[serviceName];
    }

    get serviceNames() {
      return this.services === undefined
        ? []
        : Object.keys(this.services).sort();
    }

    getService(name) {
      return this.services && this.services[name];
    }

    async declareService(config) {
      const name = config.name;
      const services = await this.declareServices({ [name]: config });
      return services[name];
    }

    /**
     * Add a new service based on its configuration
     * If a service for the name is already present and it has a matching type
     * then its configure() is called and returned.
     * Otherwise a new service will be created eventually replacing an already existing service with the same name.
     * @param {object} config with
     *     name - the service name
     *     type - the service factory name - defaults to config.name
     * @return {Promise<Object>} resolving to the declared services
     */
    async declareServices(configs) {
      const ic = new InitializationContext(this);

      const services = Promise.all(
        Object.entries(configs).map(([name, config]) =>
          ic.declareService(config, name)
        )
      );

      ic.resolveOutstandingEndpointConnections();
      ic.validateEndpoints();

      return Object.fromEntries(
        (await services).map(service => [service.name, service])
      );
    }

    /**
     * start all registered services which hanving autostart set
     */
    async _start() {
      await super._start();

      return Promise.all(
        Object.values(this.services)
          .filter(service => service !== this && service.autostart)
          .map(s => s.start())
      );
    }

    /**
     * Stop all services
     * @return {Promise} that resolves when all services are stopped
     */
    async _stop() {
      await Promise.all(
        Object.values(this.services)
          .filter(service => service !== this)
          .map(s => s.stop())
      );

      return super._stop();
    }
  };
}
