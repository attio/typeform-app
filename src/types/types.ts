import type {z} from "zod"
import type {
    answerSchema,
    assertWebhookResponseSchema,
    getFormResponseSchema,
    listFormsResponseSchema,
    typeformFieldSchema,
} from "./schemas"

export type TypeformField = z.infer<typeof typeformFieldSchema>

export type TypeformForm = z.infer<typeof getFormResponseSchema>

export type WebhookAnswer = z.infer<typeof answerSchema>

export type TypeformFormSummary = z.infer<typeof listFormsResponseSchema>["items"][number]

export type AssertWebhookResponse = z.infer<typeof assertWebhookResponseSchema>
