import type {TypeformForm} from "../types/types"
import {getTypeform} from "./get-typeform"
import type {TypeformResult} from "./types/errors"

/** @see https://www.typeform.com/developers/create/reference/retrieve-form/ */
export default async function getForm({formId}: {formId: string}): TypeformResult<TypeformForm> {
    const typeform = getTypeform()
    const result = await typeform.getForm(formId)
    return result
}
