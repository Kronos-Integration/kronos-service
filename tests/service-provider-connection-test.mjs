import test from "ava";
import {
  TestService,
  TestServiceWithoutAdditionalEndpoints,
  makeServices
} from "./util.mjs";

test("declare services", async t => {
  const sp = await makeServices();

  const [s3, s2, s4] = await sp.declareServices(
    {
      s3: {
        type: TestService,
        key3: 2,
        endpoints: {
          testIn: { receive: "testReceive" }
        }
      },
      s2: {
        type: TestService,
        endpoints: {
          testOut: { connected: "service(s3).testIn" }
        }
      },
      s4: {
        type: TestServiceWithoutAdditionalEndpoints
      }
    },
    true
  );

  t.is(s2.name, "s2");
  t.is(s3.name, "s3");
  t.is(s4.name, "s4");

  t.is(s2.type, "test");
  t.is(s3.type, "test");
  t.is(s4.type, "test-without-additional-endpoints");

  t.is(s3.key3, 2);

  t.true(s2.endpoints.testOut.isConnected);
  t.is(s2.endpoints.testOut.otherEnd.name, 'testIn');

  //t.true(s3.endpoints.testIn.isConnected);
});