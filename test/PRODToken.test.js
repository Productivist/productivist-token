import assertRevert from './helpers/assertRevert';
const PRODToken = artifacts.require('PRODToken');

contract('PRODToken Standard ERC20', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const TOKEN_DECIMAL = 6;
  const MAX_TOKEN_SUPPLY = 100000000 * 10 ** TOKEN_DECIMAL;

  beforeEach(async function () {
    this.token = await PRODToken.new(owner, { from: owner });
  });

  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      const totalSupply = await this.token.totalSupply();
      assert.equal(totalSupply, MAX_TOKEN_SUPPLY);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        const balance = await this.token.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        const balance = await this.token.balanceOf(owner);

        assert.equal(balance, MAX_TOKEN_SUPPLY);
      });
    });
  });

  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY + 1;

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
          assert.equal(recipientBalance, amount);
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

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(this.token.transfer(to, MAX_TOKEN_SUPPLY, { from: owner }));
      });
    });
  });

  describe('approve', function () {
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
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY + 1;

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
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async function () {
            await this.token.approve(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
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
        assert.equal(allowance, amount);
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
            assert.equal(recipientBalance, amount);
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
          const amount = MAX_TOKEN_SUPPLY + 1;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await this.token.approve(spender, MAX_TOKEN_SUPPLY - 1, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY;

          it('reverts', async function () {
            await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = MAX_TOKEN_SUPPLY + 1;

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
            await this.token.approve(spender, amount + 1, { from: owner });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY + 1;

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
            await this.token.approve(spender, amount + 1, { from: owner });
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
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount + 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = MAX_TOKEN_SUPPLY + 1;

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
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseApproval(spender, amount, { from: owner });

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount + 1);
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function () {
        await this.token.increaseApproval(spender, amount, { from: owner });

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, amount);
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
    const from = owner;

    describe('when the given amount is not greater than balance of the sender', function () {
      const amount = 100;

      it('burns the requested amount', async function () {
        await this.token.burn(amount, { from });

        const balance = await this.token.balanceOf(from);
        assert.equal(balance, MAX_TOKEN_SUPPLY - 100);
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
      const amount = MAX_TOKEN_SUPPLY + 1;

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
        assert.equal(recipientBalance, MAX_TOKEN_SUPPLY);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transfer(recipient, MAX_TOKEN_SUPPLY, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, MAX_TOKEN_SUPPLY);
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
        assert.equal(senderBalance, MAX_TOKEN_SUPPLY - 40);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, MAX_TOKEN_SUPPLY - 40);

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
