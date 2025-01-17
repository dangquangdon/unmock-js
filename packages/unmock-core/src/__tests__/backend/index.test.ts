import axios from "axios";
import path from "path";
import { UnmockPackage, IService, sinon } from "../../";
import NodeBackend from "../../backend";

const servicesDirectory = path.join(__dirname, "..", "__unmock__");

describe("Node.js interceptor", () => {
  describe("with petstore in place", () => {
    let nodeInterceptor: NodeBackend;

    beforeAll(() => {
      nodeInterceptor = new NodeBackend({ servicesDirectory });
      nodeInterceptor.initialize({
        flaky: () => false,
        isWhitelisted: (_: string) => false,
        log: (_: string) => undefined,
        useInProduction: () => false,
      });
    });

    afterAll(() => {
      nodeInterceptor.reset();
    });

    test("gets successful response for valid request", async () => {
      const response = await axios("http://petstore.swagger.io/v1/pets");
      expect(response.status).toBe(200);
      const data = response.data;
      // As no specific code was set, we expect either valid response
      // or an error response (based on service specification)

      if (data.message !== undefined) {
        // error message chosen at random
        expect(typeof data.code === "number").toBeTruthy();
        expect(typeof data.message === "string").toBeTruthy();
      } else if (typeof data !== "string") {
        expect(data.length).toBeGreaterThan(0);
        expect(
          data.every(
            (pet: any) =>
              typeof pet.id === "number" && typeof pet.name === "string",
          ),
        ).toBeTruthy();
      }
    });

    test("should get successful response for post request", async () => {
      const response = await axios.post(
        "http://petstore.swagger.io/v1/pets",
        {},
      );
      expect(response.data).toBe("");
    });

    test("emits an error for unknown url", async () => {
      try {
        await axios("http://example.org");
      } catch (err) {
        expect(err.message).toContain("No matching template");
        return;
      }
      throw new Error("Should not get here");
    });

    test("respects cancellation", async () => {
      const cancelTokenSource = axios.CancelToken.source();
      setImmediate(() => cancelTokenSource.cancel());
      try {
        await axios("http://example.org", {
          cancelToken: cancelTokenSource.token,
        });
      } catch (err) {
        expect(axios.isCancel(err)).toBe(true);
        return;
      }
      throw new Error("Was supposed to throw a cancellation error");
    });
  });
});

describe("Unmock node package", () => {
  const nodeInterceptor = new NodeBackend({ servicesDirectory });
  const unmock = new UnmockPackage(nodeInterceptor);
  describe("service spy", () => {
    let petstore: IService;
    beforeAll(() => {
      petstore = unmock.on().services.petstore;
    });
    beforeEach(() => {
      petstore.reset();
    });
    test("should track a successful request-response pair", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      sinon.assert.calledOnce(petstore.spy);
      sinon.assert.calledWith(petstore.spy, sinon.match({ method: "POST" }));
      expect(petstore.spy.firstCall.returnValue).toEqual(
        expect.objectContaining({ statusCode: 201 }),
      );
    });
    test("should not have tracked calls after reset", async () => {
      await axios.post("http://petstore.swagger.io/v1/pets", {});
      petstore.reset();
      sinon.assert.notCalled(petstore.spy);
    });
  });
});
