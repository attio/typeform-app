import {complete, errored} from "@attio/fetchable"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {createFormOptions} from "./form-options"

const {listForms} = vi.hoisted(() => ({listForms: vi.fn()}))

vi.mock("../../../typeform/list-forms.server", () => ({default: listForms}))
vi.mock("../../../typeform/get-form.server", () => ({default: vi.fn()}))

/** Well inside the debounce window, so a burst of keystrokes counts as one search. */
const KEYSTROKE_DELAY_MS = 80

function forms(...titles: string[]) {
    return complete(titles.map((title) => ({id: `id-${title}`, title})))
}

function options(...titles: string[]) {
    return titles.map((title) => ({value: `id-${title}`, label: title}))
}

describe(createFormOptions, () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.resetAllMocks()
    })

    describe("search", () => {
        it("only searches Typeform once the user stops typing", async () => {
            listForms.mockResolvedValue(forms("House Induction Tour"))
            const formOptions = createFormOptions()

            const searches = []
            for (const query of ["H", "Hou", "House"]) {
                searches.push(formOptions.search(query))
                await vi.advanceTimersByTimeAsync(KEYSTROKE_DELAY_MS)
            }
            expect(listForms).not.toHaveBeenCalled()

            await vi.runAllTimersAsync()
            const [first, second, last] = await Promise.all(searches)

            expect(listForms).toHaveBeenCalledOnce()
            expect(listForms).toHaveBeenCalledWith({search: "House"})
            expect(first).toEqual([])
            expect(second).toEqual([])
            expect(last).toEqual(options("House Induction Tour"))
        })

        it("settles a superseded search as soon as a newer one starts", async () => {
            const formOptions = createFormOptions()
            let settled = false

            void formOptions.search("H").then(() => (settled = true))
            void formOptions.search("Ho")
            await vi.advanceTimersByTimeAsync(0)

            expect(settled).toBe(true)
            expect(listForms).not.toHaveBeenCalled()
        })

        it("keeps showing the previous results while the user is still typing", async () => {
            listForms.mockResolvedValueOnce(forms("House Induction Tour"))
            const formOptions = createFormOptions()

            const firstSearch = formOptions.search("House")
            await vi.runAllTimersAsync()
            await firstSearch

            listForms.mockResolvedValueOnce(forms("House Tour"))
            const superseded = formOptions.search("House T")
            const latest = formOptions.search("House To")

            expect(await superseded).toEqual(options("House Induction Tour"))
            await vi.runAllTimersAsync()
            expect(await latest).toEqual(options("House Tour"))
        })

        it("ignores a search that finishes after a newer one started", async () => {
            let resolveSlowSearch: (value: ReturnType<typeof forms>) => void = () => {}
            listForms
                .mockReturnValueOnce(new Promise((resolve) => (resolveSlowSearch = resolve)))
                .mockResolvedValueOnce(forms("House Tour"))
            const formOptions = createFormOptions()

            const slow = formOptions.search("House")
            await vi.runAllTimersAsync()
            const latest = formOptions.search("House To")
            resolveSlowSearch(forms("House Induction Tour"))

            expect(await slow).toEqual([])
            await vi.runAllTimersAsync()
            expect(await latest).toEqual(options("House Tour"))
        })

        it("shows the error as an option when a search fails", async () => {
            listForms.mockResolvedValue(
                errored([
                    {title: "Rate limited", detail: "Rate limit reached.", code: "RATE_LIMITED"},
                ])
            )
            const formOptions = createFormOptions()

            const search = formOptions.search("House")
            await vi.runAllTimersAsync()

            expect(await search).toEqual([{label: "Typeform: Rate limit reached.", value: "error"}])
        })
    })
})
