/*
 * Copyright 2019 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isHTML } from '../util/types'
import { Table, Row, isTable } from '../webapp/models/table'
import { ToolbarText } from '../webapp/views/toolbar-text'
import { UsageModel } from '../core/usage-error'
import { MultiModalResponse } from './mmr/types'
import { NavResponse } from './NavResponse'
import Presentation from '../webapp/views/presentation'

export interface MessageBearingEntity {
  message: string
}

export function isMessageBearingEntity(entity: Entity): entity is MessageBearingEntity {
  return (entity as MessageBearingEntity).message !== undefined
}

/**
 * The name part of a metadata bearing resource.
 *
 */
export interface MetadataNamedResource {
  kind?: string

  metadata?: {
    name: string
    namespace?: string
    generation?: string
    creationTimestamp?: string
  }
}

/**
 * A minimal subset of a kubernetes-like resource specification that
 * identifies a resource
 *
 */
export interface MetadataBearing<Content = void> extends MetadataNamedResource {
  apiVersion?: string

  /** optional designation of resource version */
  version?: string

  /** name hash, e.g. the hash part of auto-generated names, or an openwhisk activation id */
  prettyName?: string
  nameHash?: string

  /** family of onclick handlers */
  onclick?: {
    name?: string
    nameHash?: string
    namespace?: string
  }

  content?: Content
  contentType?: string
  toolbarText?: ToolbarText
  presentation?: Presentation
}

export type MetadataBearingWithContent<T extends any = any> = MetadataBearing<T>

export function isMetadataBearing(spec: MetadataBearing | Entity): spec is MetadataBearing {
  const meta = spec as MetadataBearing
  return meta !== undefined && meta.metadata !== undefined && meta.metadata.name !== undefined
}

export interface WithDisplayName extends MetadataBearing {
  spec: {
    displayName: string
  }
}

export function hasDisplayName(resource: MetadataBearing): resource is WithDisplayName {
  const res = resource as WithDisplayName
  return isMetadataBearing(resource) && res.spec !== undefined && typeof res.spec.displayName === 'string'
}

/**
 * Entity with a "resource" field that is MetadataBearing
 *
 */
export interface MetadataBearingByReference<Content = void> extends MetadataBearing<Content> {
  resource: MetadataBearing<Content>
}
export type MetadataBearingByReferenceWithContent<T extends any = any> = MetadataBearingByReference<T>
export function isMetadataBearingByReference<T extends MetadataBearingByReference>(
  spec: MetadataBearing | Entity | MetadataBearingWithContent | T
): spec is T {
  const ref = spec as T
  return ref !== undefined && ref.resource !== undefined && isMetadataBearing(ref.resource)
}

/**
 * A mostly scalar entity
 *
 */
export type SimpleEntity = boolean | string | number | HTMLElement | MessageBearingEntity | Error

/**
 * The plugin returns a mix of types; e.g. `helm status` returns
 * [string, Table, string], where the status `Table` is sandwiched by
 * preface and trailing `string` messages
 *
 */
export type MixedResponsePart = string | Table | HTMLElement
export type MixedResponse = MixedResponsePart[]

export function isMixedResponse(response: Entity): response is MixedResponse {
  return (
    Array.isArray(response) &&
    response.length > 0 &&
    (typeof response[0] === 'string' || isTable(response[0]) || isHTML(response[0]))
  )
}

/**
 * We will do away with this at some point; but, for now, the
 * cli.prompt takes over the REPL temporarily.
 *
 */
export interface LowLevelLoop {
  mode: 'prompt'
}
export function isLowLevelLoop(entity: Entity): entity is LowLevelLoop {
  const looper = entity as LowLevelLoop
  return looper.mode === 'prompt'
}

/**
 * Transforms optional fields to required fields
 *
 */
type Complete<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}

/**
 * A `ResourceModification` command response allows a plugin to inform
 * the core that a CRUD action has been performed against a named
 * resource.
 *
 */
export type ResourceModification = Complete<MetadataNamedResource> & {
  /** for now, we only support deletion modifications */
  verb: 'delete'
}

export function isResourceModification(entity: Entity): entity is ResourceModification {
  const mod = entity as ResourceModification
  return (
    mod !== undefined && mod.verb === 'delete' && typeof mod.kind === 'string' && typeof mod.metadata.name === 'string'
  )
}

/**
 * This allows commands to pass through raw responses from their backend
 *
 */
export type RawContent = any // eslint-disable-line @typescript-eslint/no-explicit-any
export interface RawResponse<Content extends RawContent> {
  mode: 'raw'
  content: Content
}

export function isRawResponse<Content extends RawContent>(entity: Entity<Content>): entity is RawResponse<Content> {
  const raw = entity as RawResponse<Content>
  return raw.mode === 'raw' && raw.content !== undefined
}

/**
 * A potentially more complex entity with a "spec"
 *
 */
export type Entity<
  Content = void,
  RowType extends Row = Row,
  Meta extends MetadataBearing<Content> = MetadataBearing<Content>
> =
  | SimpleEntity
  | Table<RowType>
  | ResourceModification
  | MixedResponse
  | MultiModalResponse
  | NavResponse
  | LowLevelLoop
  | UsageModel
  | Meta
  | RawResponse<Content>
