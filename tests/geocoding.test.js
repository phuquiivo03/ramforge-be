"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const node_test_1 = __importDefault(require("node:test"));
const geocoding_1 = require("../src/services/geocoding");
function mockFetchOnce(data, ok = true) {
    // @ts-expect-error override global fetch in tests
    global.fetch = async () => ({
        ok,
        json: async () => data,
    });
}
(0, node_test_1.default)("geocodeAddressToXY returns [lon, lat] when found", async () => {
    mockFetchOnce([
        { lat: "41.9028", lon: "12.4964" }, // Rome
    ]);
    const xy = await (0, geocoding_1.geocodeAddressToXY)("Rome, Italy");
    assert_1.strict.ok(xy);
    assert_1.strict.equal(xy?.[0], 12.4964);
    assert_1.strict.equal(xy?.[1], 41.9028);
});
(0, node_test_1.default)("geocodeAddressToXY returns null when not found", async () => {
    mockFetchOnce([]);
    const xy = await (0, geocoding_1.geocodeAddressToXY)("Nonexistent Place");
    assert_1.strict.equal(xy, null);
});
(0, node_test_1.default)("geocodeAddressToXY returns null on HTTP error", async () => {
    // @ts-expect-error override global fetch in tests
    global.fetch = async () => ({ ok: false });
    const xy = await (0, geocoding_1.geocodeAddressToXY)("Rome, Italy");
    assert_1.strict.equal(xy, null);
});
(0, node_test_1.default)("geocodeAddressToXY returns null on empty input", async () => {
    const xy = await (0, geocoding_1.geocodeAddressToXY)("   ");
    assert_1.strict.equal(xy, null);
});
(0, node_test_1.default)("geocodeAddressToObject returns {x, y}", async () => {
    mockFetchOnce([{ lat: "41.9028", lon: "12.4964" }]);
    const obj = await (0, geocoding_1.geocodeAddressToObject)("Rome, Italy");
    assert_1.strict.deepEqual(obj, { x: 12.4964, y: 41.9028 });
});
//# sourceMappingURL=geocoding.test.js.map