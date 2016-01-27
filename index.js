/* jslint node: true, esnext: true */


"use strict";

exports.Service = require('./lib/Service');
exports.ServiceConsumerMixin = require('./lib/ServiceConsumerMixin');
exports.ServiceProviderMixin = require('./lib/ServiceProviderMixin');
exports.EndpointsMixin = require('./lib/EndpointsMixin');


const rmn = require('./lib/RegistryMixin');

exports.defineObjectRegistryProperties = rmn.defineObjectRegistryProperties;
exports.defineFactoryRegistryProperties = rmn.defineFactoryRegistryProperties;
