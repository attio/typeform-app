import {describe, expect, it} from "vitest"
import {parseEmailAddress} from "./parse-email-address"

describe("parseEmailAddress", () => {
    it("parses a simple email address", () => {
        expect(parseEmailAddress("test@example.com")).toEqual({
            original: "test@example.com",
            normalized: "test@example.com",
            domain: "example.com",
            root_domain: "example.com",
            local_specifier: "test",
        })
    })

    it("lowercases normalized, domain, and local_specifier", () => {
        const result = parseEmailAddress("John.DOE@Example.COM")
        expect(result).toEqual({
            original: "John.DOE@Example.COM",
            normalized: "john.doe@example.com",
            domain: "example.com",
            root_domain: "example.com",
            local_specifier: "john.doe",
        })
    })

    it("extracts root_domain from subdomain", () => {
        const result = parseEmailAddress("user@mail.company.co.uk")
        expect(result?.root_domain).toBe("co.uk")
        expect(result?.domain).toBe("mail.company.co.uk")
    })

    it("trims leading and trailing whitespace", () => {
        const result = parseEmailAddress("  user@example.com  ")
        expect(result?.original).toBe("user@example.com")
        expect(result?.normalized).toBe("user@example.com")
    })

    it("returns null for empty string", () => {
        expect(parseEmailAddress("")).toBeNull()
    })

    it("returns null for string without @", () => {
        expect(parseEmailAddress("notanemail")).toBeNull()
    })

    it("returns null for missing local part", () => {
        expect(parseEmailAddress("@example.com")).toBeNull()
    })

    it("returns null for missing domain", () => {
        expect(parseEmailAddress("user@")).toBeNull()
    })

    it("returns null for domain without TLD", () => {
        expect(parseEmailAddress("user@localhost")).toBeNull()
    })

    it("handles plus-addressed emails", () => {
        const result = parseEmailAddress("user+tag@example.com")
        expect(result?.local_specifier).toBe("user+tag")
        expect(result?.domain).toBe("example.com")
    })
})
