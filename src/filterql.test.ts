import { describe, expect, it } from "bun:test"

import { FilterQL } from "~/index.js"
import type { Schema } from "~/parser/types.js"

// Test schema and data
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
  describe("basic filtering", () => {
    it("should return the data as-is when the query is empty", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "")

      expect(result).toEqual(testData)
    })

    it("should filter by string comparison", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'genre == "Action"')

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded", "The Dark Knight"])
    })

    it("should filter by number comparison", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "year >= 2008")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["Inception", "Interstellar", "The Dark Knight"])
    })

    it("should filter by boolean comparison", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "monitored")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception", "Interstellar"])
    })

    it("should use field aliases", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 't *= "Matrix"')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded"])
    })

    it("should filter with unquoted values", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "status == Available")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception", "The Dark Knight"])
    })
  })

  describe("string operators", () => {
    it("should handle equals operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title == "The Matrix"')

      expect(result).toHaveLength(1)
      expect(result.map((r) => r.title)).toEqual(["The Matrix"])
    })

    it("should handle not equals operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title != "The Matrix"')

      expect(result).toHaveLength(4)
      expect(result.map((r) => r.title)).toEqual([
        "The Matrix Reloaded",
        "Inception",
        "Interstellar",
        "The Dark Knight",
      ])
    })

    it("should handle contains operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title *= "Matrix"')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded"])
    })

    it("should handle starts with operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title ^= "The"')

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded", "The Dark Knight"])
    })

    it("should handle ends with operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title $= "Knight"')

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("The Dark Knight")
    })

    it("should handle regex operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title ~= ".*Matrix.*"')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded"])
    })

    it("should handle case-insensitive operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title i*= "MATRIX"')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded"])
    })

    it("should handle case-insensitive regex", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title i~= "matrix"')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded"])
    })

    it("should handle invalid regex gracefully", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'title ~= "[invalid"')

      expect(result).toHaveLength(0) // Invalid regex returns no matches
    })
  })

  describe("numeric operators", () => {
    it("should handle greater than or equal", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "rating >= 8.7")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception", "The Dark Knight"])
    })

    it("should handle less than or equal", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "rating <= 8.0")

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("The Matrix Reloaded")
    })
  })

  describe("logical operations", () => {
    it("should handle AND operations", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'genre == "Action" && monitored')

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("The Matrix")
    })

    it("should handle OR operations", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "year == 1999 || year == 2010")

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception"])
    })

    it("should handle NOT operations", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, "!monitored")

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix Reloaded", "The Dark Knight"])
    })

    it("should handle NOT with comparisons", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, '!(genre == "Action")')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["Inception", "Interstellar"])
    })

    it("should handle operator precedence", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'genre == "Action" || genre == "Thriller" && rating >= 8.5')

      expect(result).toHaveLength(4) // (Action movies) OR (Thriller movies with rating >= 8.5)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "The Matrix Reloaded", "Inception", "The Dark Knight"])
    })

    it("should handle complex expressions with parentheses", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, '(genre == "Action" || genre == "Thriller") && rating >= 8.5')

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception", "The Dark Knight"])
    })

    it("should handle deeply nested expressions", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(testData, 'monitored && (title i*= "matrix" || rating >= 8.6) && year <= 2010')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["The Matrix", "Inception"])
    })
  })

  describe("empty checks", () => {
    const dataWithEmpty = [
      { title: "", year: 2020, monitored: true, rating: 7.5, genre: "Comedy", status: "Available" },
      { title: "Normal Movie", year: null, monitored: false, rating: 8.0, genre: "", status: undefined },
      { title: "Another Movie", year: 2021, monitored: true, rating: 6.5, genre: "Drama", status: "Missing" },
    ]

    it("should match empty strings", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(dataWithEmpty, 'title == ""')

      expect(result).toHaveLength(1)
      expect(result[0]?.year).toBe(2020)
    })

    it("should match undefined values as empty", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(dataWithEmpty, 'status == ""')

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("Normal Movie")
    })

    it("should match null values as empty", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(dataWithEmpty, 'year == ""')

      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("Normal Movie")
    })

    it("should handle not empty comparisons", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(dataWithEmpty, 'genre != ""')

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.title)).toEqual(["", "Another Movie"])
    })

    it("should handle empty string with contains operator", () => {
      const filterql = new FilterQL(testSchema)
      const result = filterql.filter(dataWithEmpty, 'title *= ""')

      expect(result).toHaveLength(0) // Nothing contains empty string
    })
  })
})
