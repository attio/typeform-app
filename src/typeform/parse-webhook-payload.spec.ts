import {describe, expect, it, vi} from "vitest"
import type {TypeformForm} from "../types/types"
import {buildWebhookOutputsFromParsed, parseWebhookBody} from "./parse-webhook-payload"

const form: TypeformForm = {id: "form_1", title: "Test form", fields: []}

function field(ref: string, type: string, title: string) {
    return {field: {id: `id_${ref}`, ref, type, title}}
}

function parse(answers: Array<Record<string, unknown>>, hidden?: Record<string, string>) {
    const data = parseWebhookBody({
        event_type: "form_response",
        form_response: {
            form_id: "form_1",
            answers,
            ...(hidden ? {hidden} : {}),
        },
    })
    if (data === null) {
        throw new Error("expected webhook body to parse")
    }
    return data
}

describe("parseWebhookBody", () => {
    it("returns null for an invalid payload", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        expect(parseWebhookBody({event_type: "nope"})).toBeNull()
        spy.mockRestore()
    })

    it("parses a valid payload", () => {
        const data = parseWebhookBody({
            event_type: "form_response",
            form_response: {form_id: "form_1", answers: []},
        })
        expect(data?.form_response.form_id).toBe("form_1")
    })
})

describe("buildWebhookOutputsFromParsed", () => {
    it("wraps email answers in a structured email address value", () => {
        const data = parse([
            {...field("ref_email", "email", "Email"), type: "email", email: "User@Example.com"},
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({
            Email: {
                __outcomeValue: "emailAddress",
                original: "User@Example.com",
                normalized: "user@example.com",
                domain: "example.com",
                root_domain: "example.com",
                local_specifier: "user",
            },
        })
    })

    it("omits email answers that are not valid addresses", () => {
        const data = parse([
            {...field("ref_email", "email", "Email"), type: "email", email: "not-an-email"},
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({})
    })

    it("wraps date answers in a structured date value", () => {
        const data = parse([
            {...field("ref_date", "date", "When"), type: "date", date: "2024-01-15"},
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({
            When: {__outcomeValue: "date", value: "2024-01-15"},
        })
    })

    it("wraps phone number answers in a structured phone number value", () => {
        const data = parse([
            {
                ...field("ref_phone", "phone_number", "Phone"),
                type: "phone_number",
                phone_number: "+12025551234",
            },
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({
            Phone: {
                __outcomeValue: "phoneNumber",
                original: "+12025551234",
                normalized: "+12025551234",
                country_code: "US",
            },
        })
    })

    it("omits phone number answers that are invalid", () => {
        const data = parse([
            {
                ...field("ref_phone", "phone_number", "Phone"),
                type: "phone_number",
                phone_number: "5551234567",
            },
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({})
    })

    it("passes text answers through unchanged", () => {
        const data = parse([
            {...field("ref_text", "short_text", "Name"), type: "text", text: "Jane Doe"},
        ])

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({Name: "Jane Doe"})
    })

    it("merges hidden fields without overriding answers", () => {
        const data = parse(
            [{...field("ref_text", "short_text", "Name"), type: "text", text: "Jane"}],
            {utm_source: "newsletter"}
        )

        expect(buildWebhookOutputsFromParsed(data, form)).toEqual({
            Name: "Jane",
            utm_source: "newsletter",
        })
    })
})

describe("buildWebhookOutputsFromParsed — contact_info", () => {
    const contactInfoForm: TypeformForm = {
        id: "form_1",
        title: "Test form",
        fields: [
            {
                id: "ci_id",
                ref: "ci_ref",
                title: "Contact",
                type: "contact_info",
                properties: {
                    fields: [
                        {id: "fn_id", ref: "first_name", title: "First name", type: "short_text"},
                        {id: "ln_id", ref: "last_name", title: "Last name", type: "short_text"},
                        {id: "em_id", ref: "em_ref", title: "Email", type: "email"},
                        {id: "ph_id", ref: "ph_ref", title: "Phone number", type: "phone_number"},
                        {id: "co_id", ref: "company", title: "Company", type: "short_text"},
                        {id: "cy_id", ref: "country", title: "Country", type: "short_text"},
                    ],
                },
            },
        ],
    }

    function contactInfoAnswer(
        overrides: Partial<{
            first_name: string
            last_name: string
            email: string
            phone_number: string
            company: string
            country: string
        }> = {}
    ) {
        return {
            field: {id: "ci_id", ref: "ci_ref", type: "contact_info"},
            type: "contact_info",
            contact_info: {
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                phone_number: "+12025551234",
                company: "Acme",
                country: "US",
                ...overrides,
            },
        }
    }

    it("expands contact_info into one row per sub-field with prefixed keys", () => {
        const data = parse([contactInfoAnswer()])

        expect(buildWebhookOutputsFromParsed(data, contactInfoForm)).toEqual({
            "Contact - First name": "John",
            "Contact - Last name": "Doe",
            "Contact - Email": {
                __outcomeValue: "emailAddress",
                original: "john@example.com",
                normalized: "john@example.com",
                domain: "example.com",
                root_domain: "example.com",
                local_specifier: "john",
            },
            "Contact - Phone number": {
                __outcomeValue: "phoneNumber",
                original: "+12025551234",
                normalized: "+12025551234",
                country_code: "US",
            },
            "Contact - Company": "Acme",
            "Contact - Country": "US",
        })
    })

    it("maps the country sub-field when present", () => {
        const data = parse([contactInfoAnswer({country: "GB"})])

        expect(buildWebhookOutputsFromParsed(data, contactInfoForm)["Contact - Country"]).toBe("GB")
    })

    it("skips sub-fields absent from the contact_info answer", () => {
        const data = parse([contactInfoAnswer({company: undefined})])

        const outputs = buildWebhookOutputsFromParsed(data, contactInfoForm)

        expect("Contact - Company" in outputs).toBe(false)
        expect("Contact - First name" in outputs).toBe(true)
    })

    it("omits contact_info email sub-field when email is invalid", () => {
        const data = parse([contactInfoAnswer({email: "not-an-email"})])

        const outputs = buildWebhookOutputsFromParsed(data, contactInfoForm)

        expect("Contact - Email" in outputs).toBe(false)
    })

    it("omits contact_info phone sub-field when phone is invalid", () => {
        const data = parse([contactInfoAnswer({phone_number: "5551234567"})])

        const outputs = buildWebhookOutputsFromParsed(data, contactInfoForm)

        expect("Contact - Phone number" in outputs).toBe(false)
    })

    it("produces no rows when the form has no sub-fields for the contact_info block", () => {
        const formWithNoSubfields: TypeformForm = {
            id: "form_1",
            title: "Test",
            fields: [{id: "ci_id", ref: "ci_ref", title: "Contact", type: "contact_info"}],
        }
        const data = parse([contactInfoAnswer()])

        expect(buildWebhookOutputsFromParsed(data, formWithNoSubfields)).toEqual({})
    })
})

describe("buildWebhookOutputsFromParsed — individual sub-field answers inside containers", () => {
    it("prefixes contact_info sub-field answers with the parent block title", () => {
        const form: TypeformForm = {
            id: "form_1",
            title: "Test",
            fields: [
                {
                    id: "ci_id",
                    ref: "ci_ref",
                    title: "Contact",
                    type: "contact_info",
                    properties: {
                        fields: [
                            {id: "fn_id", ref: "fn_ref", title: "First name", type: "short_text"},
                            {id: "em_id", ref: "em_ref", title: "Email", type: "email"},
                            {
                                id: "ph_id",
                                ref: "ph_ref",
                                title: "Phone number",
                                type: "phone_number",
                            },
                        ],
                    },
                },
            ],
        }

        const data = parse([
            {...field("fn_ref", "short_text", "First name"), type: "text", text: "John"},
            {...field("em_ref", "email", "Email"), type: "email", email: "john@example.com"},
            {
                ...field("ph_ref", "phone_number", "Phone number"),
                type: "phone_number",
                phone_number: "+12025551234",
            },
        ])

        const outputs = buildWebhookOutputsFromParsed(data, form)

        expect(outputs["Contact - First name"]).toBe("John")
        expect(outputs["Contact - Email"]).toMatchObject({
            __outcomeValue: "emailAddress",
            normalized: "john@example.com",
        })
        expect(outputs["Contact - Phone number"]).toMatchObject({
            __outcomeValue: "phoneNumber",
        })
        expect("First name" in outputs).toBe(false)
        expect("Email" in outputs).toBe(false)
    })

    it("prefixes group sub-field answers with the parent group title", () => {
        const form: TypeformForm = {
            id: "form_1",
            title: "Test",
            fields: [
                {
                    id: "g_id",
                    ref: "g_ref",
                    title: "Address",
                    type: "group",
                    properties: {
                        fields: [{id: "c_id", ref: "c_ref", title: "City", type: "short_text"}],
                    },
                },
            ],
        }

        const data = parse([
            {...field("c_ref", "short_text", "City"), type: "text", text: "London"},
        ])

        const outputs = buildWebhookOutputsFromParsed(data, form)

        expect(outputs["Address - City"]).toBe("London")
        expect("City" in outputs).toBe(false)
    })

    it("does not prefix top-level field answers", () => {
        const form: TypeformForm = {
            id: "form_1",
            title: "Test",
            fields: [{id: "n_id", ref: "n_ref", title: "Name", type: "short_text"}],
        }

        const data = parse([{...field("n_ref", "short_text", "Name"), type: "text", text: "Jane"}])

        const outputs = buildWebhookOutputsFromParsed(data, form)

        expect(outputs.Name).toBe("Jane")
    })
})
