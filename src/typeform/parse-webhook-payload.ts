import {Workflows} from "attio/server"

type WorkflowOutcomeDataNode = Workflows.WorkflowOutcomeDataNode
type WorkflowOutcomeDataRuntimeValueOf<T extends WorkflowOutcomeDataNode> =
    Workflows.WorkflowOutcomeDataRuntimeValueOf<T>

import type {z} from "zod"
import {webhookPayloadSchema} from "../types/schemas"
import type {TypeformField, TypeformForm, WebhookAnswer} from "../types/types"
import {
    applyParentTitle,
    buildOutcomeRecordFromRows,
    buildParentTitleMap,
    findFieldByRefOrId,
    resolveOutcomeFieldTitle,
} from "../utils/outcome-field-key"

const CONTACT_INFO_SHORT_TEXT_KEYS = new Set(["first_name", "last_name", "company", "country"])

function toEmailValue(
    raw: string
): WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode> | null {
    return Workflows.OutcomeValue.emailAddress(raw)
}

function toPhoneValue(
    raw: string
): WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode> | null {
    return Workflows.OutcomeValue.phoneNumber(raw)
}

function extractContactInfoRows(
    answer: Extract<WebhookAnswer, {type: "contact_info"}>,
    formFields: TypeformField[] | undefined
): Array<{
    value: WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode>
    title: string
    ref: string
}> {
    const formField = findFieldByRefOrId(formFields, answer.field.ref, answer.field.id)
    const parentTitle = resolveOutcomeFieldTitle(
        answer.field.title ?? formField?.title,
        answer.field.ref
    )
    const subFields = formField?.properties?.fields ?? []
    const rows: Array<{
        value: WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode>
        title: string
        ref: string
    }> = []

    for (const subField of subFields) {
        const subTitle = applyParentTitle(
            parentTitle,
            resolveOutcomeFieldTitle(subField.title, subField.ref)
        )

        if (subField.type === "email") {
            const raw = answer.contact_info.email
            if (raw !== undefined) {
                const value = toEmailValue(raw)
                if (value !== null) {
                    rows.push({value, title: subTitle, ref: subField.ref})
                }
            }
        } else if (subField.type === "phone_number") {
            const raw = answer.contact_info.phone_number
            if (raw !== undefined) {
                const value = toPhoneValue(raw)
                if (value !== null) {
                    rows.push({value, title: subTitle, ref: subField.ref})
                }
            }
        } else if (
            subField.type === "short_text" &&
            CONTACT_INFO_SHORT_TEXT_KEYS.has(subField.ref)
        ) {
            const raw =
                answer.contact_info[
                    subField.ref as "first_name" | "last_name" | "company" | "country"
                ]
            if (raw !== undefined) {
                rows.push({value: raw, title: subTitle, ref: subField.ref})
            }
        }
    }

    return rows
}

function extractAnswerValue(
    answer: WebhookAnswer
): WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode> | null {
    switch (answer.type) {
        case "text":
            return answer.text
        case "email":
            return toEmailValue(answer.email)
        case "url":
            return answer.url
        case "date":
            return Workflows.OutcomeValue.date({value: answer.date})
        case "number":
            return answer.number
        case "boolean":
            return answer.boolean
        case "phone_number":
            return toPhoneValue(answer.phone_number)
        case "choice": {
            const c = answer.choice
            return "label" in c ? c.label : c.other
        }
        case "choices":
            return answer.choices.labels
        case "file_url":
            return answer.file_url
        default:
            return null
    }
}

export type WebhookPayloadParsed = z.infer<typeof webhookPayloadSchema>

export function parseWebhookBody(body: unknown): WebhookPayloadParsed | null {
    const parseResult = webhookPayloadSchema.safeParse(body)

    if (!parseResult.success) {
        console.error(
            JSON.stringify({
                msg: "Failed to parse Typeform webhook payload",
                issues: parseResult.error.issues.map((i) => ({
                    path: i.path,
                    code: i.code,
                    message: i.message,
                })),
            })
        )
        return null
    }

    return parseResult.data
}

export function buildWebhookOutputsFromParsed(
    data: WebhookPayloadParsed,
    form: TypeformForm
): Record<string, WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode>> {
    const {answers, hidden} = data.form_response
    const parentTitleMap = buildParentTitleMap(form.fields)

    const rows: Array<{
        value: WorkflowOutcomeDataRuntimeValueOf<WorkflowOutcomeDataNode>
        title: string
        ref: string
    }> = []

    for (const answer of answers) {
        if (answer.type === "contact_info") {
            rows.push(...extractContactInfoRows(answer, form.fields))
        } else {
            const value = extractAnswerValue(answer)
            if (value !== null) {
                const fromForm = findFieldByRefOrId(
                    form.fields,
                    answer.field.ref,
                    answer.field.id
                )?.title
                const title = applyParentTitle(
                    parentTitleMap.get(answer.field.ref),
                    resolveOutcomeFieldTitle(answer.field.title ?? fromForm, answer.field.ref)
                )
                rows.push({value, title, ref: answer.field.ref})
            }
        }
    }

    const outputs = buildOutcomeRecordFromRows(rows)

    if (hidden) {
        for (const [slug, value] of Object.entries(hidden)) {
            if (!(slug in outputs)) {
                outputs[slug] = value
            }
        }
    }

    return outputs
}
