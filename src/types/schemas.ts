import {z} from "zod"

const typeformFieldTypeSchema = z.enum([
    "address",
    "calendly",
    "contact_info",
    "date",
    "dropdown",
    "email",
    "file_upload",
    "group",
    "inline_group",
    "legal",
    "long_text",
    "matrix",
    "multiple_choice",
    "nps",
    "number",
    "opinion_scale",
    "payment",
    "phone_number",
    "picture_choice",
    "ranking",
    "rating",
    "short_text",
    "statement",
    "website",
    "yes_no",
    "checkbox",
    "multi_format",
])

/**
 * Must match `typeformFieldSchema` (used as the generic for recursive `z.lazy`).
 */
export interface TypeformFieldShape {
    id: string
    ref: string
    title: string
    type: z.infer<typeof typeformFieldTypeSchema>
    properties?: {
        fields?: TypeformFieldShape[]
        choices?: Array<{ref: string; label: string}>
        allow_multiple_selection?: boolean
    } & Record<string, unknown>
}

export const typeformFieldSchema: z.ZodType<TypeformFieldShape> = z.lazy(() =>
    z
        .object({
            id: z.string(),
            ref: z.string(),
            title: z.string(),
            type: typeformFieldTypeSchema,
            properties: z
                .object({
                    fields: z.array(typeformFieldSchema).optional(),
                    choices: z
                        .array(
                            z.object({
                                ref: z.string(),
                                label: z.string(),
                            })
                        )
                        .optional(),
                    allow_multiple_selection: z.boolean().optional(),
                })
                .passthrough()
                .optional(),
        })
        .passthrough()
)

export const getFormResponseSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        fields: z.array(typeformFieldSchema).optional(),
        hidden: z.array(z.string()).optional(),
    })
    .passthrough()

export const answerSchema = z
    .object({
        field: z.object({
            id: z.string(),
            type: typeformFieldTypeSchema,
            ref: z.string(),
            title: z.string().optional(),
        }),
    })
    .passthrough()
    .and(
        z.discriminatedUnion("type", [
            z.object({type: z.literal("text"), text: z.string()}),
            z.object({
                type: z.literal("choice"),
                // Predefined option: { label }. "Other" option (allow_other_choice): { other } with custom text.
                choice: z.union([z.object({label: z.string()}), z.object({other: z.string()})]),
            }),
            z.object({
                type: z.literal("choices"),
                choices: z.object({labels: z.array(z.string())}),
            }),
            z.object({type: z.literal("email"), email: z.string()}),
            z.object({type: z.literal("date"), date: z.string()}),
            z.object({type: z.literal("boolean"), boolean: z.boolean()}),
            z.object({type: z.literal("url"), url: z.string()}),
            z.object({type: z.literal("number"), number: z.number()}),
            z.object({type: z.literal("phone_number"), phone_number: z.string()}),
            z.object({type: z.literal("file_url"), file_url: z.string()}),
            z.object({
                type: z.literal("payment"),
                payment: z.object({
                    amount: z.string(),
                    last4: z.string(),
                    name: z.string(),
                    success: z.boolean(),
                }),
            }),
            z.object({
                type: z.literal("contact_info"),
                contact_info: z.object({
                    first_name: z.string().optional(),
                    last_name: z.string().optional(),
                    email: z.string().optional(),
                    phone_number: z.string().optional(),
                    company: z.string().optional(),
                    country: z.string().optional(),
                }),
            }),
        ])
    )

export const webhookPayloadSchema = z
    .object({
        event_type: z.literal("form_response"),
        form_response: z.object({
            form_id: z.string(),
            answers: z.array(answerSchema),
            hidden: z.record(z.string(), z.string()).optional(),
            submitted_at: z.coerce.date().optional().catch(undefined),
        }),
    })
    .passthrough()

export const listFormsResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
        })
    ),
})

export const assertWebhookResponseSchema = z.object({
    id: z.string(),
    tag: z.string(),
})
