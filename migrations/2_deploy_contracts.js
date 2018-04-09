var PRODToken = artifacts.require('PRODToken');

// NOTE: Use this file to easily deploy the contracts you're writing.
//   (but make sure to reset this file before committing
//    with `git checkout HEAD -- migrations/2_deploy_contracts.js`)

module.exports = function (deployer) {
  deployer.deploy(PRODToken, '0xa5b006cdd7cf51a053ff53f4cad6b0b90458a689');
};
