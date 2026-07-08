import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getTypeform} from "../../typeform/get-typeform"
import {typeformApiErrorUserMessage, unexpectedTypeformError} from "../../typeform/types/errors"
import block from "./block"

function serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        }
    }

    return {type: typeof error}
}

function isInvalidResourceError(errors: Array<{code?: string}>): boolean {
    return errors.some((error) => error.code === "INVALID_RESOURCE")
}

export default Workflows.defineWorkflowBlockDeactivate(block, async ({config, metadata}) => {
    const {formId} = config
    const tag = metadata.uniqueActivationId

    const typeform = getTypeform()
    let result: Awaited<ReturnType<typeof typeform.deleteWebhook>>
    try {
        result = await typeform.deleteWebhook({formId, tag})
    } catch (error) {
        console.error(
            JSON.stringify({
                msg: "Unexpected error deactivating Typeform webhook",
                source: "form-submitted-block",
                operation: "deactivate",
                formId,
                error: serializeError(error),
            })
        )
        return {
            type: "error",
            errorMessage: typeformApiErrorUserMessage(unexpectedTypeformError()),
        }
    }

    if (isErrored(result)) {
        if (isInvalidResourceError(result.error)) {
            // Webhook already gone - treat as success.
            return {type: "complete"}
        }

        return {
            type: "error",
            errorMessage: typeformApiErrorUserMessage(result.error),
        }
    }

    return {type: "complete"}
})
