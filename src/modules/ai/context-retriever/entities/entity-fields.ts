import type { FieldDescription } from "@redis-iris/context-retriever/models";

type Field = Omit<FieldDescription, "name">;

/**
 * The fields of a Context Retriever entity, one for each key of the type that holds its data.
 * Leaving a key out, or adding one the type does not have, is a type error, so the entity cannot
 * drift away from the type.
 * @typeParam Data - The type of the data stored under the entity's keys
 * @typeParam Omitted - Keys of the type that are not stored, or that the agent should not see
 */
export type EntityFields<Data, Omitted extends keyof Data = never> = Record<Exclude<keyof Data, Omitted>, Field>;

/**
 * The list of fields that the surface's data model expects
 * @param fields - The fields, by name
 */
export function toFieldDescriptions(fields: Record<string, Field>): FieldDescription[] {
    return Object.entries(fields).map(([name, field]) => ({ name, ...field }));
}
