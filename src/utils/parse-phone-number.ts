import {parsePhoneNumber as libParsePhoneNumber} from "libphonenumber-js/min"

export function parsePhoneNumber(phone: string): {
    original: string
    normalized: string
    country_code: string
} | null {
    const trimmed = phone.trim()
    try {
        const parsed = libParsePhoneNumber(trimmed)
        if (!parsed.isValid()) return null
        return {
            original: trimmed,
            normalized: parsed.format("E.164"),
            country_code: String(parsed.country),
        }
    } catch {
        return null
    }
}
