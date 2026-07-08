import type {AsyncResult} from "@attio/fetchable"

export type TypeformError = {
    title: string
    detail: string
    code?: string
    id?: string
}

export type TypeformResult<T = void> = AsyncResult<T, TypeformError[]>

const TYPEFORM_USER_LABEL = "Typeform"

export function unexpectedTypeformError(): TypeformError[] {
    return [
        {
            title: "Unexpected error",
            detail: "An unexpected error occurred.",
        },
    ]
}

export function typeformApiErrorUserMessage(errors: TypeformError[]): string {
    const message = errors
        .map((error) => error.detail)
        .join(" ")
        .trim()
    return `${TYPEFORM_USER_LABEL}: ${message || "An unexpected error occurred."}`
}
