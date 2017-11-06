const osmosis = require("osmosis")
const density = require("density")
const { resolve } = require("path")
const fetch = require("isomorphic-fetch")

const Product = require("../models/Product")
const Category = require("../models/Category")
const Keyword = require("../models/Keyword")

function createEntityIfNotExists(EntityClass, data, primaryKey) {
  return new EntityClass({ [primaryKey]: data[primaryKey] })
    .fetch()
    .then(function(item) {
      if (!item) {
        return EntityClass.forge(data).save()
      }
    })
}

function getProductDetails(data) {
  return {
    title: data.title
      ? data.title
      : data.title_2 ? data.title_2 : data.pageTitle.slice(12),
    asin: data.asin ? data.asin : data.asin_2 ? data.asin_2 : data.asin_3,
    category_alias: data.category_alias.replace("search-alias=", ""),
    description:
      (data.description ? sanitizeText(data.description) : "") +
      " " +
      (data.description_2 ? sanitizeText(data.description_2) : "") +
      " " +
      (data.about ? sanitizeText(data.about) : "") +
      " " +
      (data.features ? sanitizeText(data.features) : "") +
      " " +
      (data.features_2 ? sanitizeText(data.features_2) : "")
  }
}

function sanitizeText(s) {
  return s.replace(/[\s+\n,.!]/g, " ")
}

exports.index = function(req, res) {
  var listing = []
  var p

  osmosis
    .get("https://www.amazon.com/Best-Sellers/zgbs/ref=zg_bs_tab")
    // .get(
    //   "https://www.amazon.com/Best-Sellers-Appliances/zgbs/appliances/ref=zg_bs_nav_0"
    // )
    .find("#zg_browseRoot li:nth-child(n+2) a")
    .follow("@href")
    .find("#zg_listTitle .category")
    .set("category")
    .find(".zg_page > a")
    .follow("@href")
    .find(".zg_itemWrapper > div > a")
    .follow("@href")
    .set({
      rank: ".rank-number",
      asin: "#ftSelectAsin@value",
      asin_2: "#reviews-image-gallery-container@data-asin",
      asin_3: "#frmProcessGCPCCode_Value + input[name=ASIN]@value",
      category_alias: "#searchDropdownBox option[selected=selected]@value",
      title: "#productTitle",
      title_2: "#btAsinTitle",
      pageTitle: "title",
      description: "#productDescription .content",
      description_2: "#mas-product-description .masrw-content-row",
      // description_3: "#dpx-aplus-product-description_feature_div",
      about: "#fbExpandableSection",
      features: "#feature-bullets",
      features_2: "#feature-bullets-btf .content"
    })
    .data(function(data) {
      const productDetails = getProductDetails(data)

      listing.push(productDetails)

      createEntityIfNotExists(
        Category,
        {
          alias: productDetails.category_alias,
          name: data.category
        },
        "alias"
      )

      return createEntityIfNotExists(Product, productDetails, "asin")
    })
    .done(function() {
      res.json(listing)
    })
    .log(console.log)
    .error(console.log)
}

exports.scrapeCategories = function(req, res) {
  var categories = []

  osmosis
    .get("https://www.amazon.com")
    .find("#searchDropdownBox option")
    .set("name")
    .set("id", "@value")
    .data(function(data) {
      const category = new Category({
        alias: data.id.replace("search-alias=", ""),
        name: data.name.trim()
      })

      categories.push(category)

      return category.save()
    })
    .done(function() {
      res.json(categories)
    })
    .log(console.log)
    .error(function(err) {
      res.status(500).json({
        error: err && err.message
      })
    })
}

exports.splitKeyWordsForCategory = function(req, res) {
  var categoryAlias = req.params.categoryAlias

  if (!categoryAlias) {
    res.status(400).json({
      error: "categoryAlias is required"
    })
  }

  new Category({ alias: categoryAlias }).fetch().then(function(category) {
    if (!category) {
      res.status(400).json({
        error: "categoryAlias is invalid"
      })
    }

    Product.collection()
      .query(function(qb) {
        qb.where("category_alias", "=", categoryAlias)
      })
      .fetch()
      .then(function(products) {
        products.map(getDensity)
        res.json(products)
      })
  })
}

function getDensity(product) {
  const st = product.get("title") + " " + product.get("description")

  return density(st)
    .setOptions({
      stopWordFile: resolve("./stopwords.json"),
      maxKeywordLength: 100
    })
    .getDensity()
    .slice(0, 10)
    .filter(function(keyword) {
      return keyword.count > 1
    })
    .map(function(data) {
      const d = {
        text: data.word,
        // product_asin: product.attributes.asin,
        category_alias: product.get("category_alias")
      }
      return createEntityIfNotExists(Keyword, d, "text")
    })
}

exports.assignKeywordRelevancyForCategory = function(req, res) {
  var categoryAlias = req.params.categoryAlias

  Keyword.collection()
    .query(function(qb) {
      qb.where("category_alias", "=", categoryAlias).whereNot("processed", true)
    })
    .fetch()
    .then(function(keywords) {
      Promise.all(
        keywords.map(function(keyword) {
          getKeywordRelevancy(categoryAlias, keyword.get("text"))
          return keyword.set({ processed: true }).save()
        })
      ).then(function() {
        res.json(keywords)
      })
    })
}

function amazonCompletion(categoryAlias, keyword) {
  return fetch(
    `https://completion.amazon.com/search/complete?method=completion&mkt=1&p=Gateway&b2b=0&fresh=0&sv=desktop&client=amazon-search-ui&x=String&search-alias=${categoryAlias}&q=${keyword}&cf=1&fb=1&sc=1&`
  ).then(function(response) {
    return response.text()
  })
}

function isPresent(response, keyword, topScore, categoryAlias) {
  console.log(response, keyword, topScore, categoryAlias)
  const completion = JSON.parse(response.match(/\[.*\]/)[0])[1]
  const modifier = 1 / (completion.length - 1)
  let promiseList = []

  completion.forEach(function(s, i) {
    if (s.match(keyword)) {
      const relevancy = topScore - i * modifier
      promiseList.push(
        saveKeywordRelevancy({
          text: s,
          category_alias: categoryAlias,
          relevancy: relevancy,
          processed: true
        })
      )
    }
  })

  return {
    promise: Promise.all(promiseList),
    count: promiseList.length
  }
}

function saveKeywordRelevancy(key) {
  return new Keyword({ category_alias: key.category_alias, text: key.text })
    .fetch()
    .then(function(keyword) {
      if (!keyword) {
        return Keyword.forge(key).save()
      } else {
        return keyword.set(key).save()
      }
    })
}

function getKeywordRelevancy(categoryAlias, keyword) {
  return amazonCompletion(categoryAlias, keyword.slice(0, 1))
    .then(function(response) {
      let tierOneResult = isPresent(response, keyword, 5, categoryAlias)

      if (tierOneResult.count > 0) {
        throw new Error("Keyword Found")
      } else {
        return tierOneResult.promise
      }
    })
    .then(function() {
      return amazonCompletion(categoryAlias, keyword.slice(0, 2)).then(function(
        response
      ) {
        let tierTwoResult = isPresent(response, keyword, 3, categoryAlias)

        if (tierTwoResult.count > 0) {
          throw new Error("Keyword Found")
        } else {
          return tierTwoResult.promise
        }
      })
    })
    .then(function() {
      return amazonCompletion(categoryAlias, keyword.slice(0, 3)).then(function(
        response
      ) {
        let tierThreeResult = isPresent(response, keyword, 1, categoryAlias)

        if (tierThreeResult.count > 0) {
          throw new Error("Keyword Found")
        } else {
          return tierThreeResult.promise
        }
      })
    })
    .catch(function(error) {
      if (error.message === "Keyword Found") {
        return true
      } else {
        console.error(error)
      }
    })
}

exports.getRelevantKeywordsForCategory = function(req, res) {
  var categoryAlias = req.params.categoryAlias
  Keyword.collection()
    .query(function(qb) {
      qb
        .where("relevancy", "<>", "NULL")
        .andWhere("category_alias", categoryAlias)
        .andWhere("processed", true)
        .orderBy("relevancy", "desc")
    })
    .fetch()
    .then(function(keywords) {
      res.json(keywords)
    })
}

exports.getCategoryAliases = function(req, res) {
  Category.collection()
    .fetch()
    .then(function(categories) {
      res.json(categories)
    })
}
