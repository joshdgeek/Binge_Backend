const express = require('express')
const app = express();
const route = require("./routes/routes.js")
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config()
app.use(cors())
app.use(express.json())

app.use(route);


const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`listening at port: ${port}`)
})