import { DSL } from "../service/dsl";
import { codeToMedia, Schema } from "../service/interfaces";

// tslint:disable: object-literal-key-quotes

const responsesWithoutProperties: codeToMedia = {
  200: {
    "application/json": {},
  },
};

const responsesWithProperties: codeToMedia = {
  200: {
    "application/json": {
      properties: {
        foo: {
          type: "integer",
        },
      },
    },
  },
};

describe("Translates top level DSL to OAS", () => {
  it("Returns undefined with undefined input", () => {
    expect(DSL.translateTopLevelToOAS({}, undefined)).toBeUndefined();
  });

  describe("Handles $times correctly", () => {
    it("Does nothing with invalid $times (0, negative, wrong type) without STRICT_MODE", () => {
      DSL.STRICT_MODE = false;
      let translated = DSL.translateTopLevelToOAS(
        { $times: 0.3 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });

      translated = DSL.translateTopLevelToOAS(
        { $times: -2 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });

      translated = DSL.translateTopLevelToOAS(
        { $times: undefined },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({ 200: { "application/json": {} } });
    });

    it("Throws on invalid $times (0) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        DSL.translateTopLevelToOAS({ $times: 0.3 }, responsesWithoutProperties);
      expect(translated).toThrow("Can't set response $times to 0.3"); // 0.3 gets rounded to 0 and throws
    });

    it("Throws on invalid $times (negative) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        DSL.translateTopLevelToOAS({ $times: -1 }, responsesWithoutProperties);
      expect(translated).toThrow("Can't set response $times to -1");
    });

    it("Throws on invalid $times (wrong type) with STRICT_MODE", () => {
      DSL.STRICT_MODE = true;
      const translated = () =>
        // @ts-ignore // uses incorrect type on purpose
        DSL.translateTopLevelToOAS({ $times: "a" }, responsesWithoutProperties);
      expect(translated).toThrow(
        "Can't set response $times with non-numeric value!",
      );
    });

    it("Adds properties when missing", () => {
      const translated = DSL.translateTopLevelToOAS(
        { $times: 1 },
        responsesWithoutProperties,
      );
      expect(translated).toEqual({
        200: {
          "application/json": {
            properties: { "x-unmock-times": { type: "unmock", default: 1 } },
          },
        },
      });
    });

    it("Adds to properties when it exists", () => {
      const translated = DSL.translateTopLevelToOAS(
        { $times: 2 },
        responsesWithProperties,
      );
      expect(translated).toEqual({
        200: {
          "application/json": {
            properties: {
              foo: { type: "integer" },
              "x-unmock-times": { type: "unmock", default: 2 },
            },
          },
        },
      });
    });
  });
});

describe("Translates non-top level DSL to OAS", () => {
  it("Returns empty translation for empty state", () => {
    expect(DSL.translateDSLToOAS({}, {})).toEqual({
      translated: {},
      cleaned: {},
    });
  });

  describe("Translates $size correctly", () => {
    let arraySchema: Schema;

    beforeEach(() => {
      arraySchema = {
        type: "array",
        items: {
          properties: {
            id: {
              type: "integer",
            },
          },
        },
      };
    });

    it("Leaves $size intact with invalid input without strict mode", () => {
      DSL.STRICT_MODE = false;
      // Test with non-numeric
      const state: { $size: any } = { $size: "a" };
      let result = DSL.translateDSLToOAS(state, arraySchema);
      expect(result.translated).toEqual({}); // Nothing was translated
      expect(result.cleaned).toEqual({ $size: "a" });
      expect(state).toEqual({ $size: "a" }); // should not be changed

      // Test with non-positive input
      state.$size = -1;
      result = DSL.translateDSLToOAS(state, arraySchema);
      expect(result.translated).toEqual({}); // Nothing was translated
      expect(result.cleaned).toEqual({ $size: -1 });
      expect(state).toEqual({ $size: -1 }); // should not be changed

      // Test with non-array input
      state.$size = 5;
      arraySchema.type = "object";
      result = DSL.translateDSLToOAS(state, arraySchema);
      expect(result.translated).toEqual({}); // Nothing was translated
      expect(result.cleaned).toEqual({ $size: 5 });
      expect(state).toEqual({ $size: 5 }); // should not be changed
    });

    it("Throws with non-numeric input in strict mode", () => {
      DSL.STRICT_MODE = true;
      const state = { $size: "a" };
      const translated = () => DSL.translateDSLToOAS(state, arraySchema);
      expect(translated).toThrow("non-numeric");
    });

    it("Throws with non-positive input in strict mode", () => {
      DSL.STRICT_MODE = true;
      const state = { $size: 0.3 }; // rounded to 0
      const translated = () => DSL.translateDSLToOAS(state, arraySchema);
      expect(translated).toThrow("non-positive");
    });

    it("Throws with non-array input in strict mode", () => {
      DSL.STRICT_MODE = true;
      const state = { $size: 3 };
      arraySchema.type = "object";
      const translated = () => DSL.translateDSLToOAS(state, arraySchema);
      expect(translated).toThrow("non-array");
    });

    it("Translates $size correctly", () => {
      const state = { $size: 3, id: 5 };
      const result = DSL.translateDSLToOAS(state, arraySchema);
      expect(state).toEqual({ $size: 3, id: 5 }); // state should not be changed
      expect(result.translated).toEqual({ maxItems: 3, minItems: 3 });
      expect(result.cleaned).toEqual({ id: 5 }); // $size element should be removed
    });
  });
});

describe("Acts on top level DSL in OAS", () => {
  describe("Acts on $times correctly", () => {
    let states: codeToMedia;
    beforeEach(
      () =>
        (states = {
          200: {
            "application/json": {
              properties: {
                "x-unmock-times": { type: "unmock", default: 2 },
              },
            },
          },
        }),
    );

    it("Removes $times in returned copy", () => {
      const copy = DSL.actTopLevelFromOAS(states);
      // removes properties as nothing's there anymore
      expect(copy.parsed).toEqual({ 200: { "application/json": {} } });
      expect(copy.newState).toEqual({
        200: {
          "application/json": {
            properties: { "x-unmock-times": { type: "unmock", default: 1 } },
          },
        },
      });
    });

    it("Decreases $times in new state", () => {
      const { newState } = DSL.actTopLevelFromOAS(states);
      expect(newState["200"]["application/json"].properties).toEqual({
        "x-unmock-times": { type: "unmock", default: 1 },
      });
    });

    it("Removes $times from new state", () => {
      let result = DSL.actTopLevelFromOAS(states);
      result = DSL.actTopLevelFromOAS(result.newState);
      expect(result.newState["200"]["application/json"]).toBeUndefined(); // media type is removed if its now empty
      expect(result.parsed).toEqual({ 200: { "application/json": {} } });
    });
  });
});
