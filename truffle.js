require('dotenv').config();
require('babel-register');
require('babel-polyfill');

const HDWalletProvider = require('truffle-hdwallet-provider');

function getWallet () {
  try {
    return require('fs').readFileSync('./mainwallet.json', 'utf8').trim();
  } catch (err) {
    return '';
  }
}

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 9545,
      network_id: '*', // eslint-disable-line camelcase
    },
    rinkeby: {
      provider: new HDWalletProvider(getWallet(), process.env.PASSWALLET, 'https://rinkeby.infura.io/'+process.env.INFURA_API_KEY),
      gas: 4700000,
      network_id: 4,
    },
    testrpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    }
  },
  migrations_directory: './migrations'
};
