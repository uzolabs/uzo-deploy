import { stats } from "@/lib/server/data"
import { cachedJson, chainParam, errorJson } from "@/lib/server/http"

/** GET ?chainId: counts only, with team activity excluded and reported separately. */
export async function GET(request: Request) {
  try {
    const chain = chainParam(new URL(request.url).searchParams)
    return cachedJson({ chainId: chain.id, ...(await stats(chain)) }, 300)
  } catch (error) {
    return errorJson(error, "stats")
  }
}
