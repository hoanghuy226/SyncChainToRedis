// const Web3                        = require('web3');
require('dotenv').config();
const _                           = require('lodash');
const async                       = require('async');
const Utils                       = require('../common/Utils');
const redis                       = require('redis');

const bnbABI                      = require('../../config/abi/bnb');
const network                     = require('../../config/network');

const web3                        = Utils.getWeb3Instance();
const client                      = redis.createClient();
const bnbContract                 = new web3.eth.Contract(bnbABI, network.contractAddresses.bnb);


let LATEST_PROCESSED_BLOCK  = 0;
const BATCH_BLOCK_SIZE      = parseInt(process.env.BATCH_BLOCK_SIZE || 500);
const REQUIRED_CONFIRMATION = parseInt(process.env.REQUIRED_CONFIRMATION || 7);
const PARALLEL_INSERT_LIMIT = 10;

// const env  = process.env;

var countLogs, start, millis,start0, millis0,start1, millis1,start2, millis2;


class SyncChainToRedis {

  redisconnect() {
    //Handle event redis
    client.on('connect', function() {
      console.log('Redis client connected');
    });
    client.on('error', function(err){
      console.log('Something went wrong ', err)
    });
  }

  start () {
    console.log("Web3 version",web3.version);
    this.redisconnect();
    async.auto({
      latestProcessedBlock: (next) => {
        if (LATEST_PROCESSED_BLOCK > 0) {
          return next(null, LATEST_PROCESSED_BLOCK);
        }

        this.getLatestBlockNumber(next);
      },
      processBlocks: ['latestProcessedBlock', (ret, next) => {
        this.processBlocks(ret.latestProcessedBlock, next);
      }]
    }, (err, ret) => {
      let timer = 5000; //networkConfig.averageBlockTime;
      if (err) {
        console.log(err);
        timer = 5000;
      } else {
        console.log(`Already processed the newest block. Crawler will be restarted in 1 block...`);
      }
      setTimeout(() => {
        this.start();
      }, timer);
    });
  }

  //Get lates block number form redis
  getLatestBlockNumber(next) {
   return next(null,6000000);
  }

  //
  processBlocks (latestProcessedBlock, callback) {
    start = Date.now();
    let fromBlockNumber, toBlockNumber;
    latestProcessedBlock  = parseInt(latestProcessedBlock);

    async.auto({
      latestOnchainBlock: (next) => {
        web3.eth.getBlockNumber(next);
      },
      processBlocksOnce: ['latestOnchainBlock', (ret, next) => {
        const latestOnchainBlock = ret.latestOnchainBlock;
        console.log("****** latestOnchainBlock ******:= ",latestOnchainBlock);
        fromBlockNumber = latestProcessedBlock;

        // Crawl the newest block already
        if (fromBlockNumber > latestOnchainBlock - REQUIRED_CONFIRMATION) {
          toBlockNumber = latestProcessedBlock;
          return next(null, true);
        }

        toBlockNumber = latestProcessedBlock + BATCH_BLOCK_SIZE;
        if (toBlockNumber > latestOnchainBlock - REQUIRED_CONFIRMATION) {
          toBlockNumber = latestOnchainBlock - REQUIRED_CONFIRMATION;
        }

        if (toBlockNumber <= fromBlockNumber) {
          return next(null, true);
        }
        
        this._processBlocksOnce(fromBlockNumber, toBlockNumber, next);
      }]
    }, (err, ret) => {
      if (err) {
        return callback(err);
      }

      if (ret.processBlocksOnce === true) {
        return callback(null, true);
      }

      LATEST_PROCESSED_BLOCK = toBlockNumber;
      process.nextTick(() => {
        this.processBlocks(LATEST_PROCESSED_BLOCK, callback);
      });
    });
  }

  //
  _processBlocksOnce (fromBlockNumber, toBlockNumber, callback) {
    console.log(`_processBlocksOnce: ${fromBlockNumber} → ${toBlockNumber}`);
    async.auto({
      logs: (next) => {
        start0 = Date.now();
        bnbContract.getPastEvents("Transfer", {
          //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
          fromBlock: fromBlockNumber,
          toBlock: toBlockNumber
        }, (err, events) => {
          if (err) {
            return next(`Cannot query data from network: ${err.toString()}`);
          }
          millis0 = Date.now() - start0;
          console.log("logs:= ",events.length," - Time getLogs: ",millis0/1000);
          countLogs  = events.length;
          return next(null, events);
        })
        .then(function(events){
            //console.log(events) // same results as the optional callback above
        });
      },
      blockTimestamps: ['logs', (ret, next) => {
        start1 = Date.now();
        const blockNumbers = _.map(ret.logs, 'blockNumber');
        const blockTimestamps = {};

        async.each(blockNumbers, (blockNumber, _next) => {
          // console.log(blockNumber);
          this.getBlockTimestamp(blockNumber, (_err, timestamp) => {
            if (_err) {
              console.log(_err);
            }

            blockTimestamps[blockNumber] = timestamp;
            _next(null, null);
          });
        }, (_err) => {
          if (_err) {
            return next(_err);
          }
          millis1 = Date.now() - start1;
          console.log("blockTimestamps: ",millis1/1000);
          return next(null, blockTimestamps);
        });
        // return next(null, "blockTimestamps");
      }],
      processData: ['blockTimestamps', (ret, next) => {
        this._processLogData(ret.logs, ret.blockTimestamps, next);
      }],
    }, callback);
  }
  //
  getBlockTimestamp (blockNumber, callback) {
    web3.eth.getBlock(blockNumber, (err, block) => {
    if (err) {
      return callback(err);
    }

    // logger.trace(`Requeried! Block ${blockNumber} time: ${block.timestamp}`);
      return callback(null, block.timestamp);
    });
  }
  //
  _processLogData (logs, blockTimestamps, callback) {
    start2 = Date.now();
    const records = {};
    _.each(logs, (log) => {
      const txid = log.transactionHash;
      if (!records[txid]) {
        records[txid] = {};
      }
      const timestamp = blockTimestamps[log.blockNumber];
      if (!timestamp) {
        return next(`Cannot get block info for log id=${log.id}, tx=${log.transactionHash}`);
      }
      const record = records[txid];
      record.blockNumber = log.blockNumber;
      record.blockHash = log.blockHash;
      record.blockTimestamp = timestamp;
      record.tx = log.transactionHash;
    });

    async.waterfall([
      (next) => {
        let count =0;
        async.eachLimit(_.values(records), PARALLEL_INSERT_LIMIT, (record, _next) => {
          count++;
          this._sync_reply_propose(count,record, _next);
        }, next);
      }
      // ,
      // (next) => {
      //   exSession.commit(next);
      // }
    ], (err, ret) => {
      // exSession.destroy();
      if (err) {
        return callback(err);
      }
      millis2 = Date.now() - start2;
      console.log("_processLogData: ",millis2/1000);

      millis = Date.now() - start;
      console.log("Sync done with Time: ",Math.floor(millis/1000), " - Log/time:",countLogs / Math.floor(millis/1000));
      return callback(null, true);
    });
  }

  //Test
  _sync_reply_propose (count,record, callback) {
    // console.log("_sync_reply_propose",count);
    client.hset(record.blockNumber, "blockNumber", record.blockNumber);
    client.hset(record.blockNumber, "blockTimestamp", record.blockTimestamp);
    callback(null,null);
  }

  //
  sync_new_propose(value) {
    client.select(global.gConfig.DB_PROPOSE_INDEX, function() { console.log("Select DB 0"); });
    let place = "{"+"name:"+value.place+", "+ "longitude:"+value.long+", "+"latitude:"+value.lat+"}";
    client.hset(value.index, "place", place, redis.print);
    client.hset(value.index, "tAddress", value.tAddress, redis.print);
    client.hset(value.index, "fImg", value.fImg, redis.print);
    client.hset(value.index, "fPropose", value.fPropose, redis.print);
    client.hset(value.index, "fAddress", value.fAddress, redis.print);
    let timestamp =  new Date().getTime();
    client.hset(value.index, "updatetime", timestamp, redis.print);
    client.hset(value.index, "createtime", timestamp, redis.print);
    console.log("sync_data");
  }

  //
  sync_reply_propose(value) {
    client.select(global.gConfig.DB_PROPOSE_INDEX, function() { console.log("Select DB 0"); });
    client.hset(value.index, "tImg", value.tImg, redis.print);
    client.hset(value.index, "tPropose", value.tPropose, redis.print);
    let timestamp =  new Date().getTime();
    client.hset(value.index, "updatetime", timestamp, redis.print);
    console.log("sync_data");
  }
  //
  sync_new_memory(value) {
    client.select(global.gConfig.DB_MEMORY_INDEX, function() { console.log("Select DB 1"); });
    client.hset(value.index, "proposeID", value.proposeID, redis.print);
    client.hset(value.index, "fAddress", value.fAddress, redis.print);
    client.hset(value.index, "comment", value.comment, redis.print);
    let place = "{"+"name:"+value.place+", "+ "longitude:"+value.long+", "+"latitude:"+value.lat+"}";
    client.hset(value.index, "place", place, redis.print);
    let timestamp =  new Date().getTime();
    client.hset(value.index, "createtime", timestamp, redis.print);
    console.log("sync_data");
  }
}

module.exports = SyncChainToRedis;
