import test from "ava";
import { TestLogger } from "./util.mjs";

import { SendEndpoint, ReceiveEndpoint } from "@kronos-integration/endpoint";
import Service from "../src/service.mjs";
import ServiceProviderMixin from "../src/service-provider-mixin.mjs";
import { InitializationContext } from "../src/initialization-context.mjs";

class Owner extends ServiceProviderMixin(Service, TestLogger) {
  get name() {
    return "owner";
  }

  get myProperty() {
    return 77;
  }

  async myMethod() {
    return 78;
  }
}

test("outEndpoints", t => {
  const o = new Owner();

  t.truthy(o.endpoints.log.receive);

  t.deepEqual(o.outEndpoints, [o.endpoints.log]);
});

test("inEndpoints", t => {
  const o = new Owner();
  t.deepEqual(
    o.inEndpoints.map(e => e.name),
    ["config", "command"]
  );
});

test("endpointForExpression simple", t => {
  const o = new Owner();
  const s1 = new SendEndpoint("s1");
  const r1 = new ReceiveEndpoint("r1");

  o.addEndpoint(s1);
  o.addEndpoint(r1);

  t.deepEqual(o.endpointForExpression("r1"), r1);
  t.deepEqual(o.endpointForExpression("s1"), s1);
});

test("endpointForExpression service", t => {
  const o = new Owner();

  t.is(o.endpointForExpression("service(config).command").name, "command");
  t.is(o.endpointForExpression("service(logger).log").name, "log");
});

test("endpointForExpression service throwing", t => {
  const o = new Owner();

  const error = t.throws(() => {
    o.endpointForExpression("service(something).something");
  }, Error);

  t.is(
    error.message,
    "Service 'something' not found in owner (logger,config,owner)"
  );
});

test("endpointForExpression service ignore throwing", t => {
  const o = new Owner();
  t.is(
    o.endpointForExpression("service(something).something", false, false),
    undefined
  );
});

test("endpointForExpression throwing", t => {
  const o = new Owner();
  const r1 = new ReceiveEndpoint("r1");

  o.addEndpoint(r1);

  const error = t.throws(() => {
    o.endpointForExpression("r2");
  }, Error);

  t.is(error.message, "Endpoint 'r2' not found in owner");
});

test("endpointFromConfig simple connected", t => {
  const o = new Owner();
  const ic = new InitializationContext(o);

  const r1 = new ReceiveEndpoint("r1");
  o.addEndpoint(r1);

  const e = o.createEndpointFromConfig("e", { connected: "r1" }, ic);

  t.is(e.name, "e");
  t.is(e.connected.name, "r1");
});

test("endpointFromConfig foreign connected", t => {
  const o = new Owner();
  const ic = new InitializationContext(o);

  const e = o.createEndpointFromConfig(
    "e",
    { connected: "service(logger).log" },
    ic
  );

  t.is(e.name, "e");
  t.is(e.connected.name, "log");
  t.is(e.connected.owner.name, "logger");
});

test("endpointFromConfig foreign connected expression only", t => {
  const o = new Owner();
  const ic = new InitializationContext(o);

  const e = o.createEndpointFromConfig("e", "service(logger).log", ic);

  t.is(e.name, "e");
  t.is(e.connected.name, "log");
  t.is(e.connected.owner.name, "logger");
});

test("endpointFromConfig real connected", t => {
  const dummyLogReceiver = new ReceiveEndpoint("log", {
    endpointIdentifier(ep) {
      return undefined; // prevent target;
    }
  });

  dummyLogReceiver.receive = entry => {
    console.log(safeStringify(entry));
  };

  const o = new Owner();
  const ic = new InitializationContext(o);

  const e = o.createEndpointFromConfig(
    "e",
    { connected: dummyLogReceiver },
    ic
  );

  t.is(e.name, "e");
  t.is(e.connected.name, "log");
});

test("endpointFromConfig receive property", async t => {
  const o = new Owner();
  const ic = new InitializationContext(o);

  const e = o.createEndpointFromConfig("e", { receive: "myProperty" }, ic);

  t.is(await e.receive(), 77);
});

test("endpointFromConfig receive method", async t => {
  const o = new Owner();
  const ic = new InitializationContext(o);
  const e = o.createEndpointFromConfig("e", { receive: "myMethod" }, ic);

  t.is(await e.receive(), 78);
});
