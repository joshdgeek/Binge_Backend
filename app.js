const express = require('express')
const app = express();
const route = require("./routes/routes.js")
const cors = require("cors")
app.use(cors())
app.use(express.json())

app.use(route);


const port = 5000;

app.listen(port, () => {
    console.log(`listening at port: ${port}`)
})