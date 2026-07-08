/**
 * Test double for the `attio/client` entrypoint. The real package only ships types (the runtime is
 * injected by the Attio build), so vitest aliases this module in. The outcome schema factories return
 * tagged plain nodes so tests can assert the shape produced for each Typeform field type.
 */

type OutcomeNode = {kind: string; [key: string]: unknown}

const node = (kind: string, extra: Record<string, unknown> = {}): OutcomeNode => ({kind, ...extra})

export const Workflows = {
    OutcomeSchema: {
        string: () => node("string"),
        date: () => node("date"),
        emailAddress: () => node("emailAddress"),
        phoneNumber: () => node("phoneNumber"),
        number: () => node("number"),
        boolean: () => node("boolean"),
        array: (element: OutcomeNode) => node("array", {element}),
        struct: (entries: Record<string, OutcomeNode>) => node("struct", {entries}),
    },
}
