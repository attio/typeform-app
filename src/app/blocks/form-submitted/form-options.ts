import {isErrored} from "@attio/fetchable"
import type {PlainComboboxOptionsProvider} from "attio/client"
import getForm from "../../../typeform/get-form.server"
import listForms from "../../../typeform/list-forms.server"
import {typeformApiErrorUserMessage} from "../../../typeform/types/errors"

/** The combobox searches on every keystroke, and Typeform allows 2 requests per second. */
const SEARCH_DEBOUNCE_MS = 500

type FormOption = {value: string; label: string}

export function createFormOptions(): PlainComboboxOptionsProvider {
    let latestSearchId = 0
    let lastResults: FormOption[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    let resolvePrevious: (() => void) | undefined

    /** Resolves once typing pauses. Earlier waiters resolve immediately. */
    const debounce = () =>
        new Promise<void>((resolve) => {
            resolvePrevious?.()
            // The client runtime's clearTimeout throws on a non-number handle.
            if (timer !== undefined) {
                clearTimeout(timer)
            }
            resolvePrevious = resolve
            timer = setTimeout(resolve, SEARCH_DEBOUNCE_MS)
        })

    return {
        async search(query) {
            const searchId = ++latestSearchId
            await debounce()
            if (searchId !== latestSearchId) {
                return lastResults
            }

            const result = await listForms({search: query.trim()})
            if (searchId !== latestSearchId) {
                return lastResults
            }

            if (isErrored(result)) {
                return [{label: typeformApiErrorUserMessage(result.error), value: "error"}]
            }

            lastResults = result.value.map((form) => ({value: form.id, label: form.title}))
            return lastResults
        },
        async getOption(value) {
            const result = await getForm({formId: value})

            if (isErrored(result)) {
                const formNotFound = result.error.some((error) => error.code === "INVALID_RESOURCE")
                return {
                    label: formNotFound
                        ? "Unknown form"
                        : typeformApiErrorUserMessage(result.error),
                }
            }

            return {label: result.value.title}
        },
    }
}
