import {complete, errored, isErrored} from "@attio/fetchable"
import {
    assertWebhookResponseSchema,
    getFormResponseSchema,
    listFormsResponseSchema,
} from "../types/schemas"
import type {AssertWebhookResponse, TypeformForm, TypeformFormSummary} from "../types/types"
import {type TypeformError, type TypeformResult, unexpectedTypeformError} from "./types/errors"

const BASE_URL = "https://api.typeform.com"

/** Typeform's maximum `page_size` for the list forms endpoint. */
const LIST_FORMS_PAGE_SIZE = 200

function sanitizeZodIssues(error: {
    issues: Array<{path: Array<string | number>; code: string; message: string}>
}) {
    return error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
    }))
}

function safeParseJson(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return undefined
    }
}

function typeformErrorTitleForStatus(status: number): string {
    switch (status) {
        case 401:
        case 403:
            return "Unauthorized"
        case 402:
            return "Payment required"
        case 404:
            return "Invalid resource"
        case 429:
            return "Rate limited"
        default:
            return "Typeform API error"
    }
}

function typeformErrorCodeForStatus(status: number): string | undefined {
    switch (status) {
        case 401:
        case 403:
            return "UNAUTHORIZED"
        case 402:
            return "PAYMENT_REQUIRED"
        case 404:
            return "INVALID_RESOURCE"
        case 429:
            return "RATE_LIMITED"
        default:
            return undefined
    }
}

function fallbackTypeformErrorForStatus(status: number): TypeformError[] | null {
    switch (status) {
        case 401:
        case 403:
            return [
                {
                    title: "Unauthorized",
                    detail: "Typeform connection is unauthorized. Please reconnect your Typeform account.",
                    code: "UNAUTHORIZED",
                },
            ]
        case 402:
            return [
                {
                    title: "Payment required",
                    detail: "A payment issue occurred with your Typeform account.",
                    code: "PAYMENT_REQUIRED",
                },
            ]
        case 404:
            return [
                {
                    title: "Invalid resource",
                    detail: "The selected Typeform form could not be found. Please choose a valid form.",
                    code: "INVALID_RESOURCE",
                },
            ]
        case 429:
            return [
                {
                    title: "Rate limited",
                    detail: "Rate limit reached. Please try again in a moment.",
                    code: "RATE_LIMITED",
                },
            ]
        default:
            return null
    }
}

function typeformErrorFromPayload(status: number, json: unknown): TypeformError[] | null {
    if (typeof json !== "object" || json === null) {
        return null
    }

    const description =
        "description" in json && typeof json.description === "string" ? json.description : undefined
    const providerCode = "code" in json && typeof json.code === "string" ? json.code : undefined
    const id = "id" in json && typeof json.id === "string" ? json.id : undefined

    if (!description && !providerCode) {
        return null
    }

    const code = typeformErrorCodeForStatus(status) ?? providerCode

    return [
        {
            title: typeformErrorTitleForStatus(status),
            detail: description ?? "Typeform returned an error.",
            code,
            id,
        },
    ]
}

function typeformErrorFromResponse(status: number, json: unknown): TypeformError[] | null {
    return typeformErrorFromPayload(status, json) ?? fallbackTypeformErrorForStatus(status)
}

function isInvalidResourceError(errors: TypeformError[]): boolean {
    return errors.some((error) => error.code === "INVALID_RESOURCE")
}

export class TypeformClient {
    constructor(private readonly token: string) {}

    /**
     * Most recently edited first, so an empty or broad search shows the likeliest picks.
     *
     * @see https://www.typeform.com/developers/create/reference/retrieve-forms/
     */
    async listForms({search}: {search: string}): TypeformResult<TypeformFormSummary[]> {
        const params = new URLSearchParams({
            page_size: String(LIST_FORMS_PAGE_SIZE),
            sort_by: "last_updated_at",
            order_by: "desc",
        })
        if (search) {
            params.set("search", search)
        }

        const response = await this.request("GET", `/forms?${params.toString()}`)

        if (isErrored(response)) {
            return response
        }

        const parseResult = listFormsResponseSchema.safeParse(response.value)

        if (!parseResult.success) {
            console.error(
                JSON.stringify({
                    msg: "Failed to parse Typeform forms response",
                    source: "typeform-client",
                    operation: "listForms",
                    issues: sanitizeZodIssues(parseResult.error),
                })
            )
            return errored(unexpectedTypeformError())
        }

        return complete(parseResult.data.items)
    }

    /**
     * @see https://www.typeform.com/developers/create/reference/retrieve-form/
     */
    async getForm(formId: string): TypeformResult<TypeformForm> {
        const response = await this.request("GET", `/forms/${formId}`)

        if (isErrored(response)) {
            return response
        }

        const parseResult = getFormResponseSchema.safeParse(response.value)

        if (!parseResult.success) {
            console.error(
                JSON.stringify({
                    msg: "Failed to parse Typeform form response",
                    source: "typeform-client",
                    operation: "getForm",
                    issues: sanitizeZodIssues(parseResult.error),
                })
            )
            return errored(unexpectedTypeformError())
        }

        return complete(parseResult.data)
    }

    /**
     * @see https://www.typeform.com/developers/webhooks/reference/create-or-update-webhook/
     */
    async assertWebhook({
        formId,
        tag,
        url,
    }: {
        formId: string
        tag: string
        url: string
    }): TypeformResult<AssertWebhookResponse> {
        const response = await this.request("PUT", `/forms/${formId}/webhooks/${tag}`, {
            url,
            enabled: true,
        })

        if (isErrored(response)) {
            return response
        }

        const parseResult = assertWebhookResponseSchema.safeParse(response.value)

        if (!parseResult.success) {
            console.error(
                JSON.stringify({
                    msg: "Failed to parse Typeform webhook response",
                    source: "typeform-client",
                    operation: "assertWebhook",
                    issues: sanitizeZodIssues(parseResult.error),
                })
            )
            return errored(unexpectedTypeformError())
        }

        return complete(parseResult.data)
    }

    /**
     * @see https://www.typeform.com/developers/webhooks/reference/delete-webhook/
     */
    async deleteWebhook({formId, tag}: {formId: string; tag: string}): TypeformResult<null> {
        const response = await this.request("DELETE", `/forms/${formId}/webhooks/${tag}`)

        if (isErrored(response)) {
            if (isInvalidResourceError(response.error)) {
                // Treat 404 as success — webhook already deleted (idempotent)
                return complete(null)
            }
            return response
        }

        return complete(null)
    }

    private async request(
        method: "GET" | "PUT" | "DELETE",
        subUrl: string,
        body?: Record<string, unknown>
    ): TypeformResult<unknown> {
        let response: Response
        let text: string
        try {
            response = await fetch(`${BASE_URL}${subUrl}`, {
                method,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    ...(body !== undefined ? {"Content-Type": "application/json"} : {}),
                },
                ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
            })
            text = await response.text()
        } catch (error) {
            console.error(
                JSON.stringify({
                    msg: "Failed to reach Typeform API",
                    source: "typeform-client",
                    operation: "request",
                    method,
                    subUrl,
                    error:
                        error instanceof Error
                            ? {name: error.name, message: error.message}
                            : {type: typeof error},
                })
            )
            return errored(unexpectedTypeformError())
        }

        const json = text ? safeParseJson(text) : undefined

        if (!response.ok) {
            const errors = typeformErrorFromResponse(response.status, json)
            if (errors) {
                return errored(errors)
            }

            console.error(
                JSON.stringify({
                    msg: "Unexpected error response from Typeform API",
                    source: "typeform-client",
                    operation: "request",
                    method,
                    subUrl,
                    status: response.status,
                    statusText: response.statusText,
                    body: text.slice(0, 500),
                })
            )
            return errored(unexpectedTypeformError())
        }

        if (response.status === 204) {
            return complete(null)
        }

        return complete(json)
    }
}
