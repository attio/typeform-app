import {isComplete, isErrored} from "@attio/fetchable"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {TypeformClient} from "./typeform-client"

function formsResponse(ids: string[]) {
    return new Response(JSON.stringify({items: ids.map((id) => ({id, title: `Form ${id}`}))}), {
        status: 200,
    })
}

describe(TypeformClient, () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {})
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    describe("listForms", () => {
        it("searches Typeform for matching forms, most recently updated first", async () => {
            const fetchMock = vi.fn().mockResolvedValue(formsResponse(["a", "b"]))
            vi.stubGlobal("fetch", fetchMock)

            const result = await new TypeformClient("token").listForms({search: "house tour"})

            expect(isComplete(result) && result.value.map((form) => form.id)).toEqual(["a", "b"])
            expect(fetchMock.mock.calls[0]?.[0]).toBe(
                "https://api.typeform.com/forms?page_size=200&sort_by=last_updated_at&order_by=desc&search=house+tour"
            )
        })

        it("lists recent forms without a search filter when the query is empty", async () => {
            const fetchMock = vi.fn().mockResolvedValue(formsResponse(["a"]))
            vi.stubGlobal("fetch", fetchMock)

            await new TypeformClient("token").listForms({search: ""})

            expect(fetchMock.mock.calls[0]?.[0]).toBe(
                "https://api.typeform.com/forms?page_size=200&sort_by=last_updated_at&order_by=desc"
            )
        })

        it("returns a rate limit error when Typeform responds 429", async () => {
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 429})))

            const result = await new TypeformClient("token").listForms({search: ""})

            expect(isErrored(result) && result.error[0]?.code).toBe("RATE_LIMITED")
        })

        it("returns an unexpected error when Typeform responds with an unrecognised error", async () => {
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 503})))

            const result = await new TypeformClient("token").listForms({search: ""})

            expect(isErrored(result) && result.error[0]?.title).toBe("Unexpected error")
            expect(console.error).toHaveBeenCalledOnce()
        })

        it("returns an unexpected error when Typeform can't be reached", async () => {
            vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))

            const result = await new TypeformClient("token").listForms({search: ""})

            expect(isErrored(result) && result.error[0]?.title).toBe("Unexpected error")
            expect(console.error).toHaveBeenCalledOnce()
        })
    })
})
