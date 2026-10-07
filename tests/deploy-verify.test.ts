// The deploy call the app signs and the constructor arguments /api/verify rebuilds from it
// must agree, or BOTScan verification fails. These tests tie the two together.
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  parseAbiParameters,
  stringToHex,
  type AbiEvent,
  type Hex,
} from "viem"
import { describe, expect, it } from "vitest"
import { uzoTokenFactoryAbi } from "@/lib/abi/generated"
import { deployCall, predictCall, randomSalt, type DeployInput } from "@/lib/deploy-call"
import {
  COMPILER,
  bytes32ToId,
  constructorArgsFor,
  findDeployedEvent,
  manualVerifyCommand,
  verificationForm,
  verificationRequest,
} from "@/lib/verify"

const factory = getAddress("0x37370f4504d0703c40c90e31beb536cd1d772c7e")
const me = getAddress("0xff08064bc2764216de386ccdc4412f3727a8b246")
const usdt = getAddress("0x1111111111111111111111111111111111111111")
const instance = getAddress("0x2222222222222222222222222222222222222222")
const salt = randomSalt()

const token: DeployInput = { key: "token", params: { name: "My Token", symbol: "MYT", initialSupply: 10n ** 24n, recipient: me } }
const nft: DeployInput = {
  key: "nft",
  params: { name: "C", symbol: "C", baseURI: "ipfs://x/", maxSupply: 1000n, owner: me, royaltyReceiver: me, royaltyBps: 500n },
}
const tipJar: DeployInput = { key: "tipJar", params: { recipient: me, title: "Coffee" } }

describe("deploy calls", () => {
  it("encode against each factory ABI", () => {
    for (const input of [token, nft, tipJar]) {
      expect(() => encodeFunctionData(deployCall(factory, input, salt))).not.toThrow()
      expect(() => encodeFunctionData(predictCall(factory, me, input, salt))).not.toThrow()
    }
  })

  it("predicts with the deployer first, then the deploy arguments", () => {
    const deploy = deployCall(factory, token, salt)
    const predict = predictCall(factory, me, token, salt)
    expect(predict.functionName).toBe("predictAddress")
    expect(predict.args).toEqual([me, ...deploy.args])
  })

  it("makes a fresh 32-byte salt each time", () => {
    const a = randomSalt()
    expect(a).toMatch(/^0x[0-9a-f]{64}$/)
    expect(a).not.toBe(randomSalt())
  })
})

describe("constructor arguments", () => {
  it("token", () => {
    const args = constructorArgsFor("uzo.token", encodeFunctionData(deployCall(factory, token, salt)))
    expect(decodeAbiParameters(parseAbiParameters("string, string, uint256, address"), `0x${args}`)).toEqual([
      "My Token",
      "MYT",
      10n ** 24n,
      me,
    ])
  })

  it("nft", () => {
    const args = constructorArgsFor("uzo.nft", encodeFunctionData(deployCall(factory, nft, salt)))
    const types = parseAbiParameters("string, string, string, uint256, address, address, uint96")
    expect(decodeAbiParameters(types, `0x${args}`)).toEqual(["C", "C", "ipfs://x/", 1000n, me, me, 500n])
  })

  it("tip jar includes the factory's USDT and needs it", () => {
    const data = encodeFunctionData(deployCall(factory, tipJar, salt))
    expect(() => constructorArgsFor("uzo.tipjar", data)).toThrow()
    const args = constructorArgsFor("uzo.tipjar", data, usdt)
    expect(decodeAbiParameters(parseAbiParameters("address, address, string"), `0x${args}`)).toEqual([me, usdt, "Coffee"])
  })

  it("refuses calls that are not deploy", () => {
    expect(() => constructorArgsFor("uzo.token", encodeFunctionData(predictCall(factory, me, token, salt)))).toThrow()
  })
})

describe("Deployed event", () => {
  const event = uzoTokenFactoryAbi.find((x) => x.type === "event" && x.name === "Deployed") as AbiEvent
  const values: Record<string, unknown> = {
    deployer: me,
    instance,
    templateId: stringToHex("uzo.token", { size: 32 }),
    version: 1,
  }
  const log = {
    address: factory,
    topics: encodeEventTopics({ abi: [event], eventName: "Deployed", args: values }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      event.inputs.filter((i) => !i.indexed),
      event.inputs.filter((i) => !i.indexed).map((i) => values[i.name!]),
    ),
  }

  it("reads the template id", () => {
    expect(bytes32ToId(stringToHex("uzo.token", { size: 32 }))).toBe("uzo.token")
  })

  it("finds the event from a known factory only", () => {
    expect(findDeployedEvent([log], [factory], instance)).toEqual({
      factory,
      deployer: me,
      instance,
      templateId: "uzo.token",
      version: 1,
    })
    expect(findDeployedEvent([log], [usdt], instance)).toBeUndefined()
    expect(findDeployedEvent([log], [factory], usdt)).toBeUndefined()
  })
})

describe("verification request", () => {
  it("builds the BOTScan form from our own build input", async () => {
    const req = verificationRequest(instance, "uzo.token", "abcd")
    expect(req.contractName).toBe("src/templates/UzoToken.sol:UzoToken")
    const form = verificationForm(req, '{"language":"Solidity"}')
    expect(form.get("compiler_version")).toBe(COMPILER)
    expect(form.get("contract_name")).toBe(req.contractName)
    expect(form.get("license_type")).toBe("mit")
    expect(form.get("autodetect_constructor_args")).toBe("false")
    expect(form.get("constructor_args")).toBe("abcd")
    const file = form.get("files[0]") as File
    expect(file.name).toBe("UzoToken.json")
    expect(await file.text()).toBe('{"language":"Solidity"}')
  })

  it("gives a manual command", () => {
    expect(manualVerifyCommand("testnet", me)).toBe(`node script/verify-instance.mjs testnet ${me}`)
  })
})
