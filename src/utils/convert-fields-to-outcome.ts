import {Workflows} from "attio/client"
import type {TypeformField} from "../types/types"
import {
    buildOutcomeRecordFromRows,
    countOutcomeTitleOccurrences,
    joinTitles,
    resolveOutcomeFieldTitle,
    SUBMITTED_AT_OUTCOME_KEY,
} from "./outcome-field-key"

const LOG_PREFIX = "[convertFieldsToOutcome]"

type OutcomeNode =
    | ReturnType<typeof Workflows.OutcomeSchema.string>
    | ReturnType<typeof Workflows.OutcomeSchema.date>
    | ReturnType<typeof Workflows.OutcomeSchema.emailAddress>
    | ReturnType<typeof Workflows.OutcomeSchema.phoneNumber>
    | ReturnType<typeof Workflows.OutcomeSchema.number>
    | ReturnType<typeof Workflows.OutcomeSchema.boolean>
    | ReturnType<typeof Workflows.OutcomeSchema.timestamp>
    | ReturnType<typeof Workflows.OutcomeSchema.array>

type OutcomeField = {ref: string; title: string; label: string; node: OutcomeNode}

export function convertFieldsToOutcomeSchema(
    fields: Array<TypeformField> = [],
    hidden: Array<string> = []
) {
    const outputs = fields.flatMap((f) => convertField(f))
    const titleCounts = countOutcomeTitleOccurrences(outputs)

    const entries = buildOutcomeRecordFromRows(
        outputs.map((output) => toOutcomeRow(output, titleCounts))
    )

    for (const slug of hidden) {
        if (!(slug in entries)) {
            entries[slug] = Workflows.OutcomeSchema.string()
        }
    }

    if (!(SUBMITTED_AT_OUTCOME_KEY in entries)) {
        entries[SUBMITTED_AT_OUTCOME_KEY] = Workflows.OutcomeSchema.timestamp()
    }

    return Workflows.OutcomeSchema.struct(entries)
}

function toOutcomeRow(
    output: OutcomeField,
    titleCounts: Map<string, number>
): {ref: string; title: string; value: OutcomeNode} {
    const isDuplicate = (titleCounts.get(output.title) ?? 0) > 1
    const label = isDuplicate ? `${output.label} [${output.ref}]` : output.label
    return {ref: output.ref, title: output.title, value: output.node.title(label)}
}

function convertField(
    field: TypeformField,
    parent: {title: string; label: string} | undefined = undefined
): Array<OutcomeField> {
    const fieldTitle = resolveOutcomeFieldTitle(field.title, field.ref)
    // The title is the output key. Existing workflows are bound to these keys. If you change the
    // order, those workflows lose their values. The label is display only and changes nothing.
    const title = joinTitles(parent?.title, fieldTitle)
    const label = joinTitles(fieldTitle, parent?.label)

    switch (field.type) {
        case "long_text":
        case "short_text":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.string()}]

        case "date":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.date()}]

        case "email":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.emailAddress()}]

        case "website":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.string()}]

        case "phone_number":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.phoneNumber()}]

        case "rating":
        case "opinion_scale":
        case "nps":
        case "number":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.number()}]

        case "legal":
        case "checkbox":
        case "yes_no":
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.boolean()}]

        case "dropdown":
        case "multiple_choice":
            if (field.properties?.allow_multiple_selection) {
                return [
                    {
                        ref: field.ref,
                        title,
                        label,
                        node: Workflows.OutcomeSchema.array(Workflows.OutcomeSchema.string()),
                    },
                ]
            }
            return [{ref: field.ref, title, label, node: Workflows.OutcomeSchema.string()}]

        case "group":
        case "inline_group":
        case "address":
        case "contact_info":
            return (field.properties?.fields ?? []).flatMap((f) => convertField(f, {title, label}))

        default:
            console.warn(LOG_PREFIX, "skipped unmapped field type", {
                type: field.type,
            })
            return []
    }
}
