import {getUserConnection} from "attio/server"
import {TypeformClient} from "./typeform-client"

export function getTypeform(): TypeformClient {
    return new TypeformClient(getUserConnection().value)
}
