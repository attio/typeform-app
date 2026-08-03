import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "trigger",
    id: "form-submitted",
    title: "Form submitted",
    description: "Triggers when a Typeform form is submitted",
    requireUserConnection: true,
    configSchema: Workflows.ConfigSchema.struct({
        formId: Workflows.ConfigSchema.string(),
    }),
})
