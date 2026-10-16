import { z } from "zod";

export const id = z.string().min(4).max(64);
export const text = z.string().trim().min(3).max(160);
export const note = z.string().trim().min(5).max(5000);
export const date = z.iso.date();
export const organisationId = z.uuid();
export const state = (values: readonly [string, ...string[]]) => z.enum(values);
export const toDatabaseState = (value: string) => value.toLowerCase().replaceAll(" ", "_");
