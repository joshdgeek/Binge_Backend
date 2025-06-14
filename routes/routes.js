const { Router } = require("express");
const { sendSol } = require("../controllers/sendSol.js");
const { transfer } = require("../controller/sendSPL.js")
const app = Router();

app.post("/transfer", sendSol)

module.exports = app