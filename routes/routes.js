const { Router } = require("express");
const { sendSol } = require("../controllers/sendSol.js");
const app = Router();

app.post("/transfer", sendSol)

module.exports = app