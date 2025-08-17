<p align="center">
<h1 align="center"><img style="color:#36BCF7; width:38px; height:38px;" src="https://raw.githubusercontent.com/adamhl8/filterql/refs/heads/main/assets/logo.svg"> FilterQL</h1>
</p>

A tiny query language for filtering structured data 🚀

[![Typing SVG](<https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=14&pause=7500&width=600&height=25&lines=(genre+%3D%3D+Action+%7C%7C+genre+%3D%3D+Comedy)+%26%26+year+%3E%3D+2000+%26%26+rating+%3E%3D+8.5>)](https://git.io/typing-svg)

---

There are two main parts of this repository: the TypeScript library and the [FilterQL language specification](#language-specification). Implementations in other languages are more than welcome!

<!-- toc -->

- [TypeScript Library](#typescript-library)
  - [Installation](#installation)
  - [Usage](#usage)
  - [A more realistic example](#a-more-realistic-example)
  - [Queries](#queries)
    - [Logical Operators](#logical-operators)
    - [Comparison Operators](#comparison-operators)
    - [Boolean Fields](#boolean-fields)
    - [Quoted Values](#quoted-values)
    - [Empty Value Checks](#empty-value-checks)
  - [Schemas](#schemas)
  - [FilterQL Options](#filterql-options)
  - [API Reference](#api-reference)
    - [`FilterQL` class](#filterql-class)
- [Language Specification](#language-specification)
  - [Grammar](#grammar)
  - [Comparison Operators](#comparison-operators-1)
  - [Logical Operators](#logical-operators-1)
  - [Syntax Rules](#syntax-rules)
  - [Implementation](#implementation)

<!-- tocstop -->

## TypeScript Library

### Installation

```bash
bun add filterql
# or: npm install filterql
```

### Usage

Define a schema for your data and create a FilterQL instance:

```ts
import { FilterQL } from "filterql"

// The schema determines what fields are allowed in the query
const schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean", alias: "m" },
  rating: { type: "number" },
  genre: { type: "string" },
}

const filterql = new FilterQL(schema)

const movies = [
  { title: "The Matrix", year: 1999, monitored: true, rating: 8.7, genre: "Action" },
  { title: "Inception", year: 2010, monitored: true, rating: 8.8, genre: "Thriller" },
  { title: "The Dark Knight", year: 2008, monitored: false, rating: 9.0, genre: "Action" },
]

// Filter movies by genre
const actionMovies = filterql.filter(movies, "genre == Action")

// Field aliases and multiple comparisons
const recentGoodMovies = filterql.filter(movies, "y >= 2008 && rating >= 8.5")

// Filter using boolean shorthand
const monitoredMovies = filterql.filter(movies, "monitored")
```

### A more realistic example

Let's say you're building a CLI tool that fetches some data to be filtered by a query the user provides:

```ts
import { FilterQL } from "filterql"

// data is an array of objects
const data = await (await fetch("https://api.example.com/movies")).json()

const query = process.argv[2] // first argument

const schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean", alias: "m" },
  rating: { type: "number" },
  genre: { type: "string" },
}

const filterql = new FilterQL(schema)
const filteredMovies = filterql.filter(data, query)

console.log(filteredMovies)
```

And then the user might use your CLI tool like this:

```sh
movie-cli '(genre == Action || genre == Comedy) && year >= 2000 && rating >= 8.5'
```

### Queries

The most basic query is a single comparison: `<field> <comparison operator> <value>`

```
title == Interstellar
```

You can also use the alias for a field:

```
t == Interstellar
```

Combine multiple comparisons using logical operators for more complex queries:

```
title == Interstellar && year == 2014
```

Whitespace is ignored/optional: `title == Interstellar` is equivalent to `title==Interstellar`.

#### Logical Operators

The following logical operators can be used in queries:

- `()` (parentheses for grouping)
- `!` (not)
- `&&` (and)
- `||` (or)

Note that these operators are listed in order of precedence. This is important because many queries will likely require parentheses to do what you want. For example:

`genre == Action || genre == Thriller && rating >= 8.5` means "genre must be Action or, genre must be Thriller and rating must be at least 8.5." This probably isn't what you want.

`(genre == Action || genre == Thriller) && rating >= 8.5` means "genre must be Action or Thriller, and rating must be at least 8.5."

#### Comparison Operators

The following comparison operators can be used in comparisons:

- `==` (equals)
- `!=` (not equals)
- `*=` (contains)
- `^=` (starts with)
- `$=` (ends with)
- `~=` (matches regex)
- `>=` (greater than or equal)
- `<=` (less than or equal)

Comparisons are case-sensitive. To make them case-insensitive, prefix the comparison operator with `i`:

```
title i== interstellar
```

#### Boolean Fields

For boolean fields, you can use the field name without any comparison to check for truthiness:

`downloaded` is equivalent to `downloaded == true`

`!downloaded` is equivalent to `!(downloaded == true)`

#### Quoted Values

If your comparison value has spaces, you must enclose it in double quotes:

```
title == "The Dark Knight"
```

Inside a quoted value, double quotes must be escaped:

```
title == "A title with \"quotes\""
```

Values containing [certain characters](#syntax-rules) must be quoted (when in doubt, wrap your value in double quotes):

```
title == "Airplane!"
```

#### Empty Value Checks

Sometimes the data you're filtering might have empty values (`""`, `undefined`, `null`). You can filter for empty values by comparing to an empty string:

Get all entries that _don't_ have a rating:

```
rating == ""
```

Get all entries that have a rating:

```
rating != ""
```

### Schemas

The schema given to the `FilterQL` constructor determines what fields are allowed in queries.

Each field has a type and an (optional) alias.

```ts
const schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean" },
}
```

Field types determine validation behavior:

- `string`: The value must be coercible to a string (this is always the case)
- `number`: The value must be coercible to a number
- `boolean`: The value must be `true` or `false`

### FilterQL Options

```ts
const filterql = new FilterQL(schema, {
  allowUnknownFields: true,
})
```

The `FilterQL` constructor accepts an optional `options` object with the following properties:

- `allowUnknownFields` (default: `false`): By default, an error is thrown if a query contains a field that's not in the schema. If `true`, unknown fields are allowed.

### API Reference

#### `FilterQL` class

```ts
class FilterQL {
  constructor(schema: Schema, options?: FilterQLOptions)
  filter<T extends Record<string | number | symbol, unknown>>(data: T[], query: string): T[]
}
```

The `Lexer`, `Parser`, and `Evaluator` classes are also exported if you want to do something custom.

## Language Specification

### Grammar

FilterQL follows this grammar:

```
query := expr
expr := and_expr ( "||" and_expr )*
and_expr := term ( "&&" term )*
term := "!" term | "(" expr ")" | comparison
comparison := field operator value | field
```

### Comparison Operators

| Operator | Description           | Example                 |
| -------- | --------------------- | ----------------------- |
| `==`     | Equals                | `title == Interstellar` |
| `!=`     | Not equals            | `title != "The Matrix"` |
| `*=`     | Contains              | `title *= "Matrix"`     |
| `^=`     | Starts with           | `title ^= The`          |
| `$=`     | Ends with             | `title $= Knight`       |
| `~=`     | Regular expression    | `title ~= ".*Matrix.*"` |
| `>=`     | Greater than or equal | `year >= 2000`          |
| `<=`     | Less than or equal    | `rating <= 8.0`         |

Any comparison operator can be prefixed with `i` (used to make a comparison case-insensitive):

```
title i== "the matrix"
```

### Logical Operators

| Operator | Description            | Example                               | Precedence (in order from highest to lowest) |
| -------- | ---------------------- | ------------------------------------- | -------------------------------------------- |
| `()`     | Parentheses (grouping) | `(year >= 2000 && year <= 2010)`      | Highest precedence                           |
| `!`      | NOT                    | `!title *= Matrix`                    | Right associative                            |
| `&&`     | AND                    | `monitored && year >= 2000`           | Left associative                             |
| `\|\|`   | OR                     | `genre == Action \|\| genre == Drama` | Left associative                             |

### Syntax Rules

- Whitespace (spaces, tabs, newlines) is ignored/optional EXCEPT for the following two cases:
  - Case-insensitive comparison operators **must** be preceded by whitespace. This is to avoid ambiguous queries such as `ends-in-i==value` (is this `ends-in-i == value` or `ends-in- i== value`?)
  - Whitespace acts as a terminator for fields and unquoted values
- Queries are terminated by end of input
- Fields and values are terminated by the following characters/strings: whitespace (` `, `\t`, `\n`, `\r`) and token characters (`"`, `(`, `)`, `!`, `&&`, `\|\|`, `==`, `!=`, `*=`, `^=`, `$=`, `~=`, `>=`, `<=`)
  - Values must be quoted if they contain any of these characters
  - Note: Fields and unquoted values are lexed in exactly the same way. However, they can be differentiated because values are *always* preceded by a comparison operator.
- Fields can be used without a comparison operator: `monitored` is equivalent to `monitored == true`
- Values are either **unquoted** or **quoted**
  - Values requiring spaces must be enclosed in double quotes: `"The Matrix"`
  - Double quotes (`"`) are the only valid quotes
  - Double quotes inside quoted values are escaped with a backslash (`\"`): `"a value with \"quotes\""`
    - This is the only supported escape sequence
  - Empty quoted values are valid: `""`

### Implementation

This repository serves as a reference implementation for the language. See [evaluator.ts](./src/evaluator/evaluator.ts) for implementation details.
