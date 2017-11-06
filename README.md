## Instructions

* Make sure you have mysql server started and running first.
* Copy `.env.example` to `.env` and fill the details
* Run `yarn install` to install all dependencies
* Run `yarn migrate` to create tables in the db
* Run `yarn dev` then open `localhost:3000` in the browser

## Usage & Notes
* opening `/scrape` should start scraping the best sellers in all categories.
* `/category` should give all extracted category aliases. Use this alias to perform the following operation.
* `/extract-keywords/:categoryAlias` should extract all the high density keywords
* `/assign-relevancy/:categoryAlias` should assign a relevancy score between 0-5
* `/relevant-keywords/:categoryAlias` should give all relevant keywords for a particular category