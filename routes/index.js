const express = require("express")

const HomeController = require("../controllers/home")
const OsmosisController = require("../controllers/scrape")
const contacRouter = require("./contact")

const router = express.Router()

module.exports = () =>
  router
    .get("/", HomeController.index)
    .get("/scrape", OsmosisController.index)
    .get("/scrape-categories", OsmosisController.scrapeCategories)
    .get("/category", OsmosisController.getCategoryAliases)
    .get(
      "/extract-keywords/:categoryAlias",
      OsmosisController.splitKeyWordsForCategory
    )
    .get(
      "/assign-relevancy/:categoryAlias",
      OsmosisController.assignKeywordRelevancyForCategory
    )
    .get(
      "/relevant-keywords/:categoryAlias",
      OsmosisController.getRelevantKeywordsForCategory
    )
    .use(contacRouter())
