import {Workflows} from "attio/client"
import type {TypeformField} from "../types/types"
import {buildOutcomeRecordFromRows, resolveOutcomeFieldTitle} from "./outcome-field-key"

const LOG_PREFIX = "[convertFieldsToOutcome]"

type OutcomeNode =
    | ReturnType<typeof Workflows.OutcomeSchema.string>
    | ReturnType<typeof Workflows.OutcomeSchema.date>
    | ReturnType<typeof Workflows.OutcomeSchema.emailAddress>
    | ReturnType<typeof Workflows.OutcomeSchema.phoneNumber>
    | ReturnType<typeof Workflows.OutcomeSchema.number>
    | ReturnType<typeof Workflows.OutcomeSchema.boolean>
    | ReturnType<typeof Workflows.OutcomeSchema.array>

export function convertFieldsToOutcomeSchema(
    fields: Array<TypeformField> = [],
    hidden: Array<string> = []
) {
    const outputs = fields.flatMap((f) => convertField(f))

    const entries = buildOutcomeRecordFromRows(
        outputs.map((o) => ({title: o.title, ref: o.ref, value: o.node}))
    )

    for (const slug of hidden) {
        if (!(slug in entries)) {
            entries[slug] = Workflows.OutcomeSchema.string()
        }
    }

    const keys = Object.keys(entries)

    if (keys.length === 0) {
        return null
    }

    return Workflows.OutcomeSchema.struct(entries)
}

function convertField(
    field: TypeformField,
    titlePrefix: string | undefined = undefined
): Array<{ref: string; title: string; node: OutcomeNode}> {
    let title = resolveOutcomeFieldTitle(field.title, field.ref)

    if (titlePrefix !== undefined) {
        title = `${titlePrefix} - ${title}`
    }

    switch (field.type) {
        case "long_text":
        case "short_text":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.string()}]

        case "date":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.date()}]

        case "email":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.emailAddress()}]

        case "website":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.string()}]

        case "phone_number":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.phoneNumber()}]

        case "rating":
        case "opinion_scale":
        case "nps":
        case "number":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.number()}]

        case "legal":
        case "checkbox":
        case "yes_no":
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.boolean()}]

        case "dropdown":
        case "multiple_choice":
            if (field.properties?.allow_multiple_selection) {
                return [
                    {
                        ref: field.ref,
                        title,
                        node: Workflows.OutcomeSchema.array(Workflows.OutcomeSchema.string()),
                    },
                ]
            }
            return [{ref: field.ref, title, node: Workflows.OutcomeSchema.string()}]

        case "group":
        case "inline_group":
        case "address":
        case "contact_info":
            return (field.properties?.fields ?? []).flatMap((f) => convertField(f, title))

        default:
            console.warn(LOG_PREFIX, "skipped unmapped field type", {
                type: field.type,
            })
            return []
    }
}
