const osmosis = require("osmosis");
const density = require("density");
const { resolve } = require("path");

const Product = require("../models/Product");
const Category = require("../models/Category");

function createEntityIfNotExists(EntityClass, data, primaryKey) {
  return new EntityClass({ [primaryKey]: data[primaryKey] })
    .fetch()
    .then(function(item) {
      if (!item) {
        return EntityClass.forge(data).save();
      }
    });
}

function getProductDetails(data) {
  // console.log('==================================')
  // console.log(data.description_array);
  // console.log('==================================')

  return {
    title: data.title
      ? data.title
      : data.title_2 ? data.title_2 : data.pageTitle.slice(12),
    asin: data.asin ? data.asin : data.asin_2 ? data.asin_2 : data.asin_3,
    rank: data.rank,
    category_alias: data.category_alias.replace("search-alias=", ""),
    about: data.about
      ? sanitizeText(data.about)
      : data.features
        ? sanitizeText(data.features)
        : data.features_2 ? sanitizeText(data.features_2) : "",
    description: data.description
      ? sanitizeText(data.description)
      : data.description_2 ? sanitizeText(data.description_2) : ""
  };
}

function sanitizeText(s) {
  return s.replace(/[\s+\n,.!]/g, " ");
}

exports.index = function(req, res) {
  var listing = [];
  var p;

  osmosis
    .get("https://www.amazon.com/Best-Sellers/zgbs/ref=zg_bs_tab")
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
      description: "#productDescription",
      description_2: "#mas-product-description .masrw-content-row",
      description_3: "#dpx-aplus-product-description_feature_div",
      description_array: ["#productDescription", "#mas-product-description .masrw-content-row", "#dpx-aplus-product-description_feature_div"],
      about: "#fbExpandableSection",
      features: "#feature-bullets",
      features_2: "#feature-bullets-btf .content"
    })
    .data(function(data) {
      const productDetails = getProductDetails(data);

      listing.push(productDetails);

      createEntityIfNotExists(
        Category,
        {
          alias: productDetails.category_alias,
          name: data.category
        },
        "alias"
      );

      return createEntityIfNotExists(Product, productDetails, "asin");
    })
    .done(function() {
      res.json(listing);

      // res.json(
      //   density(p.description)
      //     .setOptions({
      //       stopWordFile: resolve("./stopwords.json"),
      //       maxKeywordLength: 100
      //     })
      //     .getDensity()
      // );
    })
    .log(console.log)
    .error(function(err) {
      res.status(500).json({
        error: err && err.message
      });
    });
};

exports.scrapeCategories = function(req, res) {
  var categories = [];

  osmosis
    .get("https://www.amazon.com")
    .find("#searchDropdownBox option")
    .set("name")
    .set("id", "@value")
    .data(function(data) {
      const category = new Category({
        alias: data.id.replace("search-alias=", ""),
        name: data.name.trim()
      });

      categories.push(category);

      return category.save();
    })
    .done(function() {
      res.json(categories);
    })
    .log(console.log)
    .error(function(err) {
      res.status(500).json({
        error: err && err.message
      });
    });
};
