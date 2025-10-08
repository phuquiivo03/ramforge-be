import { strict as assert } from "assert";
import test from "node:test";
import { geocodeAddressToXY, geocodeAddressToObject } from "../src/services/geocoding";

function mockFetchOnce(data: unknown, ok = true): void {
  // @ts-expect-error override global fetch in tests
  global.fetch = async () => ({
    ok,
    json: async () => data,
  });
}

test("geocodeAddressToXY returns [lon, lat] when found", async () => {
  mockFetchOnce([
    { lat: "41.9028", lon: "12.4964" }, // Rome
  ]);

  const xy = await geocodeAddressToXY("Rome, Italy");
  assert.ok(xy);
  assert.equal(xy?.[0], 12.4964);
  assert.equal(xy?.[1], 41.9028);
});

test("geocodeAddressToXY returns null when not found", async () => {
  mockFetchOnce([]);
  const xy = await geocodeAddressToXY("Nonexistent Place");
  assert.equal(xy, null);
});

test("geocodeAddressToXY returns null on HTTP error", async () => {
  // @ts-expect-error override global fetch in tests
  global.fetch = async () => ({ ok: false });
  const xy = await geocodeAddressToXY("Rome, Italy");
  assert.equal(xy, null);
});

test("geocodeAddressToXY returns null on empty input", async () => {
  const xy = await geocodeAddressToXY("   ");
  assert.equal(xy, null);
});

test("geocodeAddressToObject returns {x, y}", async () => {
  mockFetchOnce([{ lat: "41.9028", lon: "12.4964" }]);
  const obj = await geocodeAddressToObject("Rome, Italy");
  assert.deepEqual(obj, { x: 12.4964, y: 41.9028 });
});
