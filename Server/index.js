/* eslint-disable no-console */
const express = require('express');

const app = express();
const port = 3000;

let current = '';
app.get('/setMode', (req, res) => {
    current = req.query.value;
    res.send(`Set to: ${current}`);
});
app.get('/mode', (req, res) => {
    res.send(current);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
