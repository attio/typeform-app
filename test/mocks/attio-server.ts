/**
 * Test double for the `attio/server` entrypoint. The real package only ships types (the runtime is
 * injected by the Attio build), so vitest aliases this module in. The outcome value factories return
 * tagged plain objects so tests can assert how webhook answers are wrapped.
 */

type EmailAddressArgs = {
    original: string
    normalized: string
    domain: string
    root_domain: string
    local_specifier: string
}

type PhoneNumberArgs = {
    original: string
    normalized: string
    country_code: string
}

export const Workflows = {
    OutcomeValue: {
        emailAddress: (value: EmailAddressArgs) => ({
            __outcomeValue: "emailAddress" as const,
            ...value,
        }),
        date: (value: {value: string}) => ({
            __outcomeValue: "date" as const,
            value: value.value,
        }),
        phoneNumber: (value: PhoneNumberArgs) => ({
            __outcomeValue: "phoneNumber" as const,
            ...value,
        }),
    },
}
