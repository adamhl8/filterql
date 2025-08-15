import { describe, expect, it } from "bun:test"

import type { Schema } from "~/evaluator/types.js"
import { FilterQL } from "~/index.js"

const testSchema: Schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean", alias: "m" },
  rating: { type: "number" },
  genre: { type: "string" },
  status: { type: "string" },
}

const testData = [
  { title: "The Matrix", year: 1999, monitored: true, rating: 8.7, genre: "Action", status: "Available" },
  { title: "The Matrix Reloaded", year: 2003, monitored: false, rating: 7.2, genre: "Action", status: "Missing" },
  { title: "Inception", year: 2010, monitored: true, rating: 8.8, genre: "Thriller", status: "Available" },
  { title: "Interstellar", year: 2014, monitored: true, rating: 8.6, genre: "Drama", status: "Downloaded" },
  { title: "The Dark Knight", year: 2008, monitored: false, rating: 9.0, genre: "Action", status: "Available" },
]

describe("FilterQL", () => {
  describe("filter", () => {
    it("should return the data as-is when the query is empty", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "")

      expect(result).toEqual(testData)
    })

    it("should filter data based on the query", () => {
      const filterql = new FilterQL(testSchema)
      const complexQuery = `
        (t i*= "tion" || t ^= "Inter" || genre ~= "Action") &&
        (y >= 2000 && y <= 2015) &&
        (rating >= 7.0 || genre i== "DRAMA") &&
        (m || !m) &&
        status != "" &&
        !title $= "Missing Title" &&
        (title != "Excluded")
      `
      const result = filterql.filter(testData, complexQuery)
      expect(result).toHaveLength(4)
      expect(result.map((r) => r.title)).toEqual([
        "The Matrix Reloaded",
        "Inception",
        "Interstellar",
        "The Dark Knight",
      ])
    })
  })
})
