import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode } from "~/parser/types.js"
import type { DataObject, FilterQLOptions, Schema } from "~/types.js"

export const parseQuery = (query: string): ASTNode => new Parser().parse(new Lexer().tokenize(query))

export const testSchema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean", alias: "m" },
  rating: { type: "number" },
  genre: { type: "string" },
  status: { type: "string" },
  undefinedField: { type: "string" },
  nullField: { type: "string" },
  foo: { type: "string" }, // field that's not in the data
} as const satisfies Schema

export const testOptions = {
  allowUnknownFields: false,
} as const satisfies FilterQLOptions

export const testData = [
  {
    title: "The Matrix",
    year: 1999,
    monitored: true,
    rating: 8.7,
    genre: "Action",
    status: "Available",
    undefinedField: undefined,
    nullField: null,
    bar: "some value", // field that's not in the schema
  },
  { title: "The Matrix Reloaded", year: 2003, monitored: false, rating: 7.2, genre: "Action", status: "Missing" },
  { title: "Inception", year: 2010, monitored: true, rating: 8.8, genre: "Thriller", status: "Available" },
  { title: "Interstellar", year: 2014, monitored: true, rating: 8.6, genre: "Drama", status: "Downloaded" },
  { title: "The Dark Knight", year: 2008, monitored: false, rating: 9.0, genre: "Action", status: "Available" },
] as const satisfies DataObject[]
