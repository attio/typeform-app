import {describe, expect, it} from "vitest"
import {parsePhoneNumber} from "./parse-phone-number"

describe("parsePhoneNumber", () => {
    it("parses a US number in E.164 format", () => {
        expect(parsePhoneNumber("+12025551234")).toEqual({
            original: "+12025551234",
            normalized: "+12025551234",
            country_code: "US",
        })
    })

    it("parses a Portuguese number", () => {
        expect(parsePhoneNumber("+351912345678")).toEqual({
            original: "+351912345678",
            normalized: "+351912345678",
            country_code: "PT",
        })
    })

    it("parses a Spanish number", () => {
        expect(parsePhoneNumber("+34612345678")).toEqual({
            original: "+34612345678",
            normalized: "+34612345678",
            country_code: "ES",
        })
    })

    it("parses a Brazilian number", () => {
        expect(parsePhoneNumber("+5511987654321")).toEqual({
            original: "+5511987654321",
            normalized: "+5511987654321",
            country_code: "BR",
        })
    })

    it("parses an Argentinian number", () => {
        expect(parsePhoneNumber("+5491123456789")).toEqual({
            original: "+5491123456789",
            normalized: "+5491123456789",
            country_code: "AR",
        })
    })

    it("parses a Chinese number", () => {
        expect(parsePhoneNumber("+8613812345678")).toEqual({
            original: "+8613812345678",
            normalized: "+8613812345678",
            country_code: "CN",
        })
    })

    it("parses a UK number", () => {
        expect(parsePhoneNumber("+447800000000")).toEqual({
            original: "+447800000000",
            normalized: "+447800000000",
            country_code: "GB",
        })
    })

    it("normalises a formatted number to E.164", () => {
        expect(parsePhoneNumber("+1 (202) 555-1234")).toEqual({
            original: "+1 (202) 555-1234",
            normalized: "+12025551234",
            country_code: "US",
        })
    })

    it("trims leading and trailing whitespace", () => {
        const result = parsePhoneNumber("  +12025551234  ")
        expect(result?.original).toBe("+12025551234")
        expect(result?.normalized).toBe("+12025551234")
    })

    it("returns null for a number without + prefix", () => {
        expect(parsePhoneNumber("12025551234")).toBeNull()
    })

    it("returns null for empty string", () => {
        expect(parsePhoneNumber("")).toBeNull()
    })

    it("returns null for an invalid number", () => {
        expect(parsePhoneNumber("+1555")).toBeNull()
    })

    it("returns null for non-numeric input", () => {
        expect(parsePhoneNumber("+1abc1234567")).toBeNull()
    })
})
