import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getTypeform} from "../../../typeform/get-typeform"
import {
    buildWebhookOutputsFromParsed,
    parseWebhookBody,
} from "../../../typeform/parse-webhook-payload"
import {typeformApiErrorUserMessage} from "../../../typeform/types/errors"
import block from "./block"

export default Workflows.defineWorkflowBlockTrigger(block, async (request, {config, metadata}) => {
    const body = await request.json()

    const data = parseWebhookBody(body)

    if (data === null) {
        return {type: "no-op"}
    }

    if (config.formId !== data.form_response.form_id) {
        return {type: "no-op"}
    }

    const typeform = getTypeform()
    let formResult: Awaited<ReturnType<typeof typeform.getForm>>
    try {
        formResult = await typeform.getForm(config.formId)
    } catch (error) {
        console.error(
            JSON.stringify({
                msg: "Unexpected error fetching form during webhook trigger",
                source: "form-submitted-block",
                operation: "trigger",
                workflowActivationId: metadata.uniqueActivationId,
                formId: config.formId,
                eventFormId: data.form_response.form_id,
                error:
                    error instanceof Error
                        ? {name: error.name, message: error.message}
                        : {type: typeof error},
            })
        )
        return {type: "no-op"}
    }

    if (isErrored(formResult)) {
        console.error(
            JSON.stringify({
                msg: "Typeform error fetching form during webhook trigger",
                source: "form-submitted-block",
                operation: "trigger",
                workflowActivationId: metadata.uniqueActivationId,
                formId: config.formId,
                eventFormId: data.form_response.form_id,
                errorMessage: typeformApiErrorUserMessage(formResult.error),
                errors: formResult.error,
            })
        )
        return {type: "no-op"}
    }
    const form = formResult.value
    const outputs = buildWebhookOutputsFromParsed(data, form)

    return {type: "outcome", id: "done", data: outputs}
})
