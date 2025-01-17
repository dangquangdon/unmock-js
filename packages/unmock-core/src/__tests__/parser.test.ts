import fs from "fs";
import path from "path";
import { IServiceDef } from "..";
import { ServiceParser } from "../service/parser";

const absPath = path.join(__dirname, "__unmock__", "petstore", "spec.yaml");
const petStoreYamlString: string = fs.readFileSync(absPath, "utf-8");

describe("Service parser", () => {
  it("creates a service from petstore yaml", () => {
    const serviceDef: IServiceDef = {
      absolutePath: absPath,
      directoryName: "petstore",
      serviceFiles: [
        {
          basename: "index.yaml",
          contents: petStoreYamlString,
        },
      ],
    };
    const service = ServiceParser.parse(serviceDef);
    expect(service).toBeDefined();
    expect(service.name).toBe("petstore");
    expect(service.schema).toHaveProperty("openapi");
    expect(service.schema).toHaveProperty("info");
    expect(service.schema.openapi).toEqual("3.0.0");
  });

  it("fails for json files", () => {
    const serviceDef: IServiceDef = {
      absolutePath: absPath,
      directoryName: "petstore",
      serviceFiles: [
        {
          basename: "something.json",
          contents: `{ "openapi": "3.0.0" }`,
        },
      ],
    };
    expect(() => ServiceParser.parse(serviceDef)).toThrow(/Cannot find known/);
  });
});
