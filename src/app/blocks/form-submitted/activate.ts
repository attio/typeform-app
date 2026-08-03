import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getTypeform} from "../../../typeform/get-typeform"
import {typeformApiErrorUserMessage, unexpectedTypeformError} from "../../../typeform/types/errors"
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

export default Workflows.defineWorkflowBlockActivate(block, async ({config, metadata}) => {
    const {formId} = config
    const tag = metadata.uniqueActivationId

    const typeform = getTypeform()

    let result: Awaited<ReturnType<typeof typeform.assertWebhook>>
    try {
        result = await typeform.assertWebhook({
            formId,
            tag,
            url: metadata.triggerCallbackUrl,
        })
    } catch (error) {
        console.error(
            JSON.stringify({
                msg: "Unexpected error activating Typeform webhook",
                source: "form-submitted-block",
                operation: "activate",
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
        return {
            type: "error",
            errorMessage: typeformApiErrorUserMessage(result.error),
        }
    }

    return {type: "complete"}
})
