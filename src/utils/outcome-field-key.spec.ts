import {describe, expect, it} from "vitest"
import type {TypeformField} from "../types/types"
import {
    buildOutcomeRecordFromRows,
    countOutcomeTitleOccurrences,
    findFieldByRefOrId,
    outcomeKeyForTitleAndRef,
    resolveOutcomeFieldTitle,
} from "./outcome-field-key"

describe("findFieldByRefOrId", () => {
    const fields: TypeformField[] = [
        {id: "id_1", ref: "ref_1", title: "Name", type: "short_text"},
        {
            id: "id_group",
            ref: "ref_group",
            title: "Address",
            type: "group",
            properties: {
                fields: [{id: "id_city", ref: "ref_city", title: "City", type: "short_text"}],
            },
        },
    ]

    it("finds a top-level field by ref", () => {
        expect(findFieldByRefOrId(fields, "ref_1", "missing")?.title).toBe("Name")
    })

    it("finds a top-level field by id when ref does not match", () => {
        expect(findFieldByRefOrId(fields, "missing", "id_1")?.title).toBe("Name")
    })

    it("finds a nested field inside a group", () => {
        expect(findFieldByRefOrId(fields, "ref_city", "missing")?.title).toBe("City")
    })

    it("returns undefined when nothing matches", () => {
        expect(findFieldByRefOrId(fields, "nope", "nope")).toBeUndefined()
    })

    it("returns undefined for empty or missing field lists", () => {
        expect(findFieldByRefOrId([], "ref_1", "id_1")).toBeUndefined()
        expect(findFieldByRefOrId(undefined, "ref_1", "id_1")).toBeUndefined()
    })
})

describe("resolveOutcomeFieldTitle", () => {
    it("returns the title when present", () => {
        expect(resolveOutcomeFieldTitle("Email", "ref_1")).toBe("Email")
    })

    it("falls back to the ref when the title is empty", () => {
        expect(resolveOutcomeFieldTitle("   ", "ref_1")).toBe("ref_1")
        expect(resolveOutcomeFieldTitle(undefined, "ref_1")).toBe("ref_1")
    })

    it("falls back to 'Unknown field' when title and ref are empty", () => {
        expect(resolveOutcomeFieldTitle(undefined, "")).toBe("Unknown field")
    })
})

describe("countOutcomeTitleOccurrences", () => {
    it("counts how many times each title appears", () => {
        const counts = countOutcomeTitleOccurrences([
            {title: "Email"},
            {title: "Email"},
            {title: "Name"},
        ])
        expect(counts.get("Email")).toBe(2)
        expect(counts.get("Name")).toBe(1)
    })
})

describe("outcomeKeyForTitleAndRef", () => {
    it("keeps the bare title when it is unique", () => {
        const counts = new Map([["Email", 1]])
        expect(outcomeKeyForTitleAndRef("Email", "ref_1", counts)).toBe("Email")
    })

    it("appends the ref when the title is duplicated", () => {
        const counts = new Map([["Email", 2]])
        expect(outcomeKeyForTitleAndRef("Email", "ref_1", counts)).toBe("Email [ref_1]")
    })
})

describe("buildOutcomeRecordFromRows", () => {
    it("keys unique titles by title alone", () => {
        const record = buildOutcomeRecordFromRows([
            {title: "Email", ref: "ref_1", value: "a@b.com"},
            {title: "Name", ref: "ref_2", value: "Jane"},
        ])
        expect(record).toEqual({Email: "a@b.com", Name: "Jane"})
    })

    it("disambiguates duplicate titles with the ref", () => {
        const record = buildOutcomeRecordFromRows([
            {title: "Email", ref: "ref_1", value: "a@b.com"},
            {title: "Email", ref: "ref_2", value: "c@d.com"},
        ])
        expect(record).toEqual({
            "Email [ref_1]": "a@b.com",
            "Email [ref_2]": "c@d.com",
        })
    })
})
