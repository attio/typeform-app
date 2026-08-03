/**
 * Test double for the `attio/server` entrypoint. The real package only ships types (the runtime is
 * injected by the Attio build), so vitest aliases this module in. The outcome value factories are
 * dumb stubs: they tag the raw input so tests can assert what the app passed to the SDK — real
 * parsing/validation is the SDK's job, not ours. Validity checks are deliberately crude, just
 * enough to exercise the app's "invalid value" branches.
 */
export const Workflows = {
    OutcomeValue: {
        emailAddress: (value: string) =>
            value.includes("@") ? {__outcomeValue: "emailAddress" as const, value} : null,
        phoneNumber: (value: string, options?: {country_code?: string}) =>
            value.startsWith("+")
                ? {__outcomeValue: "phoneNumber" as const, value, ...options}
                : null,
        date: (value: {value: string}) => ({__outcomeValue: "date" as const, ...value}),
    },
}
