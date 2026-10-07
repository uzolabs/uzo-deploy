// Builds the factory calls for each template: deploy() for signing and predictAddress()
// for the review step. Both take the same arguments after the deployer, so the address
// shown on review is the address the transaction creates.
import { bytesToHex, type Abi, type Address, type Hex } from "viem"
import { uzoNftFactoryAbi, uzoTipJarFactoryAbi, uzoTokenFactoryAbi } from "@/lib/abi/generated"
import type { NftParams, TipJarParams, TokenParams } from "@/lib/validation"

export type DeployInput =
  | { key: "token"; params: TokenParams }
  | { key: "nft"; params: NftParams }
  | { key: "tipJar"; params: TipJarParams }

/**
 * Kept loosely typed on purpose: the three factories take different arguments, and wagmi's
 * hooks cannot infer from a union of ABIs. Each case below is still checked by encodeFunctionData
 * in the tests.
 */
export type ContractCall = { address: Address; abi: Abi; functionName: string; args: readonly unknown[] }

/** A fresh random salt. Generated once per review so the predicted address stays stable. */
export function randomSalt(): Hex {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

export function deployCall(factory: Address, input: DeployInput, salt: Hex): ContractCall {
  switch (input.key) {
    case "token": {
      const p = input.params
      return {
        address: factory,
        abi: uzoTokenFactoryAbi,
        functionName: "deploy",
        args: [salt, p.name, p.symbol, p.initialSupply, p.recipient],
      } as const
    }
    case "nft":
      return {
        address: factory,
        abi: uzoNftFactoryAbi,
        functionName: "deploy",
        args: [salt, input.params],
      } as const
    case "tipJar": {
      const p = input.params
      return {
        address: factory,
        abi: uzoTipJarFactoryAbi,
        functionName: "deploy",
        args: [salt, p.recipient, p.title],
      } as const
    }
  }
}

export function predictCall(factory: Address, deployer: Address, input: DeployInput, salt: Hex): ContractCall {
  switch (input.key) {
    case "token": {
      const p = input.params
      return {
        address: factory,
        abi: uzoTokenFactoryAbi,
        functionName: "predictAddress",
        args: [deployer, salt, p.name, p.symbol, p.initialSupply, p.recipient],
      } as const
    }
    case "nft":
      return {
        address: factory,
        abi: uzoNftFactoryAbi,
        functionName: "predictAddress",
        args: [deployer, salt, input.params],
      } as const
    case "tipJar": {
      const p = input.params
      return {
        address: factory,
        abi: uzoTipJarFactoryAbi,
        functionName: "predictAddress",
        args: [deployer, salt, p.recipient, p.title],
      } as const
    }
  }
}
