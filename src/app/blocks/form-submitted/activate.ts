import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getTypeform} from "../../../typeform/get-typeform"
import {typeformApiErrorUserMessage} from "../../../typeform/types/errors"
import block from "./block"

export default Workflows.defineWorkflowBlockActivate(block, async ({config, metadata}) => {
    const {formId} = config
    const tag = metadata.uniqueActivationId

    const typeform = getTypeform()

    const result = await typeform.assertWebhook({
        formId,
        tag,
        url: metadata.triggerCallbackUrl,
    })

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: typeformApiErrorUserMessage(result.error),
        }
    }

    return {type: "complete"}
})
