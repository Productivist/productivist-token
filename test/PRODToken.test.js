import assertRevert from './helpers/assertRevert';
import BigNumber from 'bignumber.js'
const PRODToken = artifacts.require('PRODToken');

contract('PRODToken', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const batchListAccount = [
    '0xf17f52151ebef6c7334fad080c5704d77216b732',
    '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
    '0x821aea9a577a9b44299b9c15c88cf3087f3b5544'
  ];
  
  const TOKEN_DECIMAL = 8;
  const MAX_TOKEN_SUPPLY = new BigNumber(385000000 * 10 ** TOKEN_DECIMAL);



  beforeEach(async function () {
    this.token = await PRODToken.new({ from: owner });
  });

  describe('mint', function () {  
    it('should start with the correct cap', async function () {
      let _cap = await this.token.cap();
      assert(MAX_TOKEN_SUPPLY.eq(_cap));
    });
    
    it('should fail to mint if not owner', async function () {
      await assertRevert(this.token.mint(owner, 100, { from: anotherAccount }));
    });

    describe('when the requested amount of token is less than cap', function () {
      it('should mint', async function () {
        const result = await this.token.mint(owner, 100, { from: owner });
        assert.equal(result.logs[0].event, 'Mint');
      });
    });

    describe('when the requested amount of token exceeds the cap', function () {
      it('should fail to mint and revert', async function () {
        await this.token.mint(owner, MAX_TOKEN_SUPPLY.minus(1), { from: owner });
        await assertRevert(this.token.mint(owner, 100, { from: owner }));
      });
    });

    describe('After the cap is reached', function () {
      it('should fail to mint and revert', async function () {
        await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
        await assertRevert(this.token.mint(owner, 1));
      });
    });
  });

  describe('finishMinting', function () {
    const PURCHASER_AMOUNT = new BigNumber(100000000 * 10 ** TOKEN_DECIMAL);
    const ONE_PER_THOUSAND = PURCHASER_AMOUNT.dividedToIntegerBy(617);
    it('should revert when finishMinting when wallets are not set', async function () {
      await this.token.mint(owner, PURCHASER_AMOUNT, { from: owner });
      await assertRevert(this.token.finishMinting({ from: owner }));
    });
    it('should allocate Foundation, Team and Bounty ', async function () {
      await this.token.mint(owner, PURCHASER_AMOUNT, { from: owner });
      await this.token.setWallets('0xBa893462c1b714bFD801e918a4541e056f9bd924', '0x2418C46F2FA422fE8Cd0BF56Df5e27CbDeBB2590', '0x84bE27E1d3AeD5e6CF40445891d3e2AB7d3d98e8',{ from: owner });
      await this.token.finishMinting({ from: owner });
      let bountyBalance = await this.token.balanceOf('0x84bE27E1d3AeD5e6CF40445891d3e2AB7d3d98e8');  
      assert(bountyBalance.eq(ONE_PER_THOUSAND.mul(50)));

      let foundationBalance = await this.token.balanceOf('0xBa893462c1b714bFD801e918a4541e056f9bd924');
      assert(foundationBalance.eq(ONE_PER_THOUSAND.mul(173)));

      let teamBalance = await this.token.balanceOf('0x2418C46F2FA422fE8Cd0BF56Df5e27CbDeBB2590');
      assert(teamBalance.eq(ONE_PER_THOUSAND.mul(160)));

      assert(teamBalance.plus(foundationBalance).plus(bountyBalance).plus(ONE_PER_THOUSAND.mul(617)).eq(ONE_PER_THOUSAND.mul(1000)));
    });
    it('should revert when minting after finishMinting ', async function () {
      await this.token.mint(owner, PURCHASER_AMOUNT, { from: owner });
      await this.token.setWallets('0xBa893462c1b714bFD801e918a4541e056f9bd924', '0x2418C46F2FA422fE8Cd0BF56Df5e27CbDeBB2590', '0x84bE27E1d3AeD5e6CF40445891d3e2AB7d3d98e8',{ from: owner });
      await this.token.finishMinting({ from: owner });
      await assertRevert(this.token.mint(owner, 1));
    });
  });

  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
      const totalSupply = await this.token.totalSupply();
      assert(MAX_TOKEN_SUPPLY.eq(totalSupply));
    });
  });

  describe('balanceOf', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        const balance = await this.token.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        const balance = await this.token.balanceOf(owner);

        assert(MAX_TOKEN_SUPPLY.eq(balance));
      });
    });
  });

  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      beforeEach(async function () {
        await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
      });

      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY.plus(1);

        it('reverts', async function () {	  
          await assertRevert(this.token.transfer(to, amount, { from: owner }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY;

        it('transfers the requested amount', async function () {
          await this.token.transfer(to, amount, { from: owner });

          const senderBalance = await this.token.balanceOf(owner);
          assert.equal(senderBalance, 0);

          const recipientBalance = await this.token.balanceOf(to);
          assert(amount.eq(recipientBalance));
        });

        it('emits a transfer event', async function () {
          const { logs } = await this.token.transfer(to, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Transfer');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });
  });

  describe('batchMint', async function () {

    describe('when the recipient is not the zero address', function () {

      describe('when max cap is exceeded', function () {
        const batchListAmount = [
          150000000 * 10 ** TOKEN_DECIMAL,
          150000000 * 10 ** TOKEN_DECIMAL,
          150000000 * 10 ** TOKEN_DECIMAL
        ];

        it('reverts', async function () {
          await assertRevert(this.token.batchMint(batchListAccount, batchListAmount, { from: owner }));
          const totalSupply = await this.token.totalSupply();
          assert.equal(totalSupply, 0);
        });
      });

      describe('when the max cap is not exceeded', function () {
        const batchListAmount = [
          100000000 * 10 ** TOKEN_DECIMAL,
          100000000 * 10 ** TOKEN_DECIMAL,
          185000000 * 10 ** TOKEN_DECIMAL
        ];

        it('mints the requested amount', async function () {
          
          await this.token.batchMint(batchListAccount, batchListAmount, { from: owner });

          const totalSupply = await this.token.totalSupply();
          assert(MAX_TOKEN_SUPPLY.eq(totalSupply));

          const recipientBalance1 = await this.token.balanceOf(batchListAccount[0]);
          assert.equal(recipientBalance1, batchListAmount[0]);

          const recipientBalance2 = await this.token.balanceOf(batchListAccount[1]);
          assert.equal(recipientBalance2, batchListAmount[1]);

          const recipientBalance3 = await this.token.balanceOf(batchListAccount[2]);
          assert.equal(recipientBalance3, batchListAmount[2]);          
        });

        it('emits the Mint and Transfer events', async function () {
          const { logs } = await this.token.batchMint(batchListAccount, batchListAmount, { from: owner });

          assert.equal(logs.length, 6);

          assert.equal(logs[0].event, 'Mint');
          assert.equal(logs[0].args.to, batchListAccount[0]);
          assert(logs[0].args.amount.eq(batchListAmount[0]));

          assert.equal(logs[1].event, 'Transfer');
          assert.equal(logs[1].args.to, batchListAccount[0]);
          assert(logs[1].args.value.eq(batchListAmount[0]));
        });
      });
    });

    describe('when one recipient is the zero address', function () {
      const batchListAmount = [25000000 * 10 ** TOKEN_DECIMAL, 25000000 * 10 ** TOKEN_DECIMAL, 50000000 * 10 ** TOKEN_DECIMAL];

      it('reverts', async function () {
        await assertRevert(this.token.batchMint([batchListAccount[0], ZERO_ADDRESS, batchListAccount[2]], batchListAmount, { from: owner }));
       	const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply, 0);
      });
    });

    describe('when 50 recipient ', function () {
            
      let batch50Account = [50];
      for (var i = 0; i < 50; i++) {
        let address = '0x2bdd21761a483f71054e14f5b827213567971c' + (i + 16).toString(16);
        batch50Account[i] = address;
      }
      let batchListAmount = [50];
      for (var i = 0; i < 50; i++) {        
        batchListAmount[i] = 100 * 10 ** TOKEN_DECIMAL;
      }

      it('should perform batch for 50 accounts that should have 100 PROD each', async function () {

        await this.token.batchMint(batch50Account, batchListAmount, { from: owner });
        for (var i = 0; i < batch50Account.length; i++) {
          const tokenBalance = await this.token.balanceOf(batch50Account[i]);          
          assert.equal(tokenBalance, 100 * 10 ** TOKEN_DECIMAL);
        }
      });
    });

    describe('when 100 recipient ', function () {
            
      let batch100Account = [100];
      for (var i = 0; i < 100; i++) {
        let address = '0x2bdd21761a483f71054e14f5b827213567971c' + (i + 16).toString(16);
        batch100Account[i] = address;
      }
      let batchListAmount = [100];
      for (var i = 0; i < 100; i++) {        
        batchListAmount[i] = 100 * 10 ** TOKEN_DECIMAL;
      }

      it('should perform batch for 100 accounts that should have 100 PROD each', async function () {

        await this.token.batchMint(batch100Account, batchListAmount, { from: owner });
        for (var i = 0; i < batch100Account.length; i++) {
          const tokenBalance = await this.token.balanceOf(batch100Account[i]);          
          assert.equal(tokenBalance, 100 * 10 ** TOKEN_DECIMAL);
        }
      });
    });
  });

  describe('approve', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY;

        it('emits an approval event', async function () {
          const { logs } = await this.token.approve(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY.plus(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.approve(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = MAX_TOKEN_SUPPLY;
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function () {
        await this.token.approve(spender, amount, { from: owner });

        const allowance = await this.token.allowance(owner, spender);
        assert(amount.eq(allowance));
      });

      it('emits an approval event', async function () {
        const { logs } = await this.token.approve(spender, amount, { from: owner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });

  describe('transfer from', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    const spender = recipient;

    describe('when the recipient is not the zero address', function () {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, MAX_TOKEN_SUPPLY, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY;

          it('transfers the requested amount', async function () {
            await this.token.transferFrom(owner, to, amount, { from: spender });

            const senderBalance = await this.token.balanceOf(owner);
            assert.equal(senderBalance, 0);

            const recipientBalance = await this.token.balanceOf(to);
            assert(amount.eq(recipientBalance));
          });

          it('decreases the spender allowance', async function () {
            await this.token.transferFrom(owner, to, amount, { from: spender });

            const allowance = await this.token.allowance(owner, spender);
            assert(allowance.eq(0));
          });

          it('emits a transfer event', async function () {
            const { logs } = await this.token.transferFrom(owner, to, amount, { from: spender });

            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Transfer');
            assert.equal(logs[0].args.from, owner);
            assert.equal(logs[0].args.to, to);
            assert(logs[0].args.value.eq(amount));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY.plus(1);

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, MAX_TOKEN_SUPPLY.minus(1), { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY.plus(1);

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const amount = MAX_TOKEN_SUPPLY;
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await this.token.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
      });
    });
  });

  describe('decrease approval', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY;

        it('emits an approval event', async function () {
          const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(0));
        });

        describe('when there was no approved amount before', function () {
          it('keeps the allowance to zero', async function () {
            await this.token.decreaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 0);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, amount.plus(1), { from: owner });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY.plus(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(0));
        });

        describe('when there was no approved amount before', function () {
          it('keeps the allowance to zero', async function () {
            await this.token.decreaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 0);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, amount.plus(1), { from: owner });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 1);
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = MAX_TOKEN_SUPPLY;
      const spender = ZERO_ADDRESS;

      it('decreases the requested amount', async function () {
        await this.token.decreaseApproval(spender, amount, { from: owner });

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, 0);
      });

      it('emits an approval event', async function () {
        const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(0));
      });
    });
  });

  describe('increase approval', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });
    const amount = MAX_TOKEN_SUPPLY;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.plus(1).eq(allowance));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY.plus(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.eq(allowance));
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert(amount.plus(1).eq(allowance));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function () {
        await this.token.increaseApproval(spender, amount, { from: owner });

        const allowance = await this.token.allowance(owner, spender);
        assert(amount.eq(allowance));
      });

      it('emits an approval event', async function () {
        const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });

  describe('burn', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    const from = owner;

    describe('when the given amount is not greater than balance of the sender', function () {
      const amount = 100;

      it('burns the requested amount', async function () {
        await this.token.burn(amount, { from });

        const balance = await this.token.balanceOf(from);
        assert(MAX_TOKEN_SUPPLY.minus(100).eq(balance));
      });

      it('emits a burn event', async function () {
        const { logs } = await this.token.burn(amount, { from });
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        assert.equal(logs.length, 2);
        assert.equal(logs[0].event, 'Burn');
        assert.equal(logs[0].args.burner, owner);
        assert.equal(logs[0].args.value, amount);

        assert.equal(logs[1].event, 'Transfer');
        assert.equal(logs[1].args.from, owner);
        assert.equal(logs[1].args.to, ZERO_ADDRESS);
        assert.equal(logs[1].args.value, amount);
      });
    });

    describe('when the given amount is greater than the balance of the sender', function () {
      const amount = MAX_TOKEN_SUPPLY.plus(1);

      it('reverts', async function () {
        await assertRevert(this.token.burn(amount, { from }));
      });
    });
  });
  describe('pause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is unpaused', function () {
        it('pauses the token', async function () {
          await this.token.pause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, true);
        });

        it('emits a paused event', async function () {
          const { logs } = await this.token.pause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Pause');
        });
      });

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('reverts', async function () {
          await assertRevert(this.token.pause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.pause({ from }));
      });
    });
  });

  describe('unpause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('unpauses the token', async function () {
          await this.token.unpause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, false);
        });

        it('emits an unpaused event', async function () {
          const { logs } = await this.token.unpause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Unpause');
        });
      });

      describe('when the token is unpaused', function () {
        it('reverts', async function () {
          await assertRevert(this.token.unpause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.unpause({ from }));
      });
    });
  });

  describe('pausable token', function () {
    beforeEach(async function () {
      await this.token.mint(owner, MAX_TOKEN_SUPPLY, { from: owner });
    });

    const from = owner;

    describe('paused', function () {
      it('is not paused by default', async function () {
        const paused = await this.token.paused({ from });

        assert.equal(paused, false);
      });

      it('is paused after being paused', async function () {
        await this.token.pause({ from });
        const paused = await this.token.paused({ from });

        assert.equal(paused, true);
      });

      it('is not paused after being paused and then unpaused', async function () {
        await this.token.pause({ from });
        await this.token.unpause({ from });
        const paused = await this.token.paused();

        assert.equal(paused, false);
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unpaused', async function () {
        await this.token.transfer(recipient, MAX_TOKEN_SUPPLY, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert(MAX_TOKEN_SUPPLY.eq(recipientBalance));
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transfer(recipient, MAX_TOKEN_SUPPLY, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert(MAX_TOKEN_SUPPLY.eq(recipientBalance));
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transfer(recipient, MAX_TOKEN_SUPPLY, { from: owner }));
      });
    });

    describe('approve', function () {
      it('allows to approve when unpaused', async function () {
        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.approve(anotherAccount, 40, { from: owner }));
      });
    });

    describe('transfer from', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 50, { from: owner });
      });

      it('allows to transfer from when unpaused', async function () {
        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert(MAX_TOKEN_SUPPLY.minus(40).eq(senderBalance));

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert(MAX_TOKEN_SUPPLY.minus(40).eq(senderBalance));

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('reverts when trying to transfer from when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transferFrom(owner, recipient, 40, { from: anotherAccount }));
      });
    });

    describe('decrease approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to decrease approval when unpaused', async function () {
        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('allows to decrease approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.decreaseApproval(anotherAccount, 40, { from: owner }));
      });
    });

    describe('increase approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to increase approval when unpaused', async function () {
        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('allows to increase approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('reverts when trying to increase approval when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.increaseApproval(anotherAccount, 40, { from: owner }));
      });
    });
  });
});
