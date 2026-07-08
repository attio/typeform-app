const EMAIL_REGEX = /^([^@\s]+)@(([^@\s.]+\.)+[^@\s.]+)$/

function getRootDomain(domain: string): string {
    const labels = domain.split(".")
    if (labels.length < 2) return domain
    return `${labels[labels.length - 2]}.${labels[labels.length - 1]}`
}

export function parseEmailAddress(email: string): {
    original: string
    normalized: string
    domain: string
    root_domain: string
    local_specifier: string
} | null {
    const trimmed = email.trim()
    const match = EMAIL_REGEX.exec(trimmed)
    if (!match) return null

    const localSpecifier = match[1].toLowerCase()
    const domain = match[2].toLowerCase()

    return {
        original: trimmed,
        normalized: trimmed.toLowerCase(),
        domain,
        root_domain: getRootDomain(domain),
        local_specifier: localSpecifier,
    }
}
