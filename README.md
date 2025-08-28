<p align="center">
<h1 align="center"><img style="color:#36BCF7; width:38px; height:38px;" src="https://raw.githubusercontent.com/adamhl8/filterql/refs/heads/main/assets/logo.svg"> FilterQL</h1>
</p>

A tiny query language for filtering structured data 🚀

<!-- https://readme-typing-svg.demolab.com/demo/?font=JetBrains+Mono&size=16&duration=3000&pause=7500&vCenter=true&width=690&height=25&lines=(genre+%3D%3D+Action+%7C%7C+genre+%3D%3D+Comedy)+%26%26+rating+%3E%3D+8.5+%7C+SORT+rating+desc -->

[![Typing SVG](<https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=16&duration=3000&pause=7500&vCenter=true&width=690&height=25&lines=(genre+%3D%3D+Action+%7C%7C+genre+%3D%3D+Comedy)+%26%26+rating+%3E%3D+8.5+%7C+SORT+rating+desc>)](https://git.io/typing-svg)

---

In addition to the [Overview](#overview) below, there are three main sections of this README:

- **[Queries](#queries)** - How to write queries
- **[TypeScript Library](#typescript-library)** - Usage of the FilterQL TypeScript library
- **[FilterQL language specification](#language-specification)**

## Overview

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

const filterql = new FilterQL({ schema })

const movies = [
  { title: "The Matrix", year: 1999, monitored: true, rating: 8.7, genre: "Action" },
  { title: "Inception", year: 2010, monitored: true, rating: 8.8, genre: "Thriller" },
  { title: "The Dark Knight", year: 2008, monitored: false, rating: 9.0, genre: "Action" },
]

// Filter movies by genre
const actionMovies = filterql.query(movies, "genre == Action")

// Field aliases and multiple comparisons
const recentGoodMovies = filterql.query(movies, "y >= 2008 && rating >= 8.5")

// Sort the filtered data by using the built-in SORT operation
const recentGoodMovies = filterql.query(movies, "year >= 2008 | SORT rating desc")

// Filter using boolean shorthand
const monitoredMovies = filterql.query(movies, "monitored")
```

---

<!-- toc -->

- [Queries](#queries)
  - [Logical Operators](#logical-operators)
  - [Comparison Operators](#comparison-operators)
  - [Boolean Fields](#boolean-fields)
  - [Quoted Values](#quoted-values)
  - [Empty Value Checks](#empty-value-checks)
  - [Match-All](#match-all)
  - [Operations](#operations)
- [TypeScript Library](#typescript-library)
  - [Installation](#installation)
  - [Example](#example)
  - [Schemas](#schemas)
  - [Handling data](#handling-data)
  - [Options](#options)
  - [Custom Operations](#custom-operations)
  - [API Reference](#api-reference)
- [Language Specification](#language-specification)
  - [Grammar](#grammar)
  - [Comparison Operators](#comparison-operators-1)
  - [Logical Operators](#logical-operators-1)
  - [Match-All](#match-all-1)
  - [Operations](#operations-1)
  - [Syntax Rules](#syntax-rules)
  - [Implementation](#implementation)

<!-- tocstop -->

---

## Queries

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

### Logical Operators

The following logical operators can be used in queries:

- `()` (parentheses for grouping)
- `!` (not)
- `&&` (and)
- `||` (or)

> [!TIP]
> Note that these operators are listed in order of precedence. This is important because many queries will likely require parentheses to do what you want.

For example:

`genre == Action || genre == Thriller && rating >= 8.5` means "genre must be Action or, genre must be Thriller and rating must be at least 8.5." This probably isn't what you want.

`(genre == Action || genre == Thriller) && rating >= 8.5` means "genre must be Action or Thriller, and rating must be at least 8.5."

### Comparison Operators

The following comparison operators can be used in comparisons:

- `==` (equals)
- `!=` (not equals)
- `*=` (contains)
- `^=` (starts with)
- `$=` (ends with)
- `~=` (matches regex)
- `>=` (greater than or equal)
- `<=` (less than or equal)

> [!TIP]
> Comparisons are case-sensitive. To make them case-insensitive, prefix the comparison operator with `i`.

```
title i== interstellar
```

### Boolean Fields

For boolean fields, you can use the field name without any comparison to check for `true`:

`downloaded` is equivalent to `downloaded == true`

`!downloaded` is equivalent to `!(downloaded == true)`

### Quoted Values

If your comparison value has spaces, you must enclose it in double quotes:

```
title == "The Dark Knight"
```

Inside a quoted value, double quotes must be escaped:

```
title == "A title with \"quotes\""
```

Values ending with `)` _as part of the value_ (not a closing parenthesis) must be quoted:

```
title == "(a title surrounded by parentheses)"
```

### Empty Value Checks

Sometimes the data you're filtering might have empty values (`""`, `undefined`, `null`). You can filter for empty values by comparing to an empty string:

Get all entries that _don't_ have a rating:

```
rating == ""
```

Get all entries that have a rating:

```
rating != ""
```

### Match-All

If you want to get _all_ of the entries, use `*` (the data is not filtered):

```
*
```

This is mainly useful when you don't want to filter the data but want to apply operations to it.

```
* | SORT rating desc
```

### Operations

After filtering, you can apply operations to transform the data: `<filter> | <operation> [arg]...`

```
year >= 2000 | SORT rating desc | LIMIT 10
```

- Operations are applied in the order they are specified.
- The same operation can be applied multiple times.

#### Built-in Operations

There are currently two built-in operations:

- `SORT`: Sorts the data by the specified field.
  - `SORT <field> [direction]`
  - `direction` can be `asc` or `desc` (default: `asc`).
- `LIMIT`: Limits the number of entries returned.
  - `LIMIT <number>`

If you have any suggestions for other operations, please let me know by opening an issue!

> [!TIP]
> You can also define **[custom operations](#custom-operations)**.

## TypeScript Library

### Installation

```bash
bun add filterql
# or: npm install filterql
```

### Example

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

const filterql = new FilterQL({ schema })
const filteredMovies = filterql.query(data, query)

console.log(filteredMovies)
```

And then the user might use your CLI tool like this:

```sh
movie-cli '(genre == Action || genre == Comedy) && year >= 2000 && rating >= 8.5'
```

### Schemas

The schema given to the `FilterQL` constructor determines what fields and value types are allowed in queries.

> [!IMPORTANT]
> The type of data the `FilterQL` methods accept is `Record<string, unknown>`. This means that **FilterQL does not care about extra properties/keys in the _data_**.
>
> In other words, a schema's keys can be a subset of the data's keys.
>
> Similarly, **the schema is _not_ used to validate the data**. It is only used to validate the values given in the _query_.
>
> See the [Handling data](#handling-data) section.

Each field has a `type` and an (optional) `alias`.

```ts
const schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean" },
}

const filterql = new FilterQL({ schema })
```

Field types determine validation behavior:

- `string`: The value must be coercible to a string (this is always the case)
- `number`: The value must be coercible to a number
- `boolean`: The value must be `true` or `false`

When a comparison value can't be coerced to the field's type, an error is thrown. For example, consider a query like `year = foo`.

- The comparison value of `foo` can't be coerced to a number, so an error is thrown.

### Handling data

It's important to note that query comparisons are only evaluated against certain data types.

- Specifically, a data value must be one of `string`, `number`, or `boolean`, `undefined`, or `null` to be evaluated.

For example, say we have the following data:

```ts
const people = [
  {
    name: "Bob",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Anytown",
    },
    roles: ["admin", "user"],
  },
  // more people...
]
```

Passing in data like this is perfectly valid, but because the `address` and `roles` properties are not one of the comparable types, they can't be filtered on. e.g. a query like `roles == admin` won't return any results.

If you want to filter on nested data like this, you should transform the data into a flat structure before passing it to FilterQL.

For example, say you wanted to query for people who have the `"admin"` role. You could transform the data like this:

```ts
// query: 'roles_admin == true'
{
  name: "Bob",
  age: 30,
  address_street: "123 Main St",
  address_city: "Anytown",
  roles_admin: true,
  roles_user: true,
}
```

Or maybe something like this, where we join the elements/properties together:

```ts
// query: 'roles *= admin'
{
  name: "Bob",
  age: 30,
  address: "123 Main St, Anytown",
  roles: "admin, user",
}
```

> Why not support nested data structures?

Supporting nested data structures would require a more complex syntax, which goes against FilterQL's general principle that the query language should be relatively simple and easy to understand.

By effectively "forcing" data to be flattened (if you want to filter on those elements/properties), _that extra complexity/work is the developer's responsibility, not the person who's writing the query_.

### Options

```ts
const filterql = new FilterQL({
  schema,
  options: {
    allowUnknownFields: false,
  },
})
```

The `FilterQL` constructor accepts an optional `options` object with the following properties:

`allowUnknownFields` (default: `false`): By default, an error is thrown if a query contains a field that's not in the schema. If `true`, unknown fields are allowed.

- This could be useful in situations where the schema can't be determined ahead of time. i.e. the keys of the data are unknown or may change.

### Custom Operations

> [!TIP]
> Take a look at the built-in operations in [src/operation-evaluator/operations.ts](./src/operation-evaluator/operations.ts) to see how they're implemented.

Let's say you want to create a custom operation called `ROUND` that takes a field name as the first argument and rounds the number value of that field.

A query might look something like `year >= 2000 | SORT rating desc | ROUND rating`.

You can define custom operations by providing a `customOperations` object to the `FilterQL` constructor.

- The keys are the names of the custom operations and **must** be all uppercase.
- The values are functions that return the transformed data.

```ts
import type { OperationMap } from "filterql"

const customOperations: OperationMap = {
  ROUND: (data, args, { resolveField }) => {
    const field = resolveField(args[0]) // the first argument might be the alias of the field
    if (!field) throw new Error(`Unknown field '${args[0]}' for operation 'ROUND'`)
    return data.map((item) => Math.round(item[field]))
  },
}

const filterql = new FilterQL({ schema: mySchema, customOperations })
```

Three arguments are provided to a given operation function:

- `data`: The data after its been filtered (and transformed by any previous operations).
- `args`: A string array containing any arguments passed to the operation.
- `operationHelpers`: An object containing the FilterQL instance `schema`, `options`, and a `resolveField` function.
  - The `resolveField` function takes a string and returns the full field name if it exists in the schema. Use it to support field aliases in operations. e.g. `"t" -> "title"` or `"title" -> "title"` (full field name resolves to itself).

Built-in operations can be overridden by providing a custom operation with the same name:

```ts
const customOperations: OperationMap = {
  SORT: (data, args, { resolveField }) => {
    // your custom SORT implementation
  },
}
```

### API Reference

In addition to the primary `query` method, the `parse`, `applyFilter`, and `applyOperations` methods are available. These may be useful in cases where you want to filter and apply operations separately.

```ts
class FilterQL {
  constructor({
    schema: Schema,
    options?: FilterQLOptions,
    customOperations?: OperationMap
  })

  /** Filter and apply operations to a data array with the given query */
  query<T extends Record<string, unknown>>(data: T[], query: string): T[]

  /**
   * Parse a query string into an `ASTNode` containing the `FilterNode` and `OperationNode[]`
   *
   * You can use the returned `ASTNode` with the `applyFilter` and `applyOperations` methods
   */
  parse(query: string): ASTNode

  /** Apply the given `FilterNode` to a data array */
  applyFilter<T extends DataObject>(data: T[], filter: FilterNode): T[]

  /** Apply the given `OperationNode[]` to a data array */
  applyOperations<T extends DataObject>(data: T[], operations: OperationNode[]): T[]
}
```

## Language Specification

> [!NOTE]
> Implementations in other languages are more than welcome!

### Grammar

FilterQL follows this grammar:

```
query := filter ( "|" operation )*
filter := expr
operation := operation_name arg*
expr := and_expr ( "||" and_expr )*
and_expr := term ( "&&" term )*
term := "!" term | "(" expr ")" | comparison
comparison := field operator value | field | "*"
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

### Match-All

The `*` character can be used in place of a comparison. When evaluated, it _always_ matches.

Examples:

`* | SORT year`: Matches all entries and then sorts by `year`.

`title == Matrix || * | SORT year`: This is effectively the same as the above query because the `|| *` matches all entries.

### Operations

Operations can be chained after the filter expression using the pipe operator (`|`). Each operation consists of an uppercase operation name followed by zero or more arguments:

```
title == "Matrix" | SORT year
rating >= 8.5 | SORT rating desc | LIMIT 10
```

### Syntax Rules

- Tokens/words in queries are terminated by whitespace (` `, `\t`, `\n`, `\r`)
  - e.g. a query like `title==Matrix` would be tokenized as _one_ token with a value of `"title==Matrix"`
- Queries are terminated by end of input
- Fields can be used without a comparison operator: `monitored` is equivalent to `monitored == true`
- Fields and values can have operators "attached" to them that are automatically split off during tokenization:
  - Fields can have one or more leading operators (`!`, `(`) and trailing operators (`)`) attached. e.g. `!(monitored)` becomes tokens: `["!", "(", "monitored", ")"]`
  - Values can have one or more trailing operators (`)`) attached. e.g. `(title == Matrix)` becomes tokens: `["(", "title", "==", "Matrix", ")"]`
    - As a consequence, values ending with `)` _as part of the value_ must be quoted: `field == "(value)"`
  - This allows for natural syntax like `!(field == value)` without requiring spaces around operators
- Values are either **unquoted** or **quoted**
  - Values requiring whitespace must be enclosed in double quotes: `"The Matrix"`
  - Double quotes (`"`) are the only valid quotes
  - Double quotes inside quoted values are escaped with a backslash (`\"`): `"a value with \"quotes\""`
    - This is the only supported escape sequence
  - Empty quoted values are valid: `""`
- Values are _always_ preceded by a comparison operator, which is how they can be differentiated from fields
- Operation names must be all uppercase

### Implementation

This repository serves as a reference implementation for the language. There are many non-syntax rules/considerations that are not covered in this section of the README. See the source code for implementation details.
