import type {TypeformFormSummary} from "../types/types"
import {getTypeform} from "./get-typeform"
import type {TypeformResult} from "./types/errors"

/** @see https://www.typeform.com/developers/create/reference/retrieve-forms/ */
export default async function listForms({
    search,
}: {
    search: string
}): TypeformResult<TypeformFormSummary[]> {
    const typeform = getTypeform()
    const result = await typeform.listForms({search})
    return result
}
