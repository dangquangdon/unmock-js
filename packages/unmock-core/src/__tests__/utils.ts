import fs from "fs";
import jsYaml from "js-yaml";
import path from "path";
import { ISerializedRequest, ISerializedResponse } from "../interfaces";
import { OpenAPIObject } from "../service/interfaces";
import { ServiceCore } from "../service/serviceCore";

export const PetStoreSpecLocation = path.join(
  __dirname,
  "__unmock__",
  "petstore",
  "spec.yaml",
);

const petStoreYamlString: string = fs.readFileSync(
  PetStoreSpecLocation,
  "utf-8",
);

export const PetStoreSchema = jsYaml.safeLoad(petStoreYamlString);

export const schemaBase: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: { name: "MIT" },
  },
  paths: {},
};

// define some service populators that match IOASMappingGenerator type
export const PetStoreServiceWithEmptyPaths = new ServiceCore({
  schema: schemaBase,
  name: "petstore",
});

export const PetStoreServiceWithEmptyResponses = new ServiceCore({
  name: "petstore",
  schema: { ...schemaBase, paths: { "/pets": { get: { responses: {} } } } },
});

export const PetStoreServiceWithPseudoResponses = new ServiceCore({
  name: "petstore",
  schema: {
    ...schemaBase,
    paths: {
      "/pets": {
        get: {
          responses: {
            200: {
              description: "Mock response",
              content: {
                "application/json": {
                  schema: {},
                },
              },
            },
          },
        },
      },
    },
  },
});

export const PetstoreServiceWithDynamicPaths = (
  params: any,
  ...additionalPathElement: string[]
) => {
  const path = `/pets/{petId}${additionalPathElement.join("/")}`;
  return new ServiceCore({
    schema: {
      ...schemaBase,
      paths: {
        [path]: {
          get: {
            summary: "Info for a specific pet",
            operationId: "showPetById",
            tags: ["pets"],
            ...params,
            responses: {
              200: {
                content: {
                  "application/json": {
                    schema: {},
                  },
                },
              },
            },
          },
        },
      },
    },
    name: "petstore",
  });
};

export const testRequest: ISerializedRequest = {
  method: "get",
  path: "/v3",
  host: "api.github.com",
  protocol: "https",
};

export const testResponse: ISerializedResponse = {
  statusCode: 200,
  body: "OK",
};
