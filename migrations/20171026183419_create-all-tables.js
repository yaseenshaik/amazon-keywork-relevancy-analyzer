exports.up = function(knex, Promise) {
  return knex.schema
    .createTableIfNotExists("categories", function(table) {
      table.string("alias", 100).primary()
      table.string("name")
      table.timestamps(true, true)
    })
    .createTableIfNotExists("products", function(table) {
      table.string("asin", 100).primary()
      table.string("title")
      table.text("description")
      // table.text("about")
      // table.integer("rank");
      table.string("category_alias", 100).references("categories.alias")
      table.timestamps(true, true)
    })
    .createTableIfNotExists("keywords", function(table) {
      table.increments()
      table.string("text")
      table
        .boolean("processed")
        .defaultTo(false)
        .index()
      table.float("relevancy")
      table.string("category_alias", 100).references("categories.alias")
      // table.string("product_asin", 100).references("products.asin")
      table.timestamps(true, true)
    })
}

exports.down = function(knex, Promise) {
  return knex.schema
    .dropTable("keywords")
    .dropTable("products")
    .dropTable("categories")
}
