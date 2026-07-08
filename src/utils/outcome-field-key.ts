import type {TypeformField} from "../types/types"

const CONTAINER_FIELD_TYPES = new Set(["group", "inline_group", "address", "contact_info"])

/**
 * Builds a map of sub-field ref → parent container title prefix.
 * Used by the webhook parser to add the parent title prefix to sub-field output keys,
 * matching the schema keys produced by `convertFieldsToOutcomeSchema`.
 */
export function buildParentTitleMap(
    fields: TypeformField[] | undefined,
    parentTitle: string | undefined = undefined
): Map<string, string> {
    const map = new Map<string, string>()
    if (!fields?.length) return map

    for (const field of fields) {
        const fieldTitle = resolveOutcomeFieldTitle(field.title, field.ref)
        const prefixedTitle = applyParentTitle(parentTitle, fieldTitle)

        if (CONTAINER_FIELD_TYPES.has(field.type) && field.properties?.fields?.length) {
            for (const subField of field.properties.fields) {
                map.set(subField.ref, prefixedTitle)
            }
            const nested = buildParentTitleMap(field.properties.fields, prefixedTitle)
            nested.forEach((v, k) => {
                map.set(k, v)
            })
        }
    }

    return map
}

/**
 * Walks group / inline_group nesting to find a field matching webhook `field.ref` or `field.id`.
 */
export function findFieldByRefOrId(
    fields: TypeformField[] | undefined,
    ref: string,
    id: string
): TypeformField | undefined {
    if (!fields?.length) {
        return undefined
    }
    for (const field of fields) {
        if (field.ref === ref || field.id === id) {
            return field
        }
        const nested = field.properties?.fields
        if (nested?.length) {
            const found = findFieldByRefOrId(nested, ref, id)
            if (found !== undefined) {
                return found
            }
        }
    }
    return undefined
}

/**
 * Shared with the workflow outcome schema and webhook payload mapping so keys match:
 * unique titles use the title alone; duplicate titles become `${title} [${ref}]`.
 */
export function resolveOutcomeFieldTitle(title: string | undefined, ref: string): string {
    let t = title ?? ""
    if (t.trim() === "") {
        t = ref
    }
    if (t.trim() === "") {
        t = "Unknown field"
    }
    return t
}

export function applyParentTitle(parentTitle: string | undefined, fieldTitle: string): string {
    return parentTitle !== undefined ? `${parentTitle} - ${fieldTitle}` : fieldTitle
}

export function countOutcomeTitleOccurrences<T extends {title: string}>(
    items: Array<T>
): Map<string, number> {
    const counts = new Map<string, number>()
    for (const item of items) {
        counts.set(item.title, (counts.get(item.title) ?? 0) + 1)
    }
    return counts
}

export function outcomeKeyForTitleAndRef(
    title: string,
    ref: string,
    titleCounts: Map<string, number>
): string {
    return (titleCounts.get(title) ?? 0) > 1 ? `${title} [${ref}]` : title
}

/**
 * Builds the outcome record key for each row: unique resolved titles stay as-is; duplicate titles
 * get `` `${title} [${ref}]` ``. Used by the configurator schema and webhook payload mapping.
 */
export function buildOutcomeRecordFromRows<T>(
    rows: Array<{title: string; ref: string; value: T}>
): Record<string, T> {
    const titleCounts = countOutcomeTitleOccurrences(rows)
    const record: Record<string, T> = {}
    for (const row of rows) {
        record[outcomeKeyForTitleAndRef(row.title, row.ref, titleCounts)] = row.value
    }
    return record
}
