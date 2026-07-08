import {describe, expect, it} from "vitest"
import type {TypeformField} from "../types/types"
import {convertFieldsToOutcomeSchema} from "./convert-fields-to-outcome"

type StructNode = {kind: "struct"; entries: Record<string, {kind: string; [key: string]: unknown}>}

function entriesOf(result: ReturnType<typeof convertFieldsToOutcomeSchema>) {
    expect(result).not.toBeNull()
    return (result as unknown as StructNode).entries
}

describe("convertFieldsToOutcomeSchema", () => {
    it("returns null when there are no fields or hidden slugs", () => {
        expect(convertFieldsToOutcomeSchema([], [])).toBeNull()
    })

    it("maps each Typeform field type to the matching outcome node", () => {
        const fields: TypeformField[] = [
            {id: "1", ref: "r_text", title: "Name", type: "short_text"},
            {id: "2", ref: "r_email", title: "Email", type: "email"},
            {id: "3", ref: "r_phone", title: "Phone", type: "phone_number"},
            {id: "4", ref: "r_date", title: "Date", type: "date"},
            {id: "5", ref: "r_num", title: "Age", type: "number"},
            {id: "6", ref: "r_bool", title: "Agree", type: "yes_no"},
            {
                id: "7",
                ref: "r_multi",
                title: "Tags",
                type: "multiple_choice",
                properties: {allow_multiple_selection: true},
            },
            {id: "8", ref: "r_single", title: "Pick", type: "dropdown"},
        ]

        const entries = entriesOf(convertFieldsToOutcomeSchema(fields))

        expect(entries.Name.kind).toBe("string")
        expect(entries.Email.kind).toBe("emailAddress")
        expect(entries.Phone.kind).toBe("phoneNumber")
        expect(entries.Date.kind).toBe("date")
        expect(entries.Age.kind).toBe("number")
        expect(entries.Agree.kind).toBe("boolean")
        expect(entries.Tags.kind).toBe("array")
        expect(entries.Pick.kind).toBe("string")
    })

    it("flattens nested group fields with a title prefix", () => {
        const fields: TypeformField[] = [
            {
                id: "g",
                ref: "r_group",
                title: "Address",
                type: "group",
                properties: {
                    fields: [{id: "c", ref: "r_city", title: "City", type: "short_text"}],
                },
            },
        ]

        const entries = entriesOf(convertFieldsToOutcomeSchema(fields))

        expect(entries["Address - City"].kind).toBe("string")
    })

    it("adds hidden slugs as string nodes", () => {
        const entries = entriesOf(convertFieldsToOutcomeSchema([], ["utm_source"]))

        expect(entries.utm_source.kind).toBe("string")
    })

    it("disambiguates duplicate field titles using the ref", () => {
        const fields: TypeformField[] = [
            {id: "1", ref: "r_a", title: "Email", type: "email"},
            {id: "2", ref: "r_b", title: "Email", type: "email"},
        ]

        const entries = entriesOf(convertFieldsToOutcomeSchema(fields))

        expect(Object.keys(entries).sort()).toEqual(["Email [r_a]", "Email [r_b]"])
    })

    it("flattens contact_info sub-fields with correct outcome types", () => {
        const fields: TypeformField[] = [
            {
                id: "ci",
                ref: "r_contact",
                title: "Contact",
                type: "contact_info",
                properties: {
                    fields: [
                        {id: "fn", ref: "r_fn", title: "First name", type: "short_text"},
                        {id: "ln", ref: "r_ln", title: "Last name", type: "short_text"},
                        {id: "em", ref: "r_em", title: "Email", type: "email"},
                        {id: "ph", ref: "r_ph", title: "Phone number", type: "phone_number"},
                        {id: "co", ref: "r_co", title: "Company", type: "short_text"},
                    ],
                },
            },
        ]

        const entries = entriesOf(convertFieldsToOutcomeSchema(fields))

        expect(entries["Contact - First name"].kind).toBe("string")
        expect(entries["Contact - Last name"].kind).toBe("string")
        expect(entries["Contact - Email"].kind).toBe("emailAddress")
        expect(entries["Contact - Phone number"].kind).toBe("phoneNumber")
        expect(entries["Contact - Company"].kind).toBe("string")
    })
})
