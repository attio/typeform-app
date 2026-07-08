import {isErrored} from "@attio/fetchable"
import {useAsyncCache, Workflows} from "attio/client"
import React from "react"
import getForm from "../../typeform/get-form.server"
import listForms from "../../typeform/list-forms.server"
import {typeformApiErrorUserMessage} from "../../typeform/types/errors"
import {convertFieldsToOutcomeSchema} from "../../utils/convert-fields-to-outcome"
import block from "./block"

function ConfiguratorContent({workflowBlock}: {workflowBlock: typeof block}) {
    const {ComboboxInput, Outcome, watch} = Workflows.useConfigurator(workflowBlock, {})

    const {values} = useAsyncCache({
        forms: [listForms],
    })
    const formsResult = values.forms
    const formIdValue = watch("formId")
    const formId = formIdValue?.type === "static" ? formIdValue.value : undefined

    const [outcomeSchema, setOutcomeSchema] = React.useState<ReturnType<
        typeof convertFieldsToOutcomeSchema
    > | null>(null)

    React.useEffect(() => {
        if (!formId) {
            setOutcomeSchema(null)
            return
        }

        let cancelled = false

        getForm({formId})
            .then((result) => {
                if (cancelled) {
                    return
                }

                if (isErrored(result)) {
                    console.error(
                        JSON.stringify({
                            msg: "Typeform error loading form outcome schema",
                            source: "form-submitted-configurator",
                            operation: "getForm",
                            formId,
                            errorMessage: typeformApiErrorUserMessage(result.error),
                            errors: result.error,
                        })
                    )
                    setOutcomeSchema(null)
                    return
                }

                setOutcomeSchema(
                    convertFieldsToOutcomeSchema(result.value.fields, result.value.hidden)
                )
            })
            .catch((error) => {
                if (cancelled) {
                    return
                }

                console.error(
                    JSON.stringify({
                        msg: "Unexpected error loading Typeform outcome schema",
                        source: "form-submitted-configurator",
                        operation: "getForm",
                        formId,
                        error:
                            error instanceof Error
                                ? {name: error.name, message: error.message}
                                : {type: typeof error},
                    })
                )
                setOutcomeSchema(null)
            })

        return () => {
            cancelled = true
        }
    }, [formId])

    return (
        <>
            <ComboboxInput
                name="formId"
                label="Form"
                placeholder="Select a form..."
                searchPlaceholder="Search forms..."
                options={{
                    async getOption(value: string) {
                        if (isErrored(formsResult)) {
                            return {
                                label: typeformApiErrorUserMessage(formsResult.error),
                                value: "error",
                            }
                        }
                        const form = formsResult.value.find((f) => f.id === value)
                        return form
                            ? {label: form.title, value: form.id}
                            : {label: "Unknown form", value}
                    },
                    async search(query: string) {
                        if (isErrored(formsResult)) {
                            return [
                                {
                                    label: typeformApiErrorUserMessage(formsResult.error),
                                    value: "error",
                                },
                            ]
                        }
                        return formsResult.value
                            .filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
                            .map((f) => ({label: f.title, value: f.id}))
                    },
                }}
                disableVariables
            />
            <Outcome id="done" schema={outcomeSchema} />
        </>
    )
}

export default Workflows.defineConfigurator(block, (workflowBlock) => (
    <ConfiguratorContent workflowBlock={workflowBlock} />
))
