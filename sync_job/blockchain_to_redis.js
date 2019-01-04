const Web3 = require('web3');
// var config = require('config');
const redis = require('redis');
const client = redis.createClient();

// environment variables
// process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
// const config = require('./config/config.js');
const _ = require('lodash');
const config = require('../config/config.json');
const defaultConfig = config.default;
// const environment = process.env.NODE_ENV || 'development';
const environment = process.env.NODE_ENV || 'mainnet';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);

var web3;
var myContract;
var myContract2;

var app = {
  instances: {},
  templates: {},
  data: {
      shouts: {},
  },
  cache: {
      blockTime: {},
      usernames: {}
  }
}

module.exports = {
  start: function(callback){
    start(callback);
  }
}

function loadConfig(){
  global.gConfig = finalConfig;
  //console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);
  // console.log(global.gConfig);
}

function init() {
  //Handle event redis
  client.on('connect', function() {
    console.log('Redis client connected');
    
  });
  client.on('error', function(err){
    console.log('Something went wrong ', err)
  });

  //Connect infura
  // let web3Provider = new Web3.providers.HttpProvider(rpcUrl); 6e18781143be42728a3b451167953541
  console.log(global.gConfig.RPCURL);
  let web3Provider = new Web3.providers.WebsocketProvider(global.gConfig.RPCURL);
  web3 = new Web3(web3Provider);
  console.log("Web3 version",web3.version);
  // Connect to contract(bnb)
  myContract = new web3.eth.Contract(global.gConfig.ABI, global.gConfig.ADDRESS);
  // console.log(myContract);
  // let abi2 = [ { "constant": true, "inputs": [], "name": "userList", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "uint256" } ], "name": "lsComment", "outputs": [ { "name": "who", "type": "address" }, { "name": "what", "type": "string" }, { "name": "image", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" } ], "name": "mpLike", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "lovePropose", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "renounceOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "isOwner", "outputs": [ { "name": "", "type": "bool" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" } ], "name": "mpComment", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "uint256" } ], "name": "lsMemory", "outputs": [ { "name": "who", "type": "address" }, { "name": "what", "type": "string" }, { "name": "image", "type": "string" }, { "name": "place", "type": "bytes32" }, { "name": "longitude", "type": "uint256" }, { "name": "latitude", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" } ], "name": "mpProposeMemory", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [ { "name": "newOwner", "type": "address" } ], "name": "transferOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "emptyStr", "outputs": [ { "name": "", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [ { "name": "_userList", "type": "address" }, { "name": "_lovePropose", "type": "address" } ], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "index", "type": "uint256" }, { "indexed": false, "name": "proposeID", "type": "uint256" }, { "indexed": true, "name": "fAddress", "type": "address" }, { "indexed": false, "name": "comment", "type": "string" }, { "indexed": false, "name": "image", "type": "string" }, { "indexed": false, "name": "place", "type": "bytes32" }, { "indexed": false, "name": "long", "type": "uint256" }, { "indexed": false, "name": "lat", "type": "uint256" } ], "name": "NewMemory", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "fAddress", "type": "address" } ], "name": "NewLike", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "name": "index", "type": "uint256" }, { "indexed": true, "name": "fAddress", "type": "address" }, { "indexed": false, "name": "comment", "type": "string" }, { "indexed": false, "name": "image", "type": "string" } ], "name": "NewComment", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" } ], "name": "OwnershipTransferred", "type": "event" }, { "constant": false, "inputs": [ { "name": "_userList", "type": "address" }, { "name": "_lovePropose", "type": "address" } ], "name": "setUserList", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_index", "type": "uint256" }, { "name": "_content", "type": "string" }, { "name": "_image", "type": "string" }, { "name": "_place", "type": "bytes32" }, { "name": "_long", "type": "uint256" }, { "name": "_lat", "type": "uint256" } ], "name": "addMemory", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "_index", "type": "uint256" } ], "name": "getAllMemory", "outputs": [ { "name": "who", "type": "address[]" }, { "name": "what", "type": "string" }, { "name": "imageHash", "type": "string" }, { "name": "place", "type": "bytes32[]" }, { "name": "long", "type": "uint256[]" }, { "name": "lat", "type": "uint256[]" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [ { "name": "_index", "type": "uint256" } ], "name": "sentLike", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_index", "type": "uint256" }, { "name": "_comment", "type": "string" }, { "name": "_image", "type": "string" } ], "name": "addComment", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "_index", "type": "uint256" } ], "name": "getAllComment", "outputs": [ { "name": "who", "type": "address[]" }, { "name": "what", "type": "string" }, { "name": "imageHash", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function" } ];
  // let address2 = "0x71cac58bc3b66cd34131631f02144824d78a22c7";
  // myContract2 = new web3.eth.Contract(abi2, address2);
  //callback();
}
function start(callback) {
  loadConfig();
  init();
  watchEvent_Transfer();
  // //sync_data();
  // watchEvent_NewPropose();
  // watchEvent_ReplyPropose();
  // watchEvent_NewMemory();
  // callback("Doing..");
}
function getPastEvents(myContract,eventName,callback){
  var start = Date.now();
  myContract.getPastEvents(eventName, {
    //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
    fromBlock: global.gConfig.LATEST_PROCESSED_BLOCK,
    toBlock: global.gConfig.LATEST_PROCESSED_BLOCK + global.gConfig.BATCH_BLOCK_SIZE
  }, function(error, events){
    if(error){
      console.log("error:",error);
    }else{
      console.log("events:",events);
    }
    // console.log("events:",events.length);
    
    for(let i = 0; i < events.length; i++){
      callback(i,events[i].returnValues);
    }
    var millis = Date.now() - start;
    console.log("Time: ",Math.floor(millis/1000));
  })
  .then(function(events){
      //console.log(events) // same results as the optional callback above
  });

}

 async function watchEvent_Transfer(){
  const latest = await web3.eth.getBlockNumber();
  console.log(latest);
  getPastEvents(myContract,"Transfer",save_Transfer);
}
function save_Transfer(count,event){
  console.log(count,": ",event[0]);
}
function watchEvent_NewPropose(){
    //---
    getPastEvents(myContract,"NewPropose",sync_new_propose);
    //-----
    myContract.events.NewPropose({
      //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0
    }, function(error, event){ 
      //console.log("=",event.returnValues); 
      sync_new_propose(event.returnValues);
    })
    .on('data', function(event){
      // console.log(event); // same results as the optional callback above
    })
    .on('changed', function(event){
      // remove event from local database
    })
    .on('error', console.error);
    console.log("watchEvent");

}

function watchEvent_ReplyPropose(){
    //----
    getPastEvents(myContract,"ReplyPropose",sync_reply_propose);
    //----
    myContract.events.ReplyPropose({
      //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0
    }, function(error, event){ 
      //console.log("=",event.returnValues); 
      sync_reply_propose(event.returnValues);
    })
    .on('data', function(event){
      // console.log(event); // same results as the optional callback above
    })
    .on('changed', function(event){
      // remove event from local database
    })
    .on('error', console.error);

}
function watchEvent_NewMemory(){
    //----
    getPastEvents(myContract2,"NewMemory",sync_new_memory);
    myContract2.events.NewMemory({
      //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0
    }, function(error, event){ 
      //console.log("=",event.returnValues); 
      sync_new_memory(event.returnValues);
    })
    .on('data', function(event){
      // console.log(event); // same results as the optional callback above
    })
    .on('changed', function(event){
      // remove event from local database
    })
    .on('error', console.error);
}
function sync_new_propose(value) {
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
function sync_reply_propose(value) {
  client.select(global.gConfig.DB_PROPOSE_INDEX, function() { console.log("Select DB 0"); });
  client.hset(value.index, "tImg", value.tImg, redis.print);
  client.hset(value.index, "tPropose", value.tPropose, redis.print);
  let timestamp =  new Date().getTime();
  client.hset(value.index, "updatetime", timestamp, redis.print);
  console.log("sync_data");
}

function sync_new_memory(value) {
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