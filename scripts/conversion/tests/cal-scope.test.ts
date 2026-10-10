import assert from "node:assert/strict"
import test from "node:test"

import {
  CalScopeConfigError,
  expectedCalScope,
  verifyCalBookingScope,
} from "../../../lib/conversion/cal-scope.ts"

const expected = {
  eventTypeId: "8675309",
  eventTypeSlug: "call",
  organizerUsername: "axmedia",
}

test("requires exact event type ID, slug, and organizer", () => {
  assert.equal(verifyCalBookingScope(expected, expected), true)
  assert.equal(verifyCalBookingScope({ ...expected, eventTypeId: "8675310" }, expected), false)
  assert.equal(verifyCalBookingScope({ ...expected, eventTypeSlug: "another-call" }, expected), false)
  assert.equal(verifyCalBookingScope({ ...expected, organizerUsername: "another-owner" }, expected), false)
})

test("fails closed when any Cal scope configuration is absent or malformed", () => {
  assert.deepEqual(expectedCalScope({
    CAL_EVENT_TYPE_ID: "8675309",
    CAL_EVENT_TYPE_SLUG: "CALL",
    CAL_ORGANIZER_USERNAME: "AxMedia",
  }), expected)
  assert.throws(() => expectedCalScope({
    CAL_EVENT_TYPE_ID: "",
    CAL_EVENT_TYPE_SLUG: "call",
    CAL_ORGANIZER_USERNAME: "axmedia",
  }), CalScopeConfigError)
})
