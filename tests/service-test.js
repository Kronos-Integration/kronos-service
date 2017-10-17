/* global describe, it, xit, before, beforeEach  */
/* jslint node: true, esnext: true */

'use strict';

const chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  should = chai.should(),
  endpoint = require('kronos-endpoint'),
  mat = require('model-attributes'),
  Service = require('../dist/module').Service;

const owner = {
  emit(name, arg1, arg2) {}, // dummy event emitter
  endpointIdentifier(e) {
    return `name:${e.name}`;
  }
};

class MyService extends Service {
  static get name() {
    return 'my-service';
  }

  static get description() {
    return 'my description';
  }

  static get configurationAttributes() {
    return Object.assign(
      mat.createAttributes({
        key3: {
          needsRestart: true
        },
        key4: {}
      }),
      Service.configurationAttributes
    );
  }

  _start() {
    return new Promise((f, r) => setTimeout(() => f(), 10));
  }

  async configure(config) {
    await super.configure(config);
    Object.assign(this, config);
  }
}

describe('service', () => {
  const s1 = new Service(
    {
      key1: 'value1',
      key2: 2
    },
    owner
  );

  describe('plain creation', () => {
    //  it('has a description', () =>
    //    assert.equal(s1.description, 'my description'));
    it('has a type', () => assert.equal(s1.type, 'service'));
    it('has a name', () => assert.equal(s1.name, 'service'));
    it('has a owner', () => assert.equal(s1.owner, owner));
    it('has a toString', () => assert.equal(s1.toString(), 'service: stopped'));
    it('is stopped', () => assert.equal(s1.state, 'stopped'));
    it('autstart is off', () => assert.isFalse(s1.autostart));
    it('has default logLevel info', () => assert.equal(s1.logLevel, 'info'));
    it('has default start timeout', () => assert.equal(s1.timeout.start, 5));
  });

  describe('create with name', () => {
    const s2 = new Service(
      {
        name: 'myName'
      },
      owner
    );
    it('has a name', () => assert.equal(s2.name, 'myName'));
    it('json', () =>
      assert.deepEqual(s2.toJSON(), {
        name: 'myName',
        type: 'service',
        endpoints: {}
      }));
  });

  describe('create with endpoints', () => {
    const s2 = new Service(
      {
        endpoints: {
          ep1: { in: true }
        }
      },
      owner
    );

    it('json', () =>
      assert.deepEqual(s2.toJSON(), {
        name: 'service',
        type: 'service',
        endpoints: {
          ep1: { in: true }
        }
      }));
  });

  describe('creation with logLevel', () => {
    const s2 = new Service(
      {
        key1: 'value1',
        logLevel: 'trace'
      },
      owner
    );

    it('has given logLevel', () => assert.equal(s2.logLevel, 'trace'));

    describe('can log', () => {
      s2.error('some error');
      s2.error({
        key1: 'value1'
      });
    });

    describe('invalid loglevel', () => {
      const s2 = new Service({
        key1: 'value1',
        logLevel: 'na sowas'
      });

      it('fallback to info logLevel', () => assert.equal(s2.logLevel, 'info'));
    });
  });

  describe('derived service', () => {
    describe('creation', () => {
      const s2 = new MyService(
        {
          key3: 'value3',
          key4: 4
        },
        owner
      );

      it('has a type', () => assert.equal(s2.type, 'my-service'));
      it('has a description', () =>
        assert.equal(s2.description, 'my description'));
      it('has a toString', () =>
        assert.equal(s2.toString(), 'my-service: stopped'));
      it('has additional configuration attribute key3', () =>
        assert.equal(s2.configurationAttributes.key3.name, 'key3'));
      it('has values', () => {
        assert.equal(s2.key3, 'value3');
        assert.equal(s2.key4, 4);
      });
    });

    describe('configuration', () => {
      const s2 = new MyService({
        key7: 1
      });

      const se = new endpoint.SendEndpoint('se', {
        get name() {
          return 'a';
        }
      });
      se.connected = s2.endpoints.config;

      it('re configure', () =>
        se
          .receive({
            logLevel: 'trace',
            key2: 77
          })
          .then(f => {
            assert.equal(s2.logLevel, 'trace');
            assert.equal(s2.key2, 77);
          }));

      describe('timeout', () => {
        it('can change start timeout', () =>
          s2
            .configure({
              timeout: {
                start: 123.45
              }
            })
            .then(() => assert.equal(s2.timeout.start, 123.45)));
      });
    });

    describe('states', () => {
      const s1 = new MyService(
        {
          key1: 'value1',
          key2: 2
        },
        owner
      );
      it('can be restartIfRunning (when stopped)', () =>
        s1.restartIfRunning().then(() => assert.equal(s1.state, 'stopped')));

      it('can be started', () =>
        s1.start().then(() => assert.equal(s1.state, 'running')));
      it('can be restartIfRunning', () =>
        s1.restartIfRunning().then(() => assert.equal(s1.state, 'running')));
      it('can be restarted', () =>
        s1.restart().then(() => assert.equal(s1.state, 'running')));

      const s2 = new MyService({
        key1: 'value1',
        key2: 2
      });

      it('derived state untouched', () => assert.equal(s2.state, 'stopped'));

      it('can be stopped', () =>
        s1.stop().then(() => assert.equal(s1.state, 'stopped')));
    });
  });
});