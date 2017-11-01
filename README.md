## Instructions

* Make sure you have mysql server started and running first.
* Copy `.env.example` to `.env` and fill the details
* Run `yarn install` to install all dependencies
* Run `yarn migrate` to create tables in the db
* Run `yarn dev` then open `localhost:3000` in the browser

## Usage & Notes
* opening `/scrape` should start scraping the best sellers in all categories. The only way to currently access the deata is to view the tables in any sqlclient (e.g. HeidiSQL, sequel pro)
* Keyword relevancy is still being worked upon.