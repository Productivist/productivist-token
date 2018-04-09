require('dotenv').config();
var fs = require('fs');
var csv = require('fast-csv');
var BigNumber = require('bignumber.js');
const prodTokenArtifacts = require('../build/contracts/PRODToken.json');
const contract = require('truffle-contract');
let ProdToken = contract(prodTokenArtifacts);
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const tokenDecimals = 8;

function getWallet () {
  try {
    return require('fs').readFileSync('./mainwallet.json', 'utf8').trim();
  } catch (err) {
    return '';
  }
}

let walletProvider = new HDWalletProvider(getWallet(),
  process.env.PASSWALLET,
  'https://rinkeby.infura.io/' + process.env.INFURA_API_KEY
);

let web3 = new Web3(walletProvider);

//let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));

ProdToken.setProvider(web3.currentProvider);

let prodTokenAddress = process.argv.slice(2)[0];
let BATCH_SIZE = process.argv.slice(2)[1];
if (!BATCH_SIZE) BATCH_SIZE = 80;
let distribAddressData = [];
let distribAmountData = [];
let allocAddressData = [];
let allocAmountData = [];

async function setAllocation () {
  console.log(`
    --------------------------------------------
    ---------Performing allocations ------------
    --------------------------------------------
  `);

  let prodToken = await ProdToken.at(prodTokenAddress);

  for (var i = 0; i < distribAddressData.length; i++) {
    try {
      console.log('Attempting to allocate tokens to accounts:', distribAddressData[i], '\n\n');
      console.log('Amounts are :', distribAmountData[i], '\n\n');     
      let r = await prodToken.batch(distribAddressData[i], distribAmountData[i], { from: walletProvider.getAddress(), gas: 4500000, gasPrice: 2000000000 });
      console.log('---------- ---------- ---------- ----------');
      console.log('Allocation + transfer was successful.', r.receipt.gasUsed, 'gas used.');
      console.log('---------- ---------- ---------- ----------\n\n');
    } catch (err) {
      console.log('ERROR:', err);
    }
  }
}

function readFile () {
  var stream = fs.createReadStream('./scripts/allocations.csv');

  let index = 0;
 
  console.log(`
    --------------------------------------------
    --------- Parsing allocations.csv file ---------
    --------------------------------------------

    ******** Removing beneficiaries without tokens or address data
  `);

  var csvStream = csv()
    .on('data', function (data) {
      if (data[0] !== null && data[0] !== '' && data[1] !== null && data[1] !== '') {
        allocAddressData.push(data[0]);
        allocAmountData.push(new BigNumber(data[1] * 10 ** tokenDecimals));
        index++;
        if (index >= BATCH_SIZE) {
          distribAddressData.push(allocAddressData);
          distribAmountData.push(allocAmountData);
          allocAddressData = [];
          allocAmountData = [];
          index = 0;
        }
      }
    })
    .on('end', function () {
      // Add last remainder batch
      distribAddressData.push(allocAddressData);
      distribAmountData.push(allocAmountData);
      allocAddressData = [];
      allocAmountData = [];
      setAllocation();
    });

  stream.pipe(csvStream);
}

if (prodTokenAddress) {
  console.log('Processing PRODToken allocation. Batch size is', BATCH_SIZE, 'accounts per transaction');
  readFile();
} else {
  console.log('Please run the script by providing the address of the PRODToken contract');
}