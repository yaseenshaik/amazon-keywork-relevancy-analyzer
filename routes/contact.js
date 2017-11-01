const express = require("express");

const contactController = require("../controllers/contact");

const router = express.Router();

module.exports = () =>
  router
    .get("/contact", contactController.contactGet)
    .post("/contact", contactController.contactPost);
