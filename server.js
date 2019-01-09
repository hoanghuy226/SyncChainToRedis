const express = require('express');
const app = express();
const port = 4000 || process.env.PORT;
const sync_job = require('./app/jobs/blockchain_to_redis.js');
const job = new sync_job();
const sync_job2 = require('./app/jobs/SyncChainToRedis.js');
const job2 = new sync_job2();
const bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());
app.use('/', express.static('public_static'));

app.get('/start', (req, res) => {
  console.log("**start job**");
  // job.start(function (answer) {
  //   res.send(answer);
  // })
  job2.init(function (answer) {
    res.send(answer);
  })
});

app.listen(port, () => {
  // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
  //truffle_connect.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  console.log("Express Listening at http://localhost:" + port);
});