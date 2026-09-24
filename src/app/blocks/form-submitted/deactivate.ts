import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getTypeform} from "../../../typeform/get-typeform"
import {typeformApiErrorUserMessage} from "../../../typeform/types/errors"
import block from "./block"

function isInvalidResourceError(errors: Array<{code?: string}>): boolean {
    return errors.some((error) => error.code === "INVALID_RESOURCE")
}

export default Workflows.defineWorkflowBlockDeactivate(block, async ({config, metadata}) => {
    const {formId} = config
    const tag = metadata.uniqueActivationId

    const typeform = getTypeform()
    const result = await typeform.deleteWebhook({formId, tag})

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
