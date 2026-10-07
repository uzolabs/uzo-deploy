import { deploymentOf, deploymentsBy } from "@/lib/server/data"
import { BadRequest, addressParam, cachedJson, chainParam, errorJson } from "@/lib/server/http"

/**
 * GET ?chainId&deployer: every contract that address deployed through our factories, newest first.
 * GET ?chainId&instance: the factory record for one contract, or null if no factory of ours made it.
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const chain = chainParam(params)
    const deployer = addressParam(params, "deployer")
    const instance = addressParam(params, "instance")
    if (deployer) return cachedJson({ chainId: chain.id, deployer, deployments: await deploymentsBy(chain, deployer) }, 30)
    if (instance) {
      const deployment = (await deploymentOf(chain, instance)) ?? null
      // A miss may be a deploy that is seconds old, so only a hit is cached.
      return cachedJson({ chainId: chain.id, instance, deployment }, deployment ? 30 : 0)
    }
    throw new BadRequest("Send deployer or instance.")
  } catch (error) {
    return errorJson(error, "deployments")
  }
}
