import { tipsFor } from "@/lib/server/data"
import { BadRequest, addressParam, cachedJson, chainParam, errorJson } from "@/lib/server/http"

/** GET ?chainId&jar: totals per token, tip and tipper counts, and the 20 most recent tips. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const chain = chainParam(params)
    const jar = addressParam(params, "jar")
    if (!jar) throw new BadRequest("Send jar.")
    return cachedJson({ chainId: chain.id, jar, ...(await tipsFor(chain, jar)) }, 30)
  } catch (error) {
    return errorJson(error, "tips")
  }
}
